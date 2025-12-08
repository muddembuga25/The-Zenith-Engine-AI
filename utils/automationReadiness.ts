
import type { Site } from '../types';
import * as socialMediaService from '../services/socialMediaService';

export const checkAutomationReadiness = (site: Site): { blog: boolean; socialGraphic: boolean; socialVideo: boolean; email: boolean; liveProduction: boolean; } => {
    if (!site) {
        return { blog: false, socialGraphic: false, socialVideo: false, email: false, liveProduction: false };
    }

    // Helper to check if a valid source is configured and available
    const hasSource = (sourceType: string): boolean => {
        switch (sourceType) {
            case 'keyword':
                return (site.keywordList || '').split('\n').some(k => k.trim() && !k.trim().startsWith('[DONE]'));
            case 'rss':
                return (site.rssSources || []).length > 0;
            case 'video':
                return (site.videoSources || []).length > 0;
            case 'google_sheet':
                const googleAccountConnected = site.socialMediaSettings?.youtube?.some(acc => acc.isConnected);
                return (site.googleSheetSources || []).length > 0 && !!googleAccountConnected;
            case 'agency_agent':
                return (site.agentScheduledPosts || []).some(p => p.status === 'pending');
            case 'newly_published_post':
                return site.history.length > 0; // At least one post must exist
            default:
                return false;
        }
    };
    
    const isWpConnected = !!(site.wordpressUrl && site.wordpressUsername && site.applicationPassword);
    
    // Blog readiness
    const blogSource = site.automationTrigger === 'daily' ? site.dailyGenerationSource : site.scheduleGenerationSource;
    const blogReady = site.isAutomationEnabled && isWpConnected && hasSource(blogSource);

    // Social Graphics readiness
    const socialGraphicSource = site.socialGraphicGenerationSource;
    const hasGraphicDestinations = socialMediaService.getEnabledDestinations(site, 'twitter').length > 0 ||
                                   socialMediaService.getEnabledDestinations(site, 'facebook').length > 0 ||
                                   socialMediaService.getEnabledDestinations(site, 'instagram').length > 0 ||
                                   socialMediaService.getEnabledDestinations(site, 'pinterest').length > 0;
    const socialGraphicReady = site.isSocialGraphicAutomationEnabled && hasGraphicDestinations && hasSource(socialGraphicSource);

    // Social Video readiness
    const socialVideoSource = site.socialVideoGenerationSource;
    const hasVideoDestinations = socialMediaService.getEnabledDestinations(site, 'youtube').length > 0 ||
                                 socialMediaService.getEnabledDestinations(site, 'tiktok').length > 0 ||
                                 socialMediaService.getEnabledDestinations(site, 'instagram').length > 0;
    const socialVideoReady = site.isSocialVideoAutomationEnabled && hasVideoDestinations && hasSource(socialVideoSource);

    // Email readiness
    const emailSource = site.emailMarketingGenerationSource;
    const isMailchimpConnected = site.mailchimpSettings?.isConnected && !!site.mailchimpSettings.defaultListId;
    const emailReady = site.isEmailMarketingAutomationEnabled && isMailchimpConnected && hasSource(emailSource);
    
    // Live Production readiness
    let liveProductionReady = false;
    if (site.liveBroadcastAutomation?.isEnabled) {
        const auto = site.liveBroadcastAutomation;
        const hasLiveSource = 
            (auto.sourceType === 'meta' && !!auto.facebookPageId && site.socialMediaSettings?.meta?.[0]?.isConnected) ||
            (auto.sourceType === 'facebook_url' && !!auto.facebookPageUrl) ||
            (auto.sourceType === 'youtube' && ( (auto.youtubeSourceMethod === 'account' && !!auto.youtubeAccountId && (site.socialMediaSettings?.youtube || []).some(a => a.id === auto.youtubeAccountId && a.isConnected)) || (auto.youtubeSourceMethod !== 'account' && !!auto.youtubeChannelUrl) )) ||
            (auto.sourceType === 'tiktok' && ( (auto.tiktokSourceMethod === 'account' && !!auto.tiktokAccountId && (site.socialMediaSettings?.tiktok || []).some(a => a.id === auto.tiktokAccountId && a.isConnected)) || (auto.tiktokSourceMethod !== 'account' && !!auto.tiktokProfileUrl) )) ||
            (auto.sourceType === 'x' && ( (auto.xSourceMethod === 'account' && !!auto.xAccountId && (site.socialMediaSettings?.twitter || []).some(a => a.id === auto.xAccountId && a.isConnected)) || (auto.xSourceMethod !== 'account' && !!auto.xProfileUrl) ));
        
        const hasSchedule = auto.dailyPostTimes && auto.dailyPostTimes.length > 0;

        liveProductionReady = hasLiveSource && hasSchedule;
    }
    
    return { blog: blogReady, socialGraphic: socialGraphicReady, socialVideo: socialVideoReady, email: emailReady, liveProduction: liveProductionReady };
};
