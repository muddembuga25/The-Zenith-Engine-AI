
import { supabase, supabaseRead } from './supabaseClient';
import { fetchAndParseRssFeed } from './rssService';
import { fetchSheetData } from './googleSheetService';
import { cmsQueue, mediaQueue, emailQueue, monitoringQueue } from '../backend/queues';
import connection from '../backend/redis';
import type { Site, RssItem, RecurringSchedule, SubscriptionPlan } from '../types';

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
 * Calculates the next run timestamp based on current time and settings.
 * Supports Daily and Scheduled triggers.
 */
const calculateNextRun = (site: Site, trigger: 'daily' | 'schedule', dailyTime: string, schedules: RecurringSchedule[], forceFuture: boolean = false): number => {
    const now = new Date();
    const tz = site.automationTimezone || 'UTC';
    
    // Helper to get today's date string in site's timezone
    const getZonedDateString = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
    }

    if (trigger === 'daily') {
        const [targetHour, targetMinute] = dailyTime.split(':').map(Number);
        
        const zonedNowStr = new Date().toLocaleString('en-US', { timeZone: tz });
        const zonedNow = new Date(zonedNowStr);
        
        const targetDate = new Date(zonedNow);
        targetDate.setHours(targetHour, targetMinute, 0, 0);
        
        let diff = targetDate.getTime() - zonedNow.getTime();
        
        if (diff <= 0 || forceFuture) {
            diff += 24 * 60 * 60 * 1000;
        }
        
        return Date.now() + diff;
    }
    
    return Date.now() + 24 * 60 * 60 * 1000; 
};

// --- Source Finding Logic ---
type SourceProvider = 'keyword' | 'rss' | 'video' | 'google_sheet' | 'newly_published_post' | 'agency_agent';

async function findNextSourceItem(site: Site, sourceProvider: SourceProvider): Promise<any> {
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
                    } else { 
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
                return { type: 'agency_agent', topic: nextPost.topic, value: nextPost.topic, agentPostId: nextPost.id };
            }
            return null;
        }
        case 'newly_published_post': {
            const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
            const recentPost = site.history
                .filter(h => ['Keyword', 'RSS', 'Video', 'Google Sheet'].includes(h.type) && h.date > oneDayAgo)
                .sort((a,b) => b.date - a.date)[0];
            if (recentPost) return { type: 'newly_published_post', topic: recentPost.topic, value: recentPost };
            return null;
        }
        default: return null;
    }
}

// --- Priority Helper ---
const getPriorityForPlan = (plan: SubscriptionPlan | string | undefined): number => {
    switch (plan) {
        case 'agency': return 1; // Highest priority
        case 'pro': return 2;
        case 'creator': return 5;
        default: return 10; // Free / Lowest priority
    }
};

/**
 * Main scheduler loop. 
 * Optimized Phase 4: Uses Read Replica for polling.
 * Phase 5: Implements Priority Queues based on user plan.
 * Phase 6: Distributed Locking via Redis for scalability.
 */
export const runScheduler = async () => {
    // Distributed Lock
    const lockKey = 'scheduler:lock';
    // Acquire lock for 55 seconds (scheduler runs every 60s)
    const acquired = await connection.set(lockKey, 'locked', 'PX', 55000, 'NX');
    
    if (!acquired) {
        console.log('[SCHEDULER] Skipping run, lock held by another instance.');
        return;
    }

    console.log(`[SCHEDULER] Running optimized poll at ${new Date().toISOString()}`);
    
    // Fetch sites that have automation enabled using the READ client
    const { data: sites, error } = await supabaseRead
        .from('sites')
        .select('*')
        .or('data->isAutomationEnabled.eq.true,data->isSocialGraphicAutomationEnabled.eq.true,data->isSocialVideoAutomationEnabled.eq.true,data->isEmailMarketingAutomationEnabled.eq.true,data->liveBroadcastAutomation->isEnabled.eq.true');

    if (error) {
        console.error("Scheduler Poll Error:", error);
        return;
    }

    if (!sites || sites.length === 0) return;

    const now = Date.now();

    // Process the candidate sites
    for (const row of sites) {
        const site = row.data as Site;
        const userId = row.owner_id;
        
        // Fetch user plan for priority handling (Phase 5)
        let priority = 10;
        try {
            const { data: profile } = await supabaseRead
                .from('profiles')
                .select('subscription_plan')
                .eq('id', userId)
                .single();
            priority = getPriorityForPlan(profile?.subscription_plan);
        } catch (e) {
            // Priority fetch failed, default to low priority
        }
        
        const queueOpts = { priority };

        // --- 1. Blog Automation ---
        if (site.isAutomationEnabled) {
            const effectiveNextRun = site.nextBlogAutoRun || 0;
            
            if (effectiveNextRun <= now) {
                const shouldRun = effectiveNextRun > 0 || (site.automationTrigger === 'daily' && !site.lastAutoPilotRun);
                
                if (shouldRun) {
                    const sourceProvider = site.automationTrigger === 'daily' ? site.dailyGenerationSource : site.scheduleGenerationSource;
                    const sourceResult = await findNextSourceItem(site, sourceProvider);
                    
                    if (sourceResult) {
                        console.log(`[SCHEDULER] Queueing Blog Automation for ${site.name} (Priority: ${priority})`);
                        
                        const nextRun = calculateNextRun(site, site.automationTrigger, site.automationDailyTime, site.recurringSchedules, true);
                        
                        const { error: updateError } = await supabase.from('sites').update({ 
                            data: { ...site, nextBlogAutoRun: nextRun }, 
                            updated_at: new Date().toISOString() 
                        }).eq('id', site.id);

                        if (!updateError) {
                            await cmsQueue.add('blog-post', { 
                                userId: userId, 
                                siteId: site.id, 
                                sourceResult 
                            }, queueOpts);
                        }
                    } else {
                        const nextRetry = now + 60 * 60 * 1000;
                        await supabase.from('sites').update({ 
                            data: { ...site, nextBlogAutoRun: nextRetry }, 
                            updated_at: new Date().toISOString() 
                        }).eq('id', site.id);
                    }
                } else if (effectiveNextRun === 0) {
                     const nextRun = calculateNextRun(site, site.automationTrigger, site.automationDailyTime, site.recurringSchedules);
                     await supabase.from('sites').update({ 
                        data: { ...site, nextBlogAutoRun: nextRun }, 
                        updated_at: new Date().toISOString() 
                    }).eq('id', site.id);
                }
            }
        }

        // --- 2. Social Graphic Automation ---
        if (site.isSocialGraphicAutomationEnabled) {
            const effectiveNextRun = site.nextSocialGraphicAutoRun || 0;
            if (effectiveNextRun <= now) {
                const sourceResult = await findNextSourceItem(site, site.socialGraphicGenerationSource);
                if (sourceResult) {
                    console.log(`[SCHEDULER] Queueing Social Graphic for ${site.name} (Priority: ${priority})`);
                    
                    const nextRun = calculateNextRun(site, site.socialGraphicAutomationTrigger, site.socialGraphicDailyTime, site.socialGraphicRecurringSchedules, true);
                    
                    const { error: updateError } = await supabase.from('sites').update({ 
                        data: { ...site, nextSocialGraphicAutoRun: nextRun }, 
                        updated_at: new Date().toISOString() 
                    }).eq('id', site.id);

                    if (!updateError) {
                        await mediaQueue.add('social-graphic', { 
                            userId: userId, 
                            siteId: site.id, 
                            sourceResult 
                        }, queueOpts);
                    }
                } else {
                    const nextRetry = now + 60 * 60 * 1000;
                    await supabase.from('sites').update({ 
                        data: { ...site, nextSocialGraphicAutoRun: nextRetry }, 
                        updated_at: new Date().toISOString() 
                    }).eq('id', site.id);
                }
            }
        }

        // --- 3. Social Video Automation ---
        if (site.isSocialVideoAutomationEnabled) {
            const effectiveNextRun = site.nextSocialVideoAutoRun || 0;
            if (effectiveNextRun <= now) {
                const sourceResult = await findNextSourceItem(site, site.socialVideoGenerationSource);
                if (sourceResult) {
                    console.log(`[SCHEDULER] Queueing Social Video for ${site.name} (Priority: ${priority})`);
                    
                    const nextRun = calculateNextRun(site, site.socialVideoAutomationTrigger, site.socialVideoDailyTime, site.socialVideoRecurringSchedules, true);
                    
                    const { error: updateError } = await supabase.from('sites').update({ 
                        data: { ...site, nextSocialVideoAutoRun: nextRun }, 
                        updated_at: new Date().toISOString() 
                    }).eq('id', site.id);

                    if (!updateError) {
                        await mediaQueue.add('social-video', { 
                            userId: userId, 
                            siteId: site.id, 
                            sourceResult 
                        }, queueOpts);
                    }
                } else {
                    const nextRetry = now + 60 * 60 * 1000;
                    await supabase.from('sites').update({ 
                        data: { ...site, nextSocialVideoAutoRun: nextRetry }, 
                        updated_at: new Date().toISOString() 
                    }).eq('id', site.id);
                }
            }
        }

        // --- 4. Email Automation ---
        if (site.isEmailMarketingAutomationEnabled) {
            const effectiveNextRun = site.nextEmailAutoRun || 0;
            if (effectiveNextRun <= now) {
                const sourceResult = await findNextSourceItem(site, site.emailMarketingGenerationSource);
                if (sourceResult) {
                    console.log(`[SCHEDULER] Queueing Email Campaign for ${site.name} (Priority: ${priority})`);
                    
                    const nextRun = calculateNextRun(site, site.emailMarketingAutomationTrigger, site.emailMarketingDailyTime, site.emailMarketingRecurringSchedules, true);
                    
                    const { error: updateError } = await supabase.from('sites').update({ 
                        data: { ...site, nextEmailAutoRun: nextRun }, 
                        updated_at: new Date().toISOString() 
                    }).eq('id', site.id);

                    if (!updateError) {
                        await emailQueue.add('email-campaign', { 
                            userId: userId, 
                            siteId: site.id, 
                            sourceResult 
                        }, queueOpts);
                    }
                } else {
                    const nextRetry = now + 60 * 60 * 1000;
                    await supabase.from('sites').update({ 
                        data: { ...site, nextEmailAutoRun: nextRetry }, 
                        updated_at: new Date().toISOString() 
                    }).eq('id', site.id);
                }
            }
        }

        // --- 5. Live Broadcast Check ---
        if (site.liveBroadcastAutomation?.isEnabled) {
            const auto = site.liveBroadcastAutomation;
            const effectiveNextRun = auto.nextLiveMonitorRun || 0;
            
            if (effectiveNextRun <= now) {
                const dayFormatter = new Intl.DateTimeFormat('en-US', { timeZone: site.automationTimezone, weekday: 'long' });
                const localDay = dayFormatter.format(new Date());
                const dayIndex = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(localDay);

                if (dayIndex === auto.broadcastDay) {
                    console.log(`[SCHEDULER] Queueing Live Broadcast Check for ${site.name} (Priority: ${priority})`);
                    
                    const nextRun = now + 60 * 60 * 1000;
                    const updatedAuto = { ...auto, nextLiveMonitorRun: nextRun };
                    
                    const { error: updateError } = await supabase.from('sites').update({ 
                        data: { ...site, liveBroadcastAutomation: updatedAuto }, 
                        updated_at: new Date().toISOString() 
                    }).eq('id', site.id);

                    if (!updateError) {
                        await monitoringQueue.add('live-broadcast-monitor', { userId: userId, siteId: site.id }, queueOpts);
                    }
                } else {
                    const nextRun = now + 6 * 60 * 60 * 1000;
                    const updatedAuto = { ...auto, nextLiveMonitorRun: nextRun };
                    await supabase.from('sites').update({ 
                        data: { ...site, liveBroadcastAutomation: updatedAuto }, 
                        updated_at: new Date().toISOString() 
                    }).eq('id', site.id);
                }
            }
        }
    }
};
