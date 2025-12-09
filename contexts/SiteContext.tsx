
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { Site, User, ApiKeys } from '../types';
import { storageService } from '../services/storageService';
import { AVAILABLE_MODELS, AiProvider } from '../types';

interface SiteContextType {
    sites: Site[];
    selectedSiteId: string | null;
    selectedSite: Site | undefined;
    setSites: React.Dispatch<React.SetStateAction<Site[]>>;
    setSelectedSiteId: (id: string | null) => void;
    updateSite: (field: keyof Site, value: any) => void;
    updateMultipleSiteFields: (updates: Partial<Site>) => void;
    addNewSite: () => void;
    deleteSite: (id: string) => void;
    logApiUsage: (provider: keyof ApiKeys, cost: number) => void;
    loadUserData: (user: User) => Promise<void>;
}

const SiteContext = createContext<SiteContextType | undefined>(undefined);

export const useSite = () => {
    const context = useContext(SiteContext);
    if (!context) {
        throw new Error('useSite must be used within a SiteProvider');
    }
    return context;
};

export const SiteProvider: React.FC<{ children: React.ReactNode; currentUser: User | null }> = ({ children, currentUser }) => {
    const [sites, setSites] = useState<Site[]>([]);
    const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
    const saveTimeoutRef = useRef<number | null>(null);

    const selectedSite = sites.find(s => s.id === selectedSiteId);

    const loadUserData = useCallback(async (user: User) => {
        try {
            await storageService.migrateGuestDataToUser(user);
            const { sites: savedSites, lastSelectedId } = await storageService.loadSitesAndLastId(user);
            
            // Basic initialization logic moved from App.tsx
            const defaultApiKeys: ApiKeys = { google: '', openAI: '', anthropic: '', openRouter: '', xai: '', replicate: '', openArt: '', dataforseo: '' };
            const finalSites = savedSites.map(site => ({
                ...site,
                apiKeys: { ...defaultApiKeys, ...site.apiKeys }
            }));

            setSites(finalSites);
            
            if (lastSelectedId && finalSites.some(s => s.id === lastSelectedId)) {
                setSelectedSiteId(lastSelectedId);
            } else if (finalSites.length > 0) {
                setSelectedSiteId(finalSites[0].id);
            }
        } catch (error) {
            console.warn("Error loading user data:", error);
        }
    }, []);

    const updateSite = useCallback((field: keyof Site, value: any) => {
        if (!selectedSiteId) return;
        setSites(prev => prev.map(s => s.id === selectedSiteId ? { ...s, [field]: value } : s));
    }, [selectedSiteId]);

    const updateMultipleSiteFields = useCallback((updates: Partial<Site>) => {
        if (!selectedSiteId) return;
        setSites(prev => prev.map(s => s.id === selectedSiteId ? { ...s, ...updates } : s));
    }, [selectedSiteId]);

    const addNewSite = useCallback(() => {
        const defaultTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        // Simplified new site creation - re-uses logic or keep simpler
        const newSite: Site = {
            id: crypto.randomUUID(), name: `New Site ${sites.length + 1}`, wordpressUrl: '', wordpressUsername: '', applicationPassword: '',
            brandGuideline: '', keywordList: '', brandLogoLight: '', brandLogoDark: '', brandColors: '', brandFonts: '', characterReferences: [], promoLink1: '', promoLink2: '',
            googleSheetSources: [], rssSources: [], videoSources: [], references: [], monitoredBacklinks: [], authorName: '', authorId: undefined, availableAuthors: [], availableCategories: [], history: [], monthlyGenerationsCount: 0,
            isAutomationEnabled: false, automationTrigger: 'daily', automationDailyTime: '09:00', automationTimezone: defaultTimezone, lastAutoPilotRun: undefined, recurringSchedules: [],
            isAutoPublishEnabled: true, drafts: [], dailyGenerationSource: 'keyword', scheduleGenerationSource: 'keyword', isInPostImagesEnabled: false, numberOfInPostImages: 3,
            socialMediaSettings: { twitter: [], facebook: [], linkedin: [], instagram: [], pinterest: [], whatsapp: [], youtube: [], tiktok: [], telegram: [], snapchat: [], meta: [], meta_ads: [], google_ads: [] },
            mailchimpSettings: { apiKey: '', serverPrefix: '', defaultListId: '', isConnected: false }, googleAnalyticsSettings: { isConnected: false }, clarityProjectId: '',
            supabaseConnection: { url: '', anonKey: '', status: 'disconnected' }, paystackConnection: { publicKey: '', secretKey: '', status: 'disconnected' }, payfastConnection: { merchantId: '', merchantKey: '', passphrase: '', status: 'disconnected' }, wiseConnection: { apiKey: '', status: 'disconnected' },
            payoneerConnection: { partnerId: '', programId: '', apiKey: '', status: 'disconnected' }, stripeConnection: { publicKey: '', secretKey: '', status: 'disconnected' }, payPalConnection: { clientId: '', clientSecret: '', status: 'disconnected' },
            modelConfig: { textProvider: AiProvider.GOOGLE, textModel: AVAILABLE_MODELS.GOOGLE.text[0], imageProvider: AiProvider.GOOGLE, imageModel: AVAILABLE_MODELS.GOOGLE.image[0], videoProvider: AiProvider.GOOGLE, videoModel: AVAILABLE_MODELS.GOOGLE.video[0] },
            apiKeys: { google: '', openAI: '', anthropic: '', openRouter: '', xai: '', replicate: '', openArt: '', dataforseo: '' },
            apiUsage: {}, fetchedModels: {}, isAssistantEnabled: true, isVoiceControlEnabled: true, isVideoControlEnabled: true, isTextControlEnabled: true,
            isSocialGraphicAutomationEnabled: false, socialGraphicAutomationTrigger: 'daily', socialGraphicDailyTime: '14:00', lastSocialGraphicAutoPilotRun: undefined, socialGraphicRecurringSchedules: [], socialGraphicGenerationSource: 'keyword',
            isSocialVideoAutomationEnabled: false, socialVideoAutomationTrigger: 'daily', socialVideoDailyTime: '18:00', lastSocialVideoAutoPilotRun: undefined, socialVideoRecurringSchedules: [], socialVideoGenerationSource: 'keyword',
            isEmailMarketingAutomationEnabled: false, emailMarketingAutomationTrigger: 'daily', emailMarketingDailyTime: '10:00', lastEmailMarketingAutoPilotRun: undefined, emailMarketingRecurringSchedules: [], emailMarketingGenerationSource: 'newly_published_post',
            seoDataProvider: 'google_search', isLocalSeoEnabled: false, localSeoServiceArea: '', localSeoBusinessName: '', localSeoPhoneNumber: '',
            isAgencyAgentEnabled: false, agencyAgentLogs: [], agentScheduledPosts: [], lastAgentRun: undefined,
            liveBroadcastAutomation: { isEnabled: false, sourceType: 'meta', facebookPageId: '', facebookPageUrl: '', youtubeChannelUrl: '', tiktokProfileUrl: '', xProfileUrl: '', scheduleType: 'monitor', broadcastDay: 0, broadcastStartTime: '10:00', broadcastEndTime: '12:00', dailyPostTimes: ['09:00', '17:00'], status: 'idle', currentWeekClips: [], youtubeSourceMethod: 'url', tiktokSourceMethod: 'url', xSourceMethod: 'url' },
        };
        setSites(prev => [...prev, newSite]);
        setSelectedSiteId(newSite.id);
    }, [sites.length]);

    const deleteSite = useCallback((id: string) => {
        setSites(prev => {
            const remaining = prev.filter(s => s.id !== id);
            if (selectedSiteId === id) {
                setSelectedSiteId(remaining.length > 0 ? remaining[0].id : null);
            }
            return remaining;
        });
    }, [selectedSiteId]);

    const logApiUsage = useCallback((provider: keyof ApiKeys, cost: number) => {
        if (!selectedSiteId) return;
        setSites(prev => prev.map(s => {
            if (s.id !== selectedSiteId) return s;
            const currentUsage = s.apiUsage?.[provider] || 0;
            return { ...s, apiUsage: { ...s.apiUsage, [provider]: currentUsage + cost } };
        }));
    }, [selectedSiteId]);

    // Auto-save effect
    useEffect(() => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        if (!currentUser || currentUser.isAdmin) return;

        saveTimeoutRef.current = window.setTimeout(async () => {
            if (sites.length > 0) {
                await storageService.saveSites(sites, currentUser);
                if (selectedSiteId) await storageService.saveLastSelectedSiteId(currentUser.uid, selectedSiteId);
            }
        }, 2000);

        return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
    }, [sites, selectedSiteId, currentUser]);

    return (
        <SiteContext.Provider value={{ sites, selectedSiteId, selectedSite, setSites, setSelectedSiteId, updateSite, updateMultipleSiteFields, addNewSite, deleteSite, logApiUsage, loadUserData }}>
            {children}
        </SiteContext.Provider>
    );
};
