
import { Worker } from 'bullmq';
import * as dotenv from 'dotenv';
import connection from './redis';
import { storageService } from '../services/storageService';
import { 
    processBlogAutomation, 
    processSocialGraphicAutomation, 
    processSocialVideoAutomation, 
    processEmailAutomation, 
    processLiveBroadcastAutomation 
} from '../services/jobProcessor';
import * as authService from '../services/authService';

dotenv.config();

console.log("🚀 Zenith Engine AI Worker Service Starting...");

// --- Concurrency Settings ---
const cmsConcurrency = parseInt(process.env.CMS_CONCURRENCY || '5', 10);
const mediaConcurrency = parseInt(process.env.MEDIA_CONCURRENCY || '1', 10); // Low default for heavy media gen
const emailConcurrency = parseInt(process.env.EMAIL_CONCURRENCY || '10', 10);
const monitorConcurrency = parseInt(process.env.MONITOR_CONCURRENCY || '5', 10);

// --- Rate Limit Settings (QoS) ---
// Default: 50 text jobs/min, 10 media jobs/min, 20 emails/min, 30 monitors/min
const cmsLimitMax = parseInt(process.env.CMS_LIMIT_MAX || '50', 10);
const mediaLimitMax = parseInt(process.env.MEDIA_LIMIT_MAX || '10', 10);
const emailLimitMax = parseInt(process.env.EMAIL_LIMIT_MAX || '20', 10);
const monitorLimitMax = parseInt(process.env.MONITOR_LIMIT_MAX || '30', 10);
const limitDuration = parseInt(process.env.LIMIT_DURATION || '60000', 10); // Default 1 minute

console.log(`[Config] Concurrency: CMS=${cmsConcurrency}, Media=${mediaConcurrency}, Email=${emailConcurrency}, Monitor=${monitorConcurrency}`);
console.log(`[Config] Rate Limits (per ${limitDuration}ms): CMS=${cmsLimitMax}, Media=${mediaLimitMax}, Email=${emailLimitMax}, Monitor=${monitorLimitMax}`);

// Helper to hydrate user/site context
const getContext = async (userId: string, siteId: string) => {
    const allUsers = await authService.getAllUsers();
    const user = allUsers.find(u => u.uid === userId);
    
    if (!user) throw new Error(`User ${userId} not found`);
    
    const sites = await storageService.getSites(userId);
    const site = sites?.find(s => s.id === siteId);
    
    if (!site) throw new Error(`Site ${siteId} not found`);
    
    return { user, site };
};

// --- CMS Worker ---
const cmsWorker = new Worker('cms-queue', async (job) => {
    console.log(`[CMS Worker] Processing job ${job.id}: ${job.name} (Priority: ${job.opts.priority})`);
    const { userId, siteId, sourceResult, scheduleId } = job.data;
    const { user, site } = await getContext(userId, siteId);
    
    if (job.name === 'blog-post') {
        await processBlogAutomation(job.id || 'unknown', user, site, sourceResult, scheduleId);
    }
}, { 
    connection,
    concurrency: cmsConcurrency,
    limiter: {
        max: cmsLimitMax,
        duration: limitDuration
    }
});

// --- Media Worker ---
const mediaWorker = new Worker('media-queue', async (job) => {
    console.log(`[Media Worker] Processing job ${job.id}: ${job.name} (Priority: ${job.opts.priority})`);
    const { userId, siteId, sourceResult, scheduleId } = job.data;
    const { user, site } = await getContext(userId, siteId);

    if (job.name === 'social-graphic') {
        await processSocialGraphicAutomation(job.id || 'unknown', user, site, sourceResult, scheduleId);
    } else if (job.name === 'social-video') {
        await processSocialVideoAutomation(job.id || 'unknown', user, site, sourceResult, scheduleId);
    }
}, { 
    connection,
    concurrency: mediaConcurrency,
    limiter: {
        max: mediaLimitMax,
        duration: limitDuration
    }
});

// --- Email Worker ---
const emailWorker = new Worker('email-queue', async (job) => {
    console.log(`[Email Worker] Processing job ${job.id}: ${job.name} (Priority: ${job.opts.priority})`);
    const { userId, siteId, sourceResult, scheduleId } = job.data;
    const { user, site } = await getContext(userId, siteId);

    if (job.name === 'email-campaign') {
        await processEmailAutomation(job.id || 'unknown', user, site, sourceResult, scheduleId);
    }
}, { 
    connection,
    concurrency: emailConcurrency,
    limiter: {
        max: emailLimitMax,
        duration: limitDuration
    }
});

// --- Monitoring Worker ---
const monitoringWorker = new Worker('monitoring-queue', async (job) => {
    console.log(`[Monitor Worker] Processing job ${job.id}: ${job.name} (Priority: ${job.opts.priority})`);
    const { userId, siteId } = job.data;
    const { user, site } = await getContext(userId, siteId);

    if (job.name === 'live-broadcast-monitor') {
        await processLiveBroadcastAutomation(job.id || 'unknown', user, site);
    }
}, { 
    connection,
    concurrency: monitorConcurrency,
    limiter: {
        max: monitorLimitMax,
        duration: limitDuration
    }
});

// Error handlers
const workers = [cmsWorker, mediaWorker, emailWorker, monitoringWorker];
workers.forEach(w => {
    w.on('completed', job => console.log(`${w.name} job ${job.id} completed.`));
    w.on('failed', (job, err) => console.error(`${w.name} job ${job?.id} failed:`, err));
});

console.log("✅ Workers listening for jobs with Rate Limiting enabled.");
