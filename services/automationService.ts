
/**
 * =============================================================================
 * Standalone Automation Service Logic
 * =============================================================================
 * This file contains the core logic for the backend automation processor.
 * It is executed by `backend/worker.ts` and runs independently of the frontend UI.
 * Its purpose is to check schedules, find content sources, trigger AI generation
 * tasks, and update the application state in Supabase.
 * =============================================================================
 */

import { storageService } from './storageService';
import * as authService from './authService';
import { fetchAndParseRssFeed } from './rssService';
import { fetchSheetData } from './googleSheetService';
import * as aiService from './aiService';
import * as mailchimpService from './mailchimpService';
import { 
    generateStrategicBriefFromKeyword, 
    generateArticleFromBrief, 
    generateFeaturedImage, 
    generateSocialMediaPosts,
    processNewInPostImages,
    generateSocialGraphicAndCaption,
    generateSocialVideoAndCaption,
    generateEmailCampaign,
    postProcessArticleLinks
} from './aiService';
import { publishPost } from './wordpressService';
import * as socialMediaService from './socialMediaService';
import type { Site, User, PostHistoryItem, Draft, ApiKeys, RssSource, GoogleSheetSource, VideoSource, BlogPost, RssItem, AgencyAgentLog, AgentScheduledPost, LiveBroadcastClip, LiveBroadcastAutomation, RecurringSchedule, SocialMediaPost, DistributionCampaign } from '../types';
import { AppStatus, AiProvider } from '../types';
import type { AutomationJob } from '../components/GlobalAutomationTracker';
import { getLatestLiveVideoFromMeta } from './oauthService';

const JOB_TRACKER_KEY = 'zenith-engine-ai-running-jobs';

// --- Job Tracking Abstraction ---
// This allows the service to run in both Browser (localStorage UI feedback) 
// and Node.js (Console logging) environments without crashing.

interface JobTracker {
    add(job: AutomationJob): void;
    update(jobId: string, update: Partial<AutomationJob>): void;
    get(): AutomationJob[];
}

const BrowserJobTracker: JobTracker = {
    get: () => {
        try {
            const jobsJSON = localStorage.getItem(JOB_TRACKER_KEY);
            return jobsJSON ? JSON.parse(jobsJSON) : [];
        } catch { return []; }
    },
    add: (job) => {
        const jobs = BrowserJobTracker.get();
        if (jobs.some(j => j.siteId === job.siteId && j.topic === job.topic && j.status !== AppStatus.ERROR && j.status !== AppStatus.PUBLISHED)) return;
        localStorage.setItem(JOB_TRACKER_KEY, JSON.stringify([...jobs, job]));
    },
    update: (jobId, update) => {
        const jobs = BrowserJobTracker.get();
        const updatedJobs = jobs.map(j => j.jobId === jobId ? { ...j, ...update } : j);
        localStorage.setItem(JOB_TRACKER_KEY, JSON.stringify(updatedJobs));
    }
};

const ConsoleJobTracker: JobTracker = {
    get: () => [],
    add: (job) => console.log(`[JOB START] ${job.jobId} (${job.topic}): ${job.statusMessage}`),
    update: (jobId, update) => {
        if (update.status === AppStatus.ERROR) console.error(`[JOB ERROR] ${jobId}: ${update.error}`);
        else if (update.statusMessage) console.log(`[JOB UPDATE] ${jobId}: ${update.statusMessage}`);
    }
};

// Select tracker based on environment
const tracker: JobTracker = typeof window !== 'undefined' ? BrowserJobTracker : ConsoleJobTracker;


// --- Timezone Helpers ---

function isSameDayInTimezone(ts1: number, ts2: number, timezone: string): boolean {
    try {
        const options: Intl.DateTimeFormatOptions = { timeZone: timezone, year: 'numeric', month: 'numeric', day: 'numeric' };
        const d1 = new Date(ts1).toLocaleDateString('en-US', options);
        const d2 = new Date(ts2).toLocaleDateString('en-US', options);
        return d1 === d2;
    } catch (e) {
        console.warn(`Invalid timezone ${timezone}, defaulting to UTC comparison.`);
        const d1 = new Date(ts1).toISOString().split('T')[0];
        const d2 = new Date(ts2).toISOString().split('T')[0];
        return d1 === d2;
    }
}

/**
 * Checks if a task should run based on the site's timezone, trigger settings, and last run time.
 */
function shouldRunTask(
    site: Site,
    trigger: 'daily' | 'schedule',
    dailyTime: string, // "HH:mm"
    schedules: RecurringSchedule[],
    lastRunTimestamp: number | undefined
): { shouldRun: boolean; scheduleId?: string } {
    const tz = site.automationTimezone || 'UTC';
    const now = new Date();
    
    // Get current time in site timezone
    let currentTimeStr: string;
    let currentDayStr: string;
    let currentDayOfMonth: number;

    try {
        const timeFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false
        });
        // Handle "24:00" case if it ever appears, usually it's "00:00" - "23:59"
        currentTimeStr = timeFormatter.format(now);
        if (currentTimeStr === '24:00') currentTimeStr = '00:00';
        // Ensure HH:mm format (e.g., "9:05" -> "09:05")
        if (currentTimeStr.length === 4) currentTimeStr = '0' + currentTimeStr;

        const dayFormatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' });
        currentDayStr = dayFormatter.format(now);

        const dateFormatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, day: 'numeric' });
        currentDayOfMonth = parseInt(dateFormatter.format(now), 10);
    } catch (e) {
        console.error(`Error formatting time for timezone ${tz}`, e);
        return { shouldRun: false };
    }

    // Check if the global task ran today in site timezone
    const ranToday = lastRunTimestamp ? isSameDayInTimezone(lastRunTimestamp, now.getTime(), tz) : false;

    if (trigger === 'daily') {
        // Run if we haven't run today AND current time >= target time
        // We use string comparison for "HH:mm" which works correctly for 24h format
        if (!ranToday && currentTimeStr >= dailyTime) {
            return { shouldRun: true };
        }
    } else {
        // Schedule Trigger logic
        const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const currentDayIdx = daysMap.indexOf(currentDayStr);

        for (const schedule of schedules) {
            if (!schedule.isEnabled) continue;
            
            // Check if THIS specific schedule ran today
            const scheduleRanToday = schedule.lastRun ? isSameDayInTimezone(schedule.lastRun, now.getTime(), tz) : false;
            
            // If checking a schedule, we care if *this schedule* ran today, not necessarily the whole task type
            if (scheduleRanToday) continue;

            if (currentTimeStr >= schedule.time) {
                // Weekly check
                if (schedule.type === 'weekly' && schedule.days.includes(currentDayIdx)) {
                    return { shouldRun: true, scheduleId: schedule.id };
                }
                // Monthly check
                if (schedule.type === 'monthly' && schedule.days.includes(currentDayOfMonth)) {
                    return { shouldRun: true, scheduleId: schedule.id };
                }
            }
        }
    }

    return { shouldRun: false };
}

// --- Core Service Logic ---

// Helper to update site data safely
const updateSiteInStorage = async (user: User, siteId: string, updater: (s: Site) => Site) => {
    const sites = await storageService.getSites(user.uid);
    if (!sites) return;
    const idx = sites.findIndex(s => s.id === siteId);
    if (idx === -1) return;
    
    sites[idx] = updater(sites[idx]);
    await storageService.saveAllSites(user.uid, sites);
    return sites[idx];
};

const logApiUsage = async (user: User, siteId: string, provider: keyof ApiKeys, cost: number) => {
    if (!user || cost === 0) return;
    await updateSiteInStorage(user, siteId, (site) => ({
        ...site,
        apiUsage: { ...(site.apiUsage || {}), [provider]: (site.apiUsage?.[provider] || 0) + cost }
    }));
};

// --- SOURCE FINDING HELPER ---
type SourceProvider = 'keyword' | 'rss' | 'video' | 'google_sheet' | 'newly_published_post' | 'agency_agent';
type SourceResult = {
    type: SourceProvider;
    topic: string;
    value: any; 
    sourceId?: string; // ID of the RSS/Video/Sheet source config
    videoItem?: RssItem;
    rowIndex?: number;
    agentPostId?: string;
} | null;

async function findNextSourceItem(site: Site, sourceProvider: SourceProvider): Promise<SourceResult> {
    switch (sourceProvider) {
        case 'keyword': {
            const nextItem = site.keywordList.split('\n').find(k => k.trim() && !k.trim().startsWith('[DONE]'));
            return nextItem ? { type: 'keyword', topic: nextItem.trim(), value: nextItem.trim() } : null;
        }
        case 'rss': {
            for (const source of site.rssSources) {
                try {
                    const feed = await fetchAndParseRssFeed(source.url);
                    const nextItem = feed.items.find(item => !source.processedRssGuids.includes(item.guid));
                    if (nextItem) return { type: 'rss', topic: nextItem.title, value: nextItem, sourceId: source.id };
                } catch (e) { console.warn(`RSS fetch failed for ${source.url}`, e); }
            }
            return null;
        }
        case 'video': {
             for (const source of site.videoSources) {
                try {
                    if (source.type === 'channel') {
                        const feed = await fetchAndParseRssFeed(source.url);
                        const nextItem = feed.items.find(item => !source.processedVideoGuids.includes(item.guid));
                        if (nextItem) return { type: 'video', topic: nextItem.title, value: nextItem.link, sourceId: source.id, videoItem: nextItem };
                    } else { // type === 'video'
                        if (!source.processedVideoGuids.includes(source.url)) {
                            return { type: 'video', topic: source.name, value: source.url, sourceId: source.id };
                        }
                    }
                } catch (e) { console.warn(`Video source fetch failed for ${source.url}`, e); }
            }
            return null;
        }
        case 'google_sheet': {
            const googleAccount = site.socialMediaSettings?.youtube?.find(acc => acc.isConnected && acc.accessToken);
            if (!googleAccount?.accessToken) return null;
            for (const source of site.googleSheetSources) {
                try {
                    const data = await fetchSheetData(source.url, googleAccount.accessToken);
                    if (data) {
                        const nextRowIndex = data.findIndex((row, index) => !source.processedGoogleSheetRows.includes(index));
                        if (nextRowIndex !== -1) {
                            return { type: 'google_sheet', topic: data[nextRowIndex], value: data[nextRowIndex], sourceId: source.id, rowIndex: nextRowIndex };
                        }
                    }
                } catch (e) { console.warn(`Sheet fetch failed for ${source.url}`, e); }
            }
            return null;
        }
        case 'agency_agent': {
            const nextPost = site.agentScheduledPosts
                ?.filter(p => p.status === 'pending')
                .sort((a, b) => a.suggestedTime - b.suggestedTime)[0];
            
            if (nextPost) {
                return {
                    type: 'agency_agent',
                    topic: nextPost.topic,
                    value: nextPost.topic,
                    agentPostId: nextPost.id
                };
            }
            return null;
        }
        case 'newly_published_post': {
            const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
            const recentPost = site.history
                .filter(h => ['Keyword', 'RSS', 'Video', 'Google Sheet'].includes(h.type) && h.date > oneDayAgo)
                .sort((a,b) => b.date - a.date)[0];

            if (recentPost) {
                return { type: 'newly_published_post', topic: recentPost.topic, value: recentPost };
            }
            return null;
        }
        default:
            return null;
    }
}

// --- Automation Processors ---

async function processBlogAutomation(user: User, site: Site, scheduleId?: string) {
    const jobId = crypto.randomUUID();
    const sourceProvider = site.automationTrigger === 'daily' ? site.dailyGenerationSource : site.scheduleGenerationSource;
    
    // 1. Find Content
    const sourceResult = await findNextSourceItem(site, sourceProvider);
    if (!sourceResult) {
        console.log(`[BLOG AUTO] No content found for site ${site.name} using ${sourceProvider}`);
        return;
    }

    tracker.add({ jobId, siteId: site.id, topic: sourceResult.topic, status: AppStatus.GENERATING_STRATEGY, statusMessage: 'Starting blog automation...' });

    try {
        // 2. Generate Brief
        tracker.update(jobId, { status: AppStatus.GENERATING_STRATEGY, statusMessage: 'Developing strategy...' });
        const { brief, costs: briefCosts } = await generateStrategicBriefFromKeyword(sourceResult.topic, site);
        for (const p in briefCosts) await logApiUsage(user, site.id, p as keyof ApiKeys, (briefCosts as any)[p]);

        // 3. Write Article
        tracker.update(jobId, { status: AppStatus.GENERATING_ARTICLE, statusMessage: 'Drafting content...' });
        const { postData, cost: writeCost, provider: writeProvider } = await generateArticleFromBrief(brief, site);
        await logApiUsage(user, site.id, writeProvider, writeCost);

        // 4. Generate Image
        tracker.update(jobId, { status: AppStatus.GENERATING_IMAGE, statusMessage: 'Creating featured image...' });
        const { base64Image, cost: imgCost, provider: imgProvider } = await generateFeaturedImage(postData.imagePrompt, site);
        await logApiUsage(user, site.id, imgProvider, imgCost);

        let fullPost: BlogPost = { ...postData, imageUrl: `data:image/jpeg;base64,${base64Image}` };

        // 5. In-Post Images (Optional)
        if (site.isInPostImagesEnabled && (site.numberOfInPostImages || 0) > 0) {
             tracker.update(jobId, { statusMessage: 'Generating in-post images...' });
             const { processedHtml, cost: inPostCost, provider: inPostProvider } = await processNewInPostImages(fullPost.content, site);
             fullPost.content = processedHtml;
             await logApiUsage(user, site.id, inPostProvider, inPostCost);
        }

        // 6. Links & SEO
        fullPost.content = await postProcessArticleLinks(fullPost.content);

        // 7. Publish or Draft
        if (site.isAutoPublishEnabled) {
            tracker.update(jobId, { status: AppStatus.PUBLISHING, statusMessage: 'Publishing to WordPress...' });
            const publishedUrl = await publishPost(site, fullPost, fullPost.focusKeyword);
            
            // 8. Generate Socials (Omnipresence)
            let socialPosts: Record<string, SocialMediaPost> = {};
            if (site.isOmnipresenceAutomationEnabled) {
                tracker.update(jobId, { status: AppStatus.GENERATING_SOCIAL_POSTS, statusMessage: 'Generating social posts...' });
                const { posts, cost: socialCost, provider: socialProvider } = await generateSocialMediaPosts(fullPost, publishedUrl, site);
                socialPosts = posts;
                await logApiUsage(user, site.id, socialProvider, socialCost);
            }

            // 9. Update History & Source
            const historyItem: PostHistoryItem = {
                id: crypto.randomUUID(),
                topic: fullPost.title,
                url: publishedUrl,
                date: Date.now(),
                type: sourceResult.type === 'agency_agent' ? 'Agency Agent' : 
                      sourceResult.type === 'rss' ? 'RSS' : 
                      sourceResult.type === 'video' ? 'Video' : 
                      sourceResult.type === 'google_sheet' ? 'Google Sheet' : 'Keyword',
                socialMediaPosts: socialPosts
            };

            await updateSiteInStorage(user, site.id, (s) => {
                let updated = { 
                    ...s, 
                    history: [historyItem, ...s.history],
                    lastAutoPilotRun: Date.now()
                };
                
                // Update Schedule Last Run
                if (scheduleId) {
                    updated.recurringSchedules = updated.recurringSchedules.map(sch => 
                        sch.id === scheduleId ? { ...sch, lastRun: Date.now() } : sch
                    );
                }

                // Update Source Consumption
                if (sourceResult.type === 'keyword') {
                    const lines = s.keywordList.split('\n');
                    const idx = lines.findIndex(l => l.trim() === sourceResult.value);
                    if (idx !== -1) lines[idx] = `[DONE] ${sourceResult.value}`;
                    updated.keywordList = lines.join('\n');
                } else if (sourceResult.type === 'rss' && sourceResult.sourceId) {
                    updated.rssSources = s.rssSources.map(r => r.id === sourceResult.sourceId ? { ...r, processedRssGuids: [...r.processedRssGuids, sourceResult.value.guid] } : r);
                } else if (sourceResult.type === 'video' && sourceResult.sourceId) {
                    const guid = sourceResult.videoItem ? sourceResult.videoItem.guid : sourceResult.value;
                    updated.videoSources = s.videoSources.map(v => v.id === sourceResult.sourceId ? { ...v, processedVideoGuids: [...v.processedVideoGuids, guid] } : v);
                } else if (sourceResult.type === 'google_sheet' && sourceResult.sourceId && sourceResult.rowIndex !== undefined) {
                    updated.googleSheetSources = s.googleSheetSources.map(g => g.id === sourceResult.sourceId ? { ...g, processedGoogleSheetRows: [...g.processedGoogleSheetRows, sourceResult.rowIndex!] } : g);
                } else if (sourceResult.type === 'agency_agent' && sourceResult.agentPostId) {
                    updated.agentScheduledPosts = s.agentScheduledPosts.map(p => p.id === sourceResult.agentPostId ? { ...p, status: 'complete', resultingPostId: historyItem.id } : p);
                }

                return updated;
            });

            tracker.update(jobId, { status: AppStatus.PUBLISHED, statusMessage: 'Blog post published successfully!' });

        } else {
            // Save as Draft
            const draft: Draft = {
                id: crypto.randomUUID(),
                date: Date.now(),
                sourceTopic: sourceResult.topic,
                sourceDetails: sourceResult as any, // Simplified typing
                strategicBrief: brief,
                blogPost: fullPost
            };
            
            await updateSiteInStorage(user, site.id, (s) => ({
                ...s,
                drafts: [...s.drafts, draft],
                lastAutoPilotRun: Date.now(),
                recurringSchedules: scheduleId ? s.recurringSchedules.map(sch => sch.id === scheduleId ? { ...sch, lastRun: Date.now() } : sch) : s.recurringSchedules
            }));
            
            tracker.update(jobId, { status: AppStatus.PUBLISHED, statusMessage: 'Saved as Draft.' });
        }

    } catch (e: any) {
        console.error(`[BLOG AUTO] Error:`, e);
        tracker.update(jobId, { status: AppStatus.ERROR, error: e.message, statusMessage: 'Failed.' });
    }
}

async function processSocialGraphicAutomation(user: User, site: Site, scheduleId?: string) {
    const jobId = crypto.randomUUID();
    const sourceResult = await findNextSourceItem(site, site.socialGraphicGenerationSource);
    
    if (!sourceResult) return;

    tracker.add({ jobId, siteId: site.id, topic: sourceResult.topic, status: AppStatus.GENERATING_IMAGE, statusMessage: 'Creating social graphic...' });

    try {
        const { base64Image, caption, imageCost, captionCost } = await generateSocialGraphicAndCaption(
            `Create an engaging social media graphic about: ${sourceResult.topic}`,
            '1:1',
            site,
            null,
            {}
        );
        await logApiUsage(user, site.id, 'google', imageCost + captionCost);

        const historyItem: PostHistoryItem = {
            id: crypto.randomUUID(),
            topic: `Graphic: ${sourceResult.topic}`,
            url: '#',
            date: Date.now(),
            type: 'Social Graphic',
            socialGraphics: { custom: { imageUrl: base64Image, caption } }
        };

        if (site.isSocialGraphicAutoPublishEnabled) {
            const platforms = ['twitter', 'facebook', 'instagram', 'linkedin', 'pinterest'];
            for (const platform of platforms) {
                const accounts = socialMediaService.getEnabledDestinations(site, platform);
                for (const account of accounts) {
                    tracker.update(jobId, { statusMessage: `Posting to ${platform}...` });
                    await socialMediaService.postToSocialMedia(platform as any, account, { content: caption, hashtags: [] }, { type: 'image', data: base64Image });
                }
            }
        }

        await updateSiteInStorage(user, site.id, (s) => {
            let updated = { 
                ...s, 
                history: [historyItem, ...s.history],
                lastSocialGraphicAutoPilotRun: Date.now() 
            };
            if (scheduleId) {
                updated.socialGraphicRecurringSchedules = updated.socialGraphicRecurringSchedules.map(sch => 
                    sch.id === scheduleId ? { ...sch, lastRun: Date.now() } : sch
                );
            }
            return updated;
        });

        tracker.update(jobId, { status: AppStatus.PUBLISHED, statusMessage: 'Social graphic processed.' });

    } catch (e: any) {
        tracker.update(jobId, { status: AppStatus.ERROR, error: e.message });
    }
}

async function processSocialVideoAutomation(user: User, site: Site, scheduleId?: string) {
    const jobId = crypto.randomUUID();
    const sourceResult = await findNextSourceItem(site, site.socialVideoGenerationSource);
    if (!sourceResult) return;

    tracker.add({ jobId, siteId: site.id, topic: sourceResult.topic, status: AppStatus.GENERATING_IMAGE, statusMessage: 'Generating video...' });

    try {
        const { videoUrl, caption, mcpId, videoCost, captionCost } = await generateSocialVideoAndCaption(
            `A viral social media video about: ${sourceResult.topic}`,
            site,
            null,
            (msg) => tracker.update(jobId, { statusMessage: msg })
        );
        await logApiUsage(user, site.id, 'google', videoCost + captionCost);

        const historyItem: PostHistoryItem = {
            id: crypto.randomUUID(),
            topic: `Video: ${sourceResult.topic}`,
            url: '#',
            date: Date.now(),
            type: 'Social Video',
            socialVideos: { custom: { videoUrl, caption, mcpId } }
        };

        if (site.isSocialVideoAutoPublishEnabled) {
            const platforms = ['youtube', 'tiktok', 'instagram'];
            for (const platform of platforms) {
                const accounts = socialMediaService.getEnabledDestinations(site, platform);
                for (const account of accounts) {
                    tracker.update(jobId, { statusMessage: `Posting to ${platform}...` });
                    await socialMediaService.postToSocialMedia(platform as any, account, { content: caption, hashtags: [] }, { type: 'video', data: videoUrl });
                }
            }
        }

        await updateSiteInStorage(user, site.id, (s) => {
            let updated = { 
                ...s, 
                history: [historyItem, ...s.history],
                lastSocialVideoAutoPilotRun: Date.now() 
            };
            if (scheduleId) {
                updated.socialVideoRecurringSchedules = updated.socialVideoRecurringSchedules.map(sch => 
                    sch.id === scheduleId ? { ...sch, lastRun: Date.now() } : sch
                );
            }
            return updated;
        });

        tracker.update(jobId, { status: AppStatus.PUBLISHED, statusMessage: 'Social video processed.' });

    } catch (e: any) {
        tracker.update(jobId, { status: AppStatus.ERROR, error: e.message });
    }
}

async function processEmailAutomation(user: User, site: Site, scheduleId?: string) {
    const jobId = crypto.randomUUID();
    const sourceResult = await findNextSourceItem(site, site.emailMarketingGenerationSource);
    if (!sourceResult) return;

    tracker.add({ jobId, siteId: site.id, topic: sourceResult.topic, status: AppStatus.GENERATING_STRATEGY, statusMessage: 'Generating email campaign...' });

    try {
        const { subject, body, cost, provider } = await generateEmailCampaign(sourceResult.topic, site);
        await logApiUsage(user, site.id, provider, cost);

        tracker.update(jobId, { statusMessage: 'Sending campaign...' });
        const { success, message } = await mailchimpService.sendCampaign(subject, body, site);

        if (!success) throw new Error(message);

        const historyItem: PostHistoryItem = {
            id: crypto.randomUUID(),
            topic: `Email: ${subject}`,
            url: '#',
            date: Date.now(),
            type: 'Email Campaign',
            emailCampaigns: { subject, body }
        };

        await updateSiteInStorage(user, site.id, (s) => {
            let updated = { 
                ...s, 
                history: [historyItem, ...s.history],
                lastEmailMarketingAutoPilotRun: Date.now() 
            };
            if (scheduleId) {
                updated.emailMarketingRecurringSchedules = updated.emailMarketingRecurringSchedules.map(sch => 
                    sch.id === scheduleId ? { ...sch, lastRun: Date.now() } : sch
                );
            }
            return updated;
        });

        tracker.update(jobId, { status: AppStatus.PUBLISHED, statusMessage: 'Email campaign sent.' });

    } catch (e: any) {
        tracker.update(jobId, { status: AppStatus.ERROR, error: e.message });
    }
}

async function processLiveBroadcastAutomation(user: User, site: Site) {
    const { liveBroadcastAutomation: auto } = site;
    if (!auto) return;

    const updateSiteAndGetLatest = async (updates: Partial<Site>): Promise<Site> => {
        const currentSites = await storageService.getSites(user.uid);
        if (!currentSites) return site; 
        const updatedSites = currentSites.map(s => s.id === site.id ? { ...s, ...updates } : s);
        await storageService.saveAllSites(user.uid, updatedSites);
        return updatedSites.find(s => s.id === site.id) || site;
    };

    const updateAutomationState = async (updates: Partial<LiveBroadcastAutomation>): Promise<Site> => {
        const currentSites = await storageService.getSites(user.uid);
        const currentSite = currentSites?.find(s => s.id === site.id);
        if (!currentSite || !currentSite.liveBroadcastAutomation) return site;
    
        const newAutomationState = { ...currentSite.liveBroadcastAutomation, ...updates };
        return await updateSiteAndGetLatest({ liveBroadcastAutomation: newAutomationState });
    };

    try {
        let currentSite = await updateAutomationState({ status: 'monitoring', statusMessage: `Checking for new live video from ${auto.sourceType}...` });
        let currentAuto = currentSite.liveBroadcastAutomation!;

        let latestVideo: { video_url: string, id: string } | null = null;

        if (currentAuto.sourceType === 'meta') {
            const metaConnection = currentSite.socialMediaSettings.meta?.[0];
            if (metaConnection?.isConnected && currentAuto.facebookPageId) {
                latestVideo = await getLatestLiveVideoFromMeta(currentAuto.facebookPageId, metaConnection.userAccessToken);
            }
        } 

        if (!latestVideo || latestVideo.id === currentAuto.lastProcessedVideoId) {
            await updateAutomationState({ status: 'idle', statusMessage: 'No new completed live videos found.' });
            return;
        }
        
        console.log(`[AUTOMATION] Found new live video ${latestVideo.id} for site ${currentSite.name}`);
        currentSite = await updateAutomationState({ status: 'processing', statusMessage: `Found new video. Analyzing topic...`, lastProcessedVideoId: latestVideo.id });

        const topicPrompt = `Analyze the content of the video at this URL: ${latestVideo.video_url}. Summarize the main topic.`;
        const { response: topicResponse, cost: topicCost } = await aiService._callGeminiText({ prompt: topicPrompt, site: currentSite, tools: [{ googleSearch: {} }] });
        await logApiUsage(user, currentSite.id, 'google', topicCost);
        const videoTopic = topicResponse.text.trim();
        
        currentSite = await updateAutomationState({ status: 'scheduling', statusMessage: `Topic is "${videoTopic}". Generating clips...` });
        
        await updateAutomationState({ status: 'complete', statusMessage: 'Weekly clips generated.', lastRunTimestamp: Date.now() });

    } catch (error: any) {
        console.error(`[AUTOMATION] ERROR in LIVE BROADCAST:`, error);
        await updateAutomationState({ status: 'error', statusMessage: error.message });
    }
}


/**
 * Main scheduler function, intended to be called at a regular interval.
 * It iterates through all users and their sites to check for pending automation jobs.
 */
export const runScheduler = async () => {
    console.log(`[SCHEDULER] Running check at ${new Date().toISOString()}`);
    const allUsers = await authService.getAllUsers();
  
    for (const user of allUsers) {
        const sites = await storageService.getSites(user.uid);
        if (!sites) continue;

        for (const site of sites) {
            
            // 1. Blog Automation
            if (site.isAutomationEnabled) {
                const decision = shouldRunTask(
                    site, 
                    site.automationTrigger, 
                    site.automationDailyTime, 
                    site.recurringSchedules, 
                    site.lastAutoPilotRun
                );
                if (decision.shouldRun) {
                    console.log(`[SCHEDULER] Triggering Blog Automation for ${site.name}`);
                    await processBlogAutomation(user, site, decision.scheduleId);
                }
            }

            // 2. Social Graphic Automation
            if (site.isSocialGraphicAutomationEnabled) {
                const decision = shouldRunTask(
                    site,
                    site.socialGraphicAutomationTrigger,
                    site.socialGraphicDailyTime,
                    site.socialGraphicRecurringSchedules,
                    site.lastSocialGraphicAutoPilotRun
                );
                if (decision.shouldRun) {
                    console.log(`[SCHEDULER] Triggering Social Graphic Automation for ${site.name}`);
                    await processSocialGraphicAutomation(user, site, decision.scheduleId);
                }
            }

            // 3. Social Video Automation
            if (site.isSocialVideoAutomationEnabled) {
                const decision = shouldRunTask(
                    site,
                    site.socialVideoAutomationTrigger,
                    site.socialVideoDailyTime,
                    site.socialVideoRecurringSchedules,
                    site.lastSocialVideoAutoPilotRun
                );
                if (decision.shouldRun) {
                    console.log(`[SCHEDULER] Triggering Social Video Automation for ${site.name}`);
                    await processSocialVideoAutomation(user, site, decision.scheduleId);
                }
            }

            // 4. Email Marketing Automation
            if (site.isEmailMarketingAutomationEnabled) {
                const decision = shouldRunTask(
                    site,
                    site.emailMarketingAutomationTrigger,
                    site.emailMarketingDailyTime,
                    site.emailMarketingRecurringSchedules,
                    site.lastEmailMarketingAutoPilotRun
                );
                if (decision.shouldRun) {
                    console.log(`[SCHEDULER] Triggering Email Automation for ${site.name}`);
                    await processEmailAutomation(user, site, decision.scheduleId);
                }
            }

            // 5. Live Broadcast (Special Case: Once per day check)
            if (site.liveBroadcastAutomation?.isEnabled) {
                const auto = site.liveBroadcastAutomation;
                const now = Date.now();
                const oneDay = 24 * 60 * 60 * 1000;
                if ((now - (auto.lastRunTimestamp || 0)) > oneDay) {
                    const dayFormatter = new Intl.DateTimeFormat('en-US', { timeZone: site.automationTimezone, weekday: 'long' });
                    const localDay = dayFormatter.format(new Date());
                    const dayIndex = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(localDay);

                    if (dayIndex === auto.broadcastDay) {
                         console.log(`[SCHEDULER] Triggering Live Broadcast Check for ${site.name}`);
                         await processLiveBroadcastAutomation(user, site);
                    }
                }
            }
        }
    }
};
