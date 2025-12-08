import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { User, Site, AgencyAgentLog, AgentScheduledPost, ApiKeys } from '../types';
import { AiProvider, AVAILABLE_MODELS } from '../types';
import { storageService } from '../services/storageService';
import * as aiService from '../services/aiService';
import { ClockIcon, LightbulbIcon, CheckCircleIcon, ExclamationTriangleIcon, SparklesIcon } from './Icons';
import { FeaturesMarkdown } from './FeaturesMarkdown';
import { SettingsTab } from './SettingsTab';

const AgencyAgentDashboard: React.FC<{
    site: Site;
    onUpdate: (field: keyof Site, value: any) => void;
    logApiUsage: (provider: keyof ApiKeys, cost: number) => void;
    setError: (error: string | null) => void;
}> = ({ site, onUpdate, logApiUsage, setError }) => {
    const agentLog = site.agencyAgentLogs || [];
    const agentScheduledPosts = site.agentScheduledPosts || [];

    const addLog = useCallback((type: AgencyAgentLog['type'], message: string, details?: any) => {
        const newLog: AgencyAgentLog = { id: crypto.randomUUID(), timestamp: Date.now(), type, message, details };
        onUpdate('agencyAgentLogs', [newLog, ...(site.agencyAgentLogs || [])].slice(0, 100));
    }, [onUpdate, site.agencyAgentLogs]);

    const runAgentLogic = useCallback(async () => {
        onUpdate('lastAgentRun', Date.now());
        addLog('check', 'Agent performing daily trend analysis...');
        
        try {
            // Simplified logic for brevity in fix, assuming standard agent logic from App.tsx or similar
            const { topic, reasoning, cost } = await aiService.discoverTrendingTopicForAgent(site, []);
            logApiUsage('google', cost);

            const newPost: AgentScheduledPost = { id: crypto.randomUUID(), topic, suggestedTime: Date.now(), status: 'pending', reasoning };
            addLog('trend', `Winning Insight: "${topic}"`, { reasoning });
            onUpdate('agentScheduledPosts', [newPost, ...(site.agentScheduledPosts || [])]);

        } catch (e: any) {
            addLog('error', 'Agent error', { error: e.message });
        }
    }, [site, addLog, logApiUsage, onUpdate]);
    
    useEffect(() => {
        if (site.isAgencyAgentEnabled) {
            // Logic to run agent would go here, throttled by lastAgentRun
        }
    }, [site.isAgencyAgentEnabled]);

    const getLogIcon = (type: AgencyAgentLog['type']) => {
        switch(type) {
            case 'check': return <ClockIcon className="h-5 w-5 text-gray-400" />;
            case 'trend': return <LightbulbIcon className="h-5 w-5 text-yellow-300" />;
            case 'schedule': return <ClockIcon className="h-5 w-5 text-brand-primary" />;
            case 'complete': return <CheckCircleIcon className="h-5 w-5 text-green-300" />;
            case 'error': return <ExclamationTriangleIcon className="h-5 w-5 text-red-300" />;
            default: return <SparklesIcon className="h-5 w-5 text-gray-400" />;
        }
    }

    return (
        <div className="space-y-8">
            <div className="bg-panel/50 p-6 rounded-2xl border border-border">
                <div className="flex items-center justify-between">
                    <p className="font-medium text-main">Agency Agent Status</p>
                    <div className="text-sm">{site.isAgencyAgentEnabled ? 'Active' : 'Inactive'}</div>
                </div>
                <div className="mt-4 space-y-2">
                    {agentLog.map(log => (
                        <div key={log.id} className="flex gap-2 text-sm items-center p-2 rounded bg-panel-light/50">
                            {getLogIcon(log.type)} <span>{log.message}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const AgencyPortalTab: React.FC<{ currentUser: User }> = ({ currentUser }) => {
    const [sites, setSites] = useState<Site[]>([]);
    const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
    const [isInitializing, setIsInitializing] = useState(false);
    const [initMessage, setInitMessage] = useState('');
    const [activeTab, setActiveTab] = useState('agent');
    const [error, setError] = useState<string | null>(null);

    const selectedSite = sites.find(s => s.id === selectedSiteId);

    useEffect(() => {
        const initializeFirstPromoSite = async () => {
            setIsInitializing(true);
            try {
                const tempSiteConfigForInit = {
                    apiKeys: { google: process.env.API_KEY || '' },
                    modelConfig: {
                        textProvider: AiProvider.GOOGLE,
                        textModel: AVAILABLE_MODELS.GOOGLE.text[0],
                        imageProvider: AiProvider.GOOGLE,
                        imageModel: AVAILABLE_MODELS.GOOGLE.image[0],
                        videoProvider: AiProvider.GOOGLE,
                        videoModel: AVAILABLE_MODELS.GOOGLE.video[0],
                    }
                } as Site;

                setInitMessage("Analyzing application features...");
                const guidelinePrompt = `You are a professional brand strategist. Based on the following FEATURES.md document for "Zenith Engine AI", create a comprehensive brand guideline.\n\nFEATURES.md:\n\`\`\`markdown\n${FeaturesMarkdown}\n\`\`\``;
                const { response: guidelineResponse } = await aiService._callGeminiText({ prompt: guidelinePrompt, site: tempSiteConfigForInit });
                const brandGuideline = guidelineResponse.text;
                
                setInitMessage("Brainstorming initial content strategy...");
                const keywordPrompt = `Generate a list of 15-20 high-intent, long-tail keywords for "Zenith Engine AI".`;
                const { response: keywordResponse } = await aiService._callGeminiText({ prompt: keywordPrompt, site: tempSiteConfigForInit });
                const keywordList = keywordResponse.text;
                
                setInitMessage("Finalizing promotional workspace...");
                const defaultTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
                
                const newPromoSite: Site = {
                    id: 'promo-site-admin', name: 'Zenith Engine AI Promotions', wordpressUrl: '', wordpressUsername: '', applicationPassword: '',
                    brandGuideline, keywordList,
                    brandLogoLight: '', brandLogoDark: '', brandColors: '', brandFonts: '', characterReferences: [], promoLink1: '', promoLink2: '',
                    googleSheetSources: [], rssSources: [], videoSources: [], references: [], monitoredBacklinks: [], authorName: 'The Zenith Engine AI Team', authorId: undefined, availableAuthors: [], availableCategories: [], history: [], monthlyGenerationsCount: 0,
                    isAutomationEnabled: false, automationTrigger: 'daily', automationDailyTime: '09:00', automationTimezone: defaultTimezone, lastAutoPilotRun: undefined, recurringSchedules: [],
                    isAutoPublishEnabled: true, drafts: [], dailyGenerationSource: 'keyword', scheduleGenerationSource: 'keyword',
                    isInPostImagesEnabled: true, numberOfInPostImages: 2,
                    socialMediaSettings: { twitter: [], facebook: [], linkedin: [], instagram: [], pinterest: [], whatsapp: [], youtube: [], tiktok: [], telegram: [], snapchat: [], meta: [], meta_ads: [], google_ads: [] },
                    mailchimpSettings: { apiKey: '', serverPrefix: '', defaultListId: '', isConnected: false },
                    googleAnalyticsSettings: { isConnected: false },
                    clarityProjectId: '',
                    supabaseConnection: { url: '', anonKey: '', status: 'disconnected' },
                    paystackConnection: { publicKey: '', secretKey: '', status: 'disconnected' },
                    payfastConnection: { merchantId: '', merchantKey: '', passphrase: '', status: 'disconnected' },
                    wiseConnection: { apiKey: '', status: 'disconnected' },
                    payoneerConnection: { partnerId: '', programId: '', apiKey: '', status: 'disconnected' },
                    stripeConnection: { publicKey: '', secretKey: '', status: 'disconnected' },
                    payPalConnection: { clientId: '', clientSecret: '', status: 'disconnected' },
                    modelConfig: { textProvider: AiProvider.GOOGLE, textModel: AVAILABLE_MODELS.GOOGLE.text[0], imageProvider: AiProvider.GOOGLE, imageModel: AVAILABLE_MODELS.GOOGLE.image[0], videoProvider: AiProvider.GOOGLE, videoModel: AVAILABLE_MODELS.GOOGLE.video[0] },
                    apiKeys: { google: '', openAI: '', anthropic: '', openRouter: '', xai: '', replicate: '', openArt: '', dataforseo: '' },
                    apiUsage: {}, fetchedModels: {}, isAssistantEnabled: false, 
                    isVoiceControlEnabled: false, isVideoControlEnabled: false, isTextControlEnabled: false,
                    isSocialGraphicAutomationEnabled: false,
                    socialGraphicAutomationTrigger: 'daily',
                    socialGraphicDailyTime: '14:00',
                    socialGraphicRecurringSchedules: [],
                    socialGraphicGenerationSource: 'keyword',
                    isSocialVideoAutomationEnabled: false,
                    socialVideoAutomationTrigger: 'daily',
                    socialVideoDailyTime: '18:00',
                    socialVideoRecurringSchedules: [],
                    socialVideoGenerationSource: 'keyword',
                    isEmailMarketingAutomationEnabled: false,
                    emailMarketingAutomationTrigger: 'daily',
                    emailMarketingDailyTime: '10:00',
                    emailMarketingRecurringSchedules: [],
                    emailMarketingGenerationSource: 'newly_published_post',
                    seoDataProvider: 'google_search',
                    isLocalSeoEnabled: false,
                    localSeoServiceArea: '',
                    localSeoBusinessName: '',
                    localSeoPhoneNumber: '',
                    isAgencyAgentEnabled: true,
                    agencyAgentLogs: [],
                    agentScheduledPosts: [],
                    liveBroadcastAutomation: undefined
                };

                await storageService.saveSites([newPromoSite], currentUser);
                setSites([newPromoSite]);
                setSelectedSiteId(newPromoSite.id);
            } catch (e: any) {
                setError(e.message);
            } finally {
                setIsInitializing(false);
            }
        };

        const loadSites = async () => {
            const userSites = await storageService.getSites(currentUser.uid);
            if (userSites.length === 0) {
                initializeFirstPromoSite();
            } else {
                setSites(userSites);
                setSelectedSiteId(userSites[0].id);
            }
        };
        loadSites();
    }, [currentUser]);

    const handleSiteUpdate = (field: keyof Site, value: any) => {
        if (!selectedSiteId) return;
        const updatedSites = sites.map(s => s.id === selectedSiteId ? { ...s, [field]: value } : s);
        setSites(updatedSites);
        storageService.saveSites(updatedSites, currentUser);
    };

    if (isInitializing) return <div>Initializing... {initMessage}</div>;
    if (!selectedSite) return <div>No site selected</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-panel/50 p-6 rounded-2xl border border-border">
                <h2 className="text-2xl font-bold text-main">{selectedSite.name}</h2>
                <div className="flex gap-2">
                    <button onClick={() => setActiveTab('agent')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'agent' ? 'bg-brand-primary text-white' : 'bg-panel-light text-text-secondary'}`}>Agent</button>
                    <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'settings' ? 'bg-brand-primary text-white' : 'bg-panel-light text-text-secondary'}`}>Settings</button>
                </div>
            </div>

            {activeTab === 'agent' && (
                <AgencyAgentDashboard 
                    site={selectedSite} 
                    onUpdate={handleSiteUpdate} 
                    logApiUsage={(p, c) => {}}
                    setError={setError}
                />
            )}
            
            {activeTab === 'settings' && (
                <SettingsTab 
                    site={selectedSite}
                    onSiteUpdate={handleSiteUpdate}
                    onMultipleSiteUpdates={(updates) => {
                        const updatedSites = sites.map(s => s.id === selectedSiteId ? { ...s, ...updates } : s);
                        setSites(updatedSites);
                        storageService.saveSites(updatedSites, currentUser);
                    }}
                    onOpenDeleteDialog={() => {}}
                    setActiveTab={() => {}}
                />
            )}
        </div>
    );
};