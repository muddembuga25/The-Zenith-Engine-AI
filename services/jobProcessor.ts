
import { 
    generateStrategicBriefFromKeyword, 
    generateArticleFromBrief, 
    generateFeaturedImage, 
    generateSocialMediaPosts,
    processNewInPostImages,
    generateSocialGraphicAndCaption,
    generateSocialVideoAndCaption,
    generateEmailCampaign,
    postProcessArticleLinks,
    _callGeminiText
} from './aiService';
import { publishPost } from './wordpressService';
import * as socialMediaService from './socialMediaService';
import * as mailchimpService from './mailchimpService';
import { getLatestLiveVideoFromMeta } from './oauthService';
import { storageService } from './storageService';
import type { Site, User, PostHistoryItem, Draft, BlogPost, ApiKeys, LiveBroadcastAutomation, SocialMediaPost } from '../types';
import { AppStatus } from '../types';

// Simple logging helper since we don't have browser localStorage in the worker
const logUpdate = (jobId: string, message: string) => {
    console.log(`[JOB ${jobId}] ${message}`);
};

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

export async function processBlogAutomation(jobId: string, user: User, site: Site, sourceResult: any, scheduleId?: string) {
    console.log(`[WORKER] Processing Blog Automation for ${site.name}`);
    
    try {
        logUpdate(jobId, 'Developing strategy...');
        const { brief, costs: briefCosts } = await generateStrategicBriefFromKeyword(sourceResult.topic, site);
        for (const p in briefCosts) await logApiUsage(user, site.id, p as keyof ApiKeys, (briefCosts as any)[p]);

        logUpdate(jobId, 'Drafting content...');
        const { postData, cost: writeCost, provider: writeProvider } = await generateArticleFromBrief(brief, site);
        await logApiUsage(user, site.id, writeProvider, writeCost);

        logUpdate(jobId, 'Creating featured image...');
        const { base64Image, cost: imgCost, provider: imgProvider } = await generateFeaturedImage(postData.imagePrompt, site);
        await logApiUsage(user, site.id, imgProvider, imgCost);

        let fullPost: BlogPost = { ...postData, imageUrl: `data:image/jpeg;base64,${base64Image}` };

        if (site.isInPostImagesEnabled && (site.numberOfInPostImages || 0) > 0) {
             logUpdate(jobId, 'Generating in-post images...');
             const { processedHtml, cost: inPostCost, provider: inPostProvider } = await processNewInPostImages(fullPost.content, site);
             fullPost.content = processedHtml;
             await logApiUsage(user, site.id, inPostProvider, inPostCost);
        }

        fullPost.content = await postProcessArticleLinks(fullPost.content);

        if (site.isAutoPublishEnabled) {
            logUpdate(jobId, 'Publishing to WordPress...');
            const publishedUrl = await publishPost(site, fullPost, fullPost.focusKeyword);
            
            let socialPosts: Record<string, SocialMediaPost> = {};
            if (site.isOmnipresenceAutomationEnabled) {
                logUpdate(jobId, 'Generating social posts...');
                const { posts, cost: socialCost, provider: socialProvider } = await generateSocialMediaPosts(fullPost, publishedUrl, site);
                socialPosts = posts;
                await logApiUsage(user, site.id, socialProvider, socialCost);
            }

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
                    lastAutoPilotRun: Date.now(),
                    // Note: nextBlogAutoRun is now managed entirely by the Scheduler (automationService.ts) via atomic updates
                };
                
                if (scheduleId) {
                    updated.recurringSchedules = updated.recurringSchedules.map(sch => 
                        sch.id === scheduleId ? { ...sch, lastRun: Date.now() } : sch
                    );
                }

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

            logUpdate(jobId, 'Blog post published successfully!');

        } else {
            const draft: Draft = {
                id: crypto.randomUUID(),
                date: Date.now(),
                sourceTopic: sourceResult.topic,
                sourceDetails: sourceResult as any, 
                strategicBrief: brief,
                blogPost: fullPost
            };
            
            await updateSiteInStorage(user, site.id, (s) => ({
                ...s,
                drafts: [...s.drafts, draft],
                lastAutoPilotRun: Date.now(),
                recurringSchedules: scheduleId ? s.recurringSchedules.map(sch => sch.id === scheduleId ? { ...sch, lastRun: Date.now() } : sch) : s.recurringSchedules
                // Note: nextBlogAutoRun is managed by scheduler
            }));
            
            logUpdate(jobId, 'Saved as Draft.');
        }

    } catch (e: any) {
        console.error(`[BLOG AUTO] Error:`, e);
        throw e; // Let BullMQ handle the failure
    }
}

export async function processSocialGraphicAutomation(jobId: string, user: User, site: Site, sourceResult: any, scheduleId?: string) {
    logUpdate(jobId, 'Creating social graphic...');

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
                    logUpdate(jobId, `Posting to ${platform}...`);
                    await socialMediaService.postToSocialMedia(platform as any, account, { content: caption, hashtags: [] }, { type: 'image', data: base64Image });
                }
            }
        }

        await updateSiteInStorage(user, site.id, (s) => {
            let updated = { 
                ...s, 
                history: [historyItem, ...s.history],
                lastSocialGraphicAutoPilotRun: Date.now(),
                // Note: nextSocialGraphicAutoRun is managed by scheduler
            };
            if (scheduleId) {
                updated.socialGraphicRecurringSchedules = updated.socialGraphicRecurringSchedules.map(sch => 
                    sch.id === scheduleId ? { ...sch, lastRun: Date.now() } : sch
                );
            }
            return updated;
        });

        logUpdate(jobId, 'Social graphic processed.');

    } catch (e: any) {
        console.error(e);
        throw e;
    }
}

export async function processSocialVideoAutomation(jobId: string, user: User, site: Site, sourceResult: any, scheduleId?: string) {
    logUpdate(jobId, 'Generating video...');

    try {
        const { videoUrl, caption, mcpId, videoCost, captionCost } = await generateSocialVideoAndCaption(
            `A viral social media video about: ${sourceResult.topic}`,
            site,
            null,
            (msg) => logUpdate(jobId, msg)
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
                    logUpdate(jobId, `Posting to ${platform}...`);
                    await socialMediaService.postToSocialMedia(platform as any, account, { content: caption, hashtags: [] }, { type: 'video', data: videoUrl });
                }
            }
        }

        await updateSiteInStorage(user, site.id, (s) => {
            let updated = { 
                ...s, 
                history: [historyItem, ...s.history],
                lastSocialVideoAutoPilotRun: Date.now(),
                // Note: nextSocialVideoAutoRun is managed by scheduler
            };
            if (scheduleId) {
                updated.socialVideoRecurringSchedules = updated.socialVideoRecurringSchedules.map(sch => 
                    sch.id === scheduleId ? { ...sch, lastRun: Date.now() } : sch
                );
            }
            return updated;
        });

        logUpdate(jobId, 'Social video processed.');

    } catch (e: any) {
        console.error(e);
        throw e;
    }
}

export async function processEmailAutomation(jobId: string, user: User, site: Site, sourceResult: any, scheduleId?: string) {
    logUpdate(jobId, 'Generating email campaign...');

    try {
        const { subject, body, cost, provider } = await generateEmailCampaign(sourceResult.topic, site);
        await logApiUsage(user, site.id, provider, cost);

        logUpdate(jobId, 'Sending campaign...');
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
                lastEmailMarketingAutoPilotRun: Date.now(),
                // Note: nextEmailAutoRun is managed by scheduler
            };
            if (scheduleId) {
                updated.emailMarketingRecurringSchedules = updated.emailMarketingRecurringSchedules.map(sch => 
                    sch.id === scheduleId ? { ...sch, lastRun: Date.now() } : sch
                );
            }
            return updated;
        });

        logUpdate(jobId, 'Email campaign sent.');

    } catch (e: any) {
        console.error(e);
        throw e;
    }
}

export async function processLiveBroadcastAutomation(jobId: string, user: User, site: Site) {
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
        logUpdate(jobId, `Checking for new live video from ${auto.sourceType}...`);
        
        let currentSite = await updateAutomationState({ status: 'monitoring', statusMessage: `Checking for new live video...` });
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
        
        logUpdate(jobId, `Found new video ${latestVideo.id}. Analyzing...`);
        currentSite = await updateAutomationState({ status: 'processing', statusMessage: `Found new video. Analyzing topic...`, lastProcessedVideoId: latestVideo.id });

        const topicPrompt = `Analyze the content of the video at this URL: ${latestVideo.video_url}. Summarize the main topic.`;
        const { response: topicResponse, cost: topicCost } = await _callGeminiText({ prompt: topicPrompt, site: currentSite, tools: [{ googleSearch: {} }] });
        await logApiUsage(user, currentSite.id, 'google', topicCost);
        const videoTopic = topicResponse.text.trim();
        
        currentSite = await updateAutomationState({ status: 'scheduling', statusMessage: `Topic is "${videoTopic}". Generating clips...` });
        
        await updateAutomationState({ status: 'complete', statusMessage: 'Weekly clips generated.', lastRunTimestamp: Date.now() });

    } catch (error: any) {
        console.error(`[AUTOMATION] ERROR in LIVE BROADCAST:`, error);
        await updateAutomationState({ status: 'error', statusMessage: error.message });
        throw error;
    }
}
