
/*
 * 🔒 CORE FEATURE: AGENCY PORTAL & AGENT WORKSPACE
 * STATUS: PROTECTED / FROZEN
 * -----------------------------------------------------------------------------
 * This component represents a critical, high-value feature for the application.
 * It allows Agency-tier users to manage client sites and run autonomous agents.
 * 
 * CRITICAL FUNCTIONALITY PRESERVATION:
 * 1. Independent Site State (AGENCY_SITES_KEY): Must remain isolated from user state.
 * 2. Automatic Promo Site Initialization: Parses FeaturesMarkdown to auto-configure branding.
 * 3. Agency Agent Dashboard: The Log/Idea split view is essential for user trust.
 * 4. Automation Readiness Indicator: The visual health-check system in the header.
 * 
 * DO NOT MODIFY THE STRUCTURE OR LOGIC OF THIS FILE WITHOUT EXPLICIT AUTHORIZATION.
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
// FIX: Added ApiKeys to the import from ../types
import type { User, SubscriptionPlan, Site, GlobalSettings, SupabaseConnection, PaystackConnection, PayfastConnection, WiseConnection, PayoneerConnection, StripeConnection, PayPalConnection, BlogPost, StrategicBrief, PostHistoryItem, RssItem, SocialMediaPost, Draft, WhatsAppAccount, TelegramAccount, SocialMediaAccount, SeoChecklist, RssSource, GoogleSheetSource, MetaConnection, AgencyAgentLog, AgentScheduledPost, LiveBroadcastClip, LiveBroadcastAutomation, ApiKeys } from '../types';
import { AiProvider, AVAILABLE_MODELS, AppStatus, Type } from '../types';
import { storageService } from '../services/storageService';
import * as aiService from '../services/aiService';
import { calculateSeoScore } from '../services/seoService';
import * as oauthService from '../services/oauthService';
import * as mailchimpService from '../services/mailchimpService';
import * as clarityService from '../services/clarityService';
import * as googleAnalyticsService from '../services/googleAnalyticsService';
import { verifySupabaseConnection } from '../services/dbService';
import { verifyPaystackConnection } from '../services/paystackService';
import { verifyPayfastConnection } from '../services/payfastService';
import { verifyWiseConnection } from '../services/wiseService';
import { verifyPayoneerConnection } from '../services/payoneerService';
import { verifyStripeConnection } from '../services/stripeService';
import { verifyPayPalConnection } from '../services/paypalService';
import { publishPost, verifyWordPressConnection } from '../services/wordpressService';
import * as socialMediaService from '../services/socialMediaService';
import { useToast } from '../hooks/useToast';

import { ContentHubTab } from './ContentHubTab';
import { AutomationDashboard } from './AutomationDashboard';
import { BrandingTab } from './BrandingTab';
import { ConnectionsTab } from './ConnectionsTab';
import { ArticleViewer } from './ArticleViewer';
import { PublishSuccessViewer } from './PublishSuccessViewer';
import { HistoryDetailViewer } from './HistoryDetailViewer';
import { ApiSpendDashboard } from './ApiSpendDashboard';
import { SettingsTab } from './SettingsTab'; // Import the main SettingsTab
import { DocumentTextIcon, ShareIcon, SparklesIcon, LinkIcon, XIcon, LightbulbIcon, ClockIcon, CheckCircleIcon, ExclamationTriangleIcon, BrainCircuitIcon, WordPressIcon, UserIcon, KeyIcon, TrashIcon, BuildingOffice2Icon, ChartPieIcon, PenIcon, ArrowRightIcon, LogoIcon, SignOutIcon } from './Icons';
import { FeaturesMarkdown } from './FeaturesMarkdown';
import { checkAutomationReadiness } from '../utils/automationReadiness';

const AGENCY_SITES_KEY = 'zenith-engine-ai-agency-sites';
const AGENCY_LAST_SELECTED_KEY = 'zenith-engine-ai-agency-last-selected';

const providerDisplayNames: Record<AiProvider, string> = {
  [AiProvider.GOOGLE]: 'Google',
  [AiProvider.OPENAI]: 'OpenAI',
  [AiProvider.OPENROUTER]: 'OpenRouter',
  [AiProvider.ANTHROPIC]: 'Anthropic',
  [AiProvider.XAI]: 'X.AI Grok',
  [AiProvider.REPLICATE]: 'Replicate',
  [AiProvider.OPENART]: 'OpenArt AI',
};

interface AgencyPortalTabProps {
    currentUser: User;
}

/**
 * 🔒 CORE SUB-COMPONENT: AGENCY AGENT DASHBOARD
 * Handles the logic for the autonomous agent logs and idea generation.
 */
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
        onUpdate('agencyAgentLogs', [newLog, ...(site.agencyAgentLogs || [])].slice(0, 100)); // Keep log size manageable
    }, [onUpdate, site.agencyAgentLogs]);

    const runAgentLogic = useCallback(async () => {
        onUpdate('lastAgentRun', Date.now());
        addLog('check', 'Agent performing daily trend analysis...');
        
        try {
            const performanceData = (site.history || [])
                .filter(p => p.analytics && p.analytics.pageviews > 0)
                .sort((a, b) => b.analytics!.pageviews - a.analytics!.pageviews)
                .slice(0, 10)
                .map(p => ({ topic: p.topic, pageviews: p.analytics!.pageviews }));
            
            addLog('info', performanceData.length > 0 ? `Analyzing ${performanceData.length} top posts...` : 'No performance data found. Relying on web trends.');

            const { topic, reasoning, cost: trendCost } = await aiService.discoverTrendingTopicForAgent(site, performanceData);
            logApiUsage('google', trendCost);

            const isDuplicate = (site.agentScheduledPosts || []).some(p => p.topic === topic && p.status !== 'error') || (site.history || []).some(h => h.topic === topic);

            if (isDuplicate) {
                addLog('info', `Trend "${topic}" is already in the list or published. Standing by.`);
                return;
            }

            addLog('trend', `Winning Insight Identified: "${topic}"`, { reasoning });
            const newPost: AgentScheduledPost = { id: crypto.randomUUID(), topic, suggestedTime: Date.now(), status: 'pending' };
            addLog('schedule', `New idea added to the list.`);
            onUpdate('agentScheduledPosts', [newPost, ...(site.agentScheduledPosts || [])]);

        } catch (e: any) {
            console.error("Agency Agent Error:", e);
            setError(`Agency Agent failed: ${e.message}`);
            addLog('error', 'Agent encountered an error.', { error: e.message });
        }
    }, [site, addLog, logApiUsage, setError, onUpdate]);
    
    useEffect(() => {
        if (site.isAgencyAgentEnabled) {
            const now = new Date();
            const lastRun = site.lastAgentRun ? new Date(site.lastAgentRun) : null;
            let shouldRun = !lastRun || (now.getTime() - lastRun.getTime() > 23 * 60 * 60 * 1000); // roughly once a day
            if (shouldRun) runAgentLogic();
        }
    }, [site.isAgencyAgentEnabled, site.lastAgentRun, runAgentLogic]);
    
    const getLogIcon = (type: AgencyAgentLog['type']) => {
        switch(type) {
            case 'check': return <ClockIcon className="h-5 w-5 text-gray-400" />;
            case 'trend': return <LightbulbIcon className="h-5 w-5 text-yellow-300" />;
            case 'schedule': return <ClockIcon className="h-5 w-5 text-blue-300" />;
            case 'complete': return <CheckCircleIcon className="h-5 w-5 text-green-300" />;
            case 'error': return <ExclamationTriangleIcon className="h-5 w-5 text-red-300" />;
            default: return <SparklesIcon className="h-5 w-5 text-gray-400" />;
        }
    }

    return (
        <div className="space-y-8">
            <div className="bg-panel/50 p-6 rounded-2xl border border-border">
                <div className="flex items-center justify-between">
                    <p className="font-medium text-main">Enable Agency Agent</p>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={site.isAgencyAgentEnabled ?? false} onChange={e => onUpdate('isAgencyAgentEnabled', e.target.checked)} />
                        <div className="w-11 h-6 bg-gray-600/50 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                </div>
                {(site.isAgencyAgentEnabled ?? false) && (
                    <div className="mt-2 text-xs flex items-center gap-2">
                        <div className="text-purple-300 animate-pulse">Agent is active...</div>
                        <div className="flex-grow border-t border-dashed border-border-subtle"></div>
                        {site.lastAgentRun && <div className="text-text-secondary">Last check: {new Date(site.lastAgentRun).toLocaleString()}</div >}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-panel/50 p-6 rounded-2xl border border-border">
                    <h3 className="text-lg font-bold text-main mb-4">Agent Log</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {agentLog.map(log => (
                            <div key={log.id} className="flex items-start gap-3 p-3 bg-panel-light rounded-lg">
                                <div className="flex-shrink-0 mt-0.5">{getLogIcon(log.type)}</div>
                                <div className="flex-1"><p className="text-sm text-text-primary">{log.message}</p><p className="text-xs text-text-secondary">{new Date(log.timestamp).toLocaleString()}</p></div>
                            </div>
                        ))}
                    </div>
                </div>
                 <div className="bg-panel/50 p-6 rounded-2xl border border-border">
                     <h3 className="text-lg font-bold text-main mb-4">Content Idea List</h3>
                     <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                         {agentScheduledPosts.map(post => {
                            const statusStyles = { pending: { icon: ClockIcon, color: 'text-blue-300' }, processing: { icon: SparklesIcon, color: 'text-yellow-300 animate-pulse' }, complete: { icon: CheckCircleIcon, color: 'text-green-300' }, error: { icon: ExclamationTriangleIcon, color: 'text-red-300' }, };
                            const StatusIcon = statusStyles[post.status].icon;
                             return (
                                <div key={post.id} className="flex items-start gap-3 p-3 bg-panel-light rounded-lg">
                                    <div className="flex-shrink-0 mt-0.5"><StatusIcon className={`h-5 w-5 ${statusStyles[post.status].color}`} /></div>
                                    <div className="flex-1"><p className="text-sm font-semibold text-main">{post.topic}</p><p className="text-xs text-text-secondary">Suggested: {new Date(post.suggestedTime).toLocaleString()}</p><p className={`text-xs capitalize ${statusStyles[post.status].color}`}>{post.status}</p></div>
                                </div>
                            );
                         })}
                    </div>
                </div>
            </div>
        </div>
    );
};


/**
 * 🔒 CORE COMPONENT: AGENCY PORTAL TAB
 * The main container for the agency workspace. Manages independent site state and initialization.
 */
export const AgencyPortalTab: React.FC<AgencyPortalTabProps> = ({ currentUser }) => {
    const [sites, setSites] = useState<Site[]>([]);
    const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
    const [isInitializing, setIsInitializing] = useState(false);
    const [initMessage, setInitMessage] = useState('');
    const [activeTab, setActiveTab] = useState('agent');
    const [error, setError] = useState<string | null>(null);
    const saveTimeoutRef = useRef<number | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');

    const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [blogPost, setBlogPost] = useState<BlogPost | null>(null);
    const [strategicBrief, setStrategicBrief] = useState<StrategicBrief | null>(null);
    const [publishedPostUrl, setPublishedPostUrl] = useState<string | null>(null);
    const [lastGeneratedSocialPosts, setLastGeneratedSocialPosts] = useState<Record<string, SocialMediaPost> | null>(null);
    const [seoScore, setSeoScore] = useState<{ score: number; checklist: SeoChecklist } | null>(null);
    const [isConnectingSocial, setIsConnectingSocial] = useState<string | null>(null);
    const [viewingHistoryItem, setViewingHistoryItem] = useState<PostHistoryItem | null>(null);
    const [originalArticleForDiff, setOriginalArticleForDiff] = useState<string | null>(null);
    const [refreshedArticleForDiff, setRefreshedArticleForDiff] = useState<BlogPost | null>(null);
    const [currentTopic, setCurrentTopic] = useState<string>('');
    const [currentGenerationSource, setCurrentGenerationSource] = useState<PostHistoryItem['type'] | null>(null);
    const [currentSourceDetails, setCurrentSourceDetails] = useState<any>(null);
    const [reviewingDraft, setReviewingDraft] = useState<Draft | null>(null);
    
    const selectedSite = useMemo(() => sites.find(s => s.id === selectedSiteId), [sites, selectedSiteId]);
    const isLoading = status > AppStatus.IDLE && status < AppStatus.READY_TO_PUBLISH;
    const toast = useToast();

    const automationReadiness = useMemo(() => {
        if (!selectedSite) return { blog: false, socialGraphic: false, socialVideo: false, email: false, liveProduction: false };
        return checkAutomationReadiness(selectedSite);
    }, [selectedSite]);

    const isAnyAutomationEnabled = useMemo(() => {
        if (!selectedSite) return false;
        return selectedSite.isAutomationEnabled || selectedSite.isSocialGraphicAutomationEnabled || selectedSite.isSocialVideoAutomationEnabled || selectedSite.isEmailMarketingAutomationEnabled || selectedSite.liveBroadcastAutomation?.isEnabled;
    }, [selectedSite]);

    const isAnyAutomationReady = useMemo(() => Object.values(automationReadiness).some(Boolean), [automationReadiness]);

    const automationStatusColor = useMemo(() => {
        if (!isAnyAutomationEnabled) return 'bg-gray-500'; // Disabled
        return isAnyAutomationReady ? 'bg-green-500' : 'bg-yellow-500'; // Ready or Misconfigured
    }, [isAnyAutomationEnabled, isAnyAutomationReady]);

    const agencyPlanAccess = {
        plan: 'agency' as const,
        canUseAnalytics: true,
        canUseAuthority: true,
        canUseAdvertising: true,
        canUseAuthorityCommenting: true,
        canUseAuthorityOutreach: true,
        canUseBlogAutomation: true,
        canUseSocialAutomation: true,
        canUseSocialGraphicsAutomation: true,
        canUseSocialVideoAutomation: true,
        canUseEmailMarketing: true,
        canUseAdvancedBranding: true,
        canUseCharacterPersonas: true,
        canUseAdvancedConnections: true,
        canUseMcp: true,
        canUseDataForSeo: true,
        canUseCustomModels: true,
        canUseGoogleSheets: true,
        canUseClientManagement: true,
        canUseLiveProduction: true,
        siteLimit: Infinity,
        generationLimit: Infinity,
        generationsUsed: 0,
        canGenerate: true,
    };

    // 🔒 PROTECTED LOGIC: Automatic Promo Site Initialization
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
                const guidelinePrompt = `You are a professional brand strategist. Based on the following FEATURES.md document for an application called "Zenith Engine AI", create a comprehensive brand guideline. The guideline should be a string containing sections for Brand Voice, Target Audience, Key Topics, and Writing Style. This will be used as the master context for an AI content generator.\n\nFEATURES.md:\n\`\`\`markdown\n${FeaturesMarkdown}\n\`\`\``;
                const { response: guidelineResponse } = await aiService._callGeminiText({ prompt: guidelinePrompt, site: tempSiteConfigForInit });
                const brandGuideline = guidelineResponse.text;
                
                setInitMessage("Brainstorming initial content strategy...");
                const keywordPrompt = `You are an expert SEO and content strategist for a SaaS company. Based on the following brand guideline for "Zenith Engine AI", generate a list of 15-20 high-intent, long-tail keywords and blog post titles. These should be topics that would attract the target audience and highlight the application's core features. Output a single string with each idea on a new line.\n\nBrand Guideline:\n"${brandGuideline}"`;
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
                    apiUsage: {}, fetchedModels: {}, isAssistantEnabled: false, isVoiceControlEnabled: false, isVideoControlEnabled: false, isTextControlEnabled: false,
                    isSocialGraphicAutomationEnabled: false, socialGraphicAutomationTrigger: 'daily', socialGraphicDailyTime: '14:00', lastSocialGraphicAutoPilotRun: undefined, socialGraphicRecurringSchedules: [], socialGraphicGenerationSource: 'keyword',
                    isSocialVideoAutomationEnabled: false, socialVideoAutomationTrigger: 'daily', socialVideoDailyTime: '18:00', lastSocialVideoAutoPilotRun: undefined, socialVideoRecurringSchedules: [], socialVideoGenerationSource: 'keyword',
                    isEmailMarketingAutomationEnabled: false, emailMarketingAutomationTrigger: 'daily', emailMarketingDailyTime: '10:00', lastEmailMarketingAutoPilotRun: undefined, emailMarketingRecurringSchedules: [], emailMarketingGenerationSource: 'newly_published_post',
                    seoDataProvider: 'google_search', isLocalSeoEnabled: false, localSeoServiceArea: '', localSeoBusinessName: '', localSeoPhoneNumber: '',
                    isAgencyAgentEnabled: false, agencyAgentLogs: [], agentScheduledPosts: [], lastAgentRun: undefined,
                    liveBroadcastAutomation: { isEnabled: false, sourceType: 'meta', facebookPageId: '', facebookPageUrl: '', youtubeChannelUrl: '', tiktokProfileUrl: '', xProfileUrl: '', scheduleType: 'monitor', broadcastDay: 0, broadcastStartTime: '10:00', broadcastEndTime: '12:00', dailyPostTimes: ['09:00', '17:00'], status: 'idle', currentWeekClips: [], youtubeSourceMethod: 'url', tiktokSourceMethod: 'url', xSourceMethod: 'url' },
                };
                setSites([newPromoSite]);
                setSelectedSiteId(newPromoSite.id);
                localStorage.setItem(AGENCY_SITES_KEY, JSON.stringify([newPromoSite]));
            } catch (e: any) {
                setError(`Failed to initialize Agency Portal: ${e.message}`); console.error(e);
            } finally {
                setIsInitializing(false); setInitMessage('');
            }
        };

        const savedSitesJSON = localStorage.getItem(AGENCY_SITES_KEY);
        if (savedSitesJSON) {
            const savedSites = JSON.parse(savedSitesJSON);
            if (savedSites.length > 0) {
                setSites(savedSites);
                const lastSelectedId = localStorage.getItem(AGENCY_LAST_SELECTED_KEY);
                if (lastSelectedId && savedSites.some((s: Site) => s.id === lastSelectedId)) {
                    setSelectedSiteId(lastSelectedId);
                } else {
                    setSelectedSiteId(savedSites[0].id);
                }
            } else {
                initializeFirstPromoSite();
            }
        } else {
            initializeFirstPromoSite();
        }
    }, []);

    useEffect(() => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        if (sites.length > 0) {
            saveTimeoutRef.current = window.setTimeout(() => {
                localStorage.setItem(AGENCY_SITES_KEY, JSON.stringify(sites));
                if (selectedSiteId) {
                    localStorage.setItem(AGENCY_LAST_SELECTED_KEY, selectedSiteId);
                }
            }, 1500);
        }
        return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
    }, [sites, selectedSiteId]);

    const handleSiteUpdate = useCallback((field: keyof Site, value: any) => setSites(prevSites => prevSites.map(s => s.id === selectedSiteId ? { ...s, [field]: value } : s)), [selectedSiteId]);
    const handleMultipleSiteUpdates = useCallback((updates: Partial<Site>) => setSites(prevSites => prevSites.map(s => s.id === selectedSiteId ? { ...s, ...updates } : s)), [selectedSiteId]);
    const logApiUsage = useCallback((provider: keyof ApiKeys, cost: number) => { if (cost === 0) return; setSites(prevSites => prevSites.map(s => s.id === selectedSiteId ? { ...s, apiUsage: { ...s.apiUsage, [provider]: (s.apiUsage?.[provider] || 0) + cost } } : s)); }, [selectedSiteId]);
    
    const resetGeneration = useCallback(() => {
        setStatus(AppStatus.IDLE);
        setBlogPost(null);
        setStrategicBrief(null);
        setPublishedPostUrl(null);
        setCurrentTopic('');
        setSeoScore(null);
        setStatusMessage('');
        setError(null);
        setLastGeneratedSocialPosts(null);
        setOriginalArticleForDiff(null);
        setRefreshedArticleForDiff(null);
    }, [setError]);

    const generateAndScorePost = useCallback(async (topicToTrack: string, generationSource: 'keyword' | 'rss' | 'video' | 'google_sheet' | 'agency_agent', sourceDetails: any, site: Site) => {
        resetGeneration();
        setStatus(AppStatus.GENERATING_STRATEGY);
        setStatusMessage('Discovering high-intent keyword...');
        setCurrentTopic(topicToTrack);
        setCurrentGenerationSource(
            generationSource === 'keyword' ? 'Keyword' :
            generationSource === 'rss' ? 'RSS' :
            generationSource === 'video' ? 'Video' :
            generationSource === 'google_sheet' ? 'Google Sheet' :
            generationSource === 'agency_agent' ? 'Agency Agent' :
            'Keyword'
        );
        setCurrentSourceDetails(sourceDetails);

        try {
            let initialTopic: string;
            switch (generationSource) {
                case 'rss': initialTopic = sourceDetails.item.title; break;
                case 'video': initialTopic = sourceDetails.item.title; break;
                case 'google_sheet': initialTopic = sourceDetails.item; break;
                case 'agency_agent': initialTopic = topicToTrack; break;
                case 'keyword': default: initialTopic = topicToTrack; break;
            }

            setStatusMessage('Performing competitive analysis...');
            const { brief, costs: briefCosts } = await aiService.generateStrategicBriefFromKeyword(initialTopic, site);
            setStrategicBrief(brief);
            for (const provider in briefCosts) { logApiUsage(provider as keyof ApiKeys, (briefCosts as any)[provider] || 0); }

            const textProviderName = providerDisplayNames[site.modelConfig.textProvider];
            setStatus(AppStatus.GENERATING_ARTICLE);
            setStatusMessage(`Writing the blog post with ${textProviderName}...`);
            const { postData, cost: articleCost, provider: articleProvider } = await aiService.generateArticleFromBrief(brief, site);
            logApiUsage(articleProvider, articleCost);

            let contentAfterGallery = postData.content;
            if (site.isIntelligentGalleryEnabled && site.imageGallery && site.imageGallery.length > 0) {
                setStatusMessage('Applying intelligent gallery edits...');
                const { processedHtml, cost: galleryEditCost, provider: galleryEditProvider } = await aiService.processGalleryImagesInHtml(postData.content, site);
                contentAfterGallery = processedHtml;
                logApiUsage(galleryEditProvider, galleryEditCost);
            }

            setStatusMessage('Validating external links...');
            const validatedContent1 = await aiService.postProcessArticleLinks(contentAfterGallery);
            
            const imageProviderName = providerDisplayNames[site.modelConfig.imageProvider];
            setStatus(AppStatus.GENERATING_IMAGE);
            setStatusMessage(`Creating a featured image with ${imageProviderName}...`);
            const { base64Image, cost: imageCost, provider: imageProvider } = await aiService.generateFeaturedImage(postData.imagePrompt, site);
            logApiUsage(imageProvider, imageCost);

            let fullPost: BlogPost = { ...postData, content: validatedContent1, imageUrl: `data:image/jpeg;base64,${base64Image}` };
            
            setStatus(AppStatus.CORRECTING_SEO);
            setStatusMessage('Auto-correcting SEO...');
            const { score: initialScore, checklist: initialChecklist } = calculateSeoScore(fullPost, brief, site);
            if (initialScore < 100) {
                const { correctedHtml, cost: correctionCost, provider: correctionProvider } = await aiService.correctSeoIssues(fullPost.content, initialChecklist, brief, site);
                logApiUsage(correctionProvider, correctionCost);
                setStatusMessage('Re-validating corrected links...');
                const validatedContent2 = await aiService.postProcessArticleLinks(correctedHtml);
                fullPost = { ...fullPost, content: validatedContent2, wasSeoAutoCorrected: true };
            }
            
            let finalContent = fullPost.content;
            if (site.isInPostImagesEnabled && (site.numberOfInPostImages ?? 0) > 0) {
                setStatusMessage('Generating in-post images...');
                const { processedHtml, cost: inPostImageCost, provider: inPostImageProvider } = await aiService.processNewInPostImages(finalContent, site);
                finalContent = processedHtml;
                logApiUsage(inPostImageProvider, inPostImageCost);
            }
            fullPost = { ...fullPost, content: finalContent };

            const { score, checklist } = calculateSeoScore(fullPost, brief, site);
            setBlogPost(fullPost);
            setSeoScore({ score, checklist });
            setStatus(AppStatus.READY_TO_PUBLISH);

        } catch (e: any) {
            setError(e.message);
            setStatus(AppStatus.ERROR);
        }
    }, [resetGeneration, logApiUsage, setError]);

    const handlePublish = useCallback(async () => {
        if (!blogPost || !selectedSite || !currentGenerationSource) {
            setError("Could not publish. Critical data is missing.");
            return;
        }
        
        setStatus(AppStatus.PUBLISHING);
        setStatusMessage('Uploading to WordPress...');

        try {
            const publishedUrl = await publishPost(selectedSite, blogPost, blogPost.focusKeyword);
            setPublishedPostUrl(publishedUrl);
            
            setStatus(AppStatus.GENERATING_SOCIAL_POSTS);
            setStatusMessage('Drafting social media posts...');
            const { posts: socialPosts, cost: socialCost, provider: socialProvider } = await aiService.generateSocialMediaPosts(blogPost, publishedUrl, selectedSite);
            logApiUsage(socialProvider, socialCost);
            setLastGeneratedSocialPosts(socialPosts);
            
            const newHistoryItem: PostHistoryItem = {
                id: crypto.randomUUID(),
                topic: blogPost.title,
                url: publishedUrl,
                date: Date.now(),
                type: currentGenerationSource,
                socialMediaPosts: socialPosts
            };

            const updatedSites = sites.map(s => {
                if (s.id !== selectedSite.id) return s;
                let updatedSite = { ...s, history: [...s.history, newHistoryItem] };

                if (currentGenerationSource === 'RSS' && currentSourceDetails.sourceId) {
                    updatedSite.rssSources = updatedSite.rssSources.map(rs => rs.id === currentSourceDetails.sourceId ? { ...rs, processedRssGuids: [...new Set([...rs.processedRssGuids, currentSourceDetails.item.guid])] } : rs);
                } else if (currentGenerationSource === 'Keyword') {
                    const lines = s.keywordList.split('\n');
                    const topicIndex = lines.findIndex(line => line.trim() === currentTopic.trim());
                    if (topicIndex !== -1) { lines[topicIndex] = `[DONE] ${currentTopic.trim()}`; }
                    updatedSite = { ...updatedSite, keywordList: lines.join('\n') };
                } else if (currentGenerationSource === 'Google Sheet' && currentSourceDetails.sourceId) {
                    updatedSite.googleSheetSources = updatedSite.googleSheetSources.map(ss => ss.id === currentSourceDetails.sourceId ? { ...ss, processedGoogleSheetRows: [...new Set([...ss.processedGoogleSheetRows, currentSourceDetails.rowIndex])] } : ss);
                } else if (currentGenerationSource === 'Video' && currentSourceDetails.sourceId) {
                     const sourceToUpdate = updatedSite.videoSources.find(vs => vs.id === currentSourceDetails.sourceId);
                     if (sourceToUpdate) {
                         const guidToProcess = sourceToUpdate.type === 'video' ? sourceToUpdate.url : currentSourceDetails.item.guid;
                         updatedSite.videoSources = updatedSite.videoSources.map(vs => vs.id === sourceToUpdate.id ? { ...vs, processedVideoGuids: [...new Set([...vs.processedVideoGuids, guidToProcess])] } : vs);
                     }
                } else if (currentGenerationSource === 'Agency Agent' && currentSourceDetails.value.agentPostId) {
                     updatedSite.agentScheduledPosts = (updatedSite.agentScheduledPosts || []).map(p => 
                        p.id === currentSourceDetails.value.agentPostId ? { ...p, status: 'complete' as const, resultingPostId: newHistoryItem.id } : p
                    );
                }
                
                if (reviewingDraft) {
                    updatedSite.drafts = updatedSite.drafts.filter(d => d.id !== reviewingDraft.id);
                }

                return updatedSite;
            });

            setSites(updatedSites);
            setReviewingDraft(null);
            setStatus(AppStatus.PUBLISHED);
            setStatusMessage('Published!');
        } catch (e: any) {
            setError(e.message);
            setStatus(AppStatus.ERROR);
        }
    }, [blogPost, selectedSite, sites, currentGenerationSource, currentSourceDetails, currentTopic, reviewingDraft, logApiUsage, setError]);
    
    const onRefreshArticle = useCallback(async (url: string, site: Site) => {
        resetGeneration();
        setStatus(AppStatus.GENERATING_STRATEGY);
        setStatusMessage('Analyzing existing article...');
        
        try {
            const { originalHtml, refreshedPostData, brief, costs } = await aiService.generateRefreshedArticleFromUrl(url, site);
            for (const provider in costs) {
                logApiUsage(provider as keyof ApiKeys, (costs as any)[provider] || 0);
            }
            
            setStatusMessage('Generating refreshed image...');
            const { base64Image, cost: imageCost, provider: imageProvider } = await aiService.generateFeaturedImage(refreshedPostData.imagePrompt, site);
            logApiUsage(imageProvider, imageCost);
            
            const fullPost: BlogPost = { ...refreshedPostData, imageUrl: `data:image/jpeg;base64,${base64Image}` };
            
            const { score, checklist } = calculateSeoScore(fullPost, brief, site);
            
            setOriginalArticleForDiff(originalHtml);
            setRefreshedArticleForDiff(fullPost);
            setBlogPost(fullPost);
            setStrategicBrief(brief);
            setSeoScore({ score, checklist });
            setStatus(AppStatus.READY_TO_PUBLISH);
        } catch (e: any) {
            setError(e.message);
            setStatus(AppStatus.ERROR);
        }
    }, [resetGeneration, logApiUsage, setError]);
    
    const handleReviewDraft = useCallback((draftId: string) => {
        if (!selectedSite) return;
        const draft = selectedSite.drafts.find(d => d.id === draftId);
        if (draft) {
          setReviewingDraft(draft);
          setBlogPost(draft.blogPost);
          setStrategicBrief(draft.strategicBrief);
          setStatus(AppStatus.READY_TO_PUBLISH);
        }
    }, [selectedSite]);
    
    const onDiscardDraft = useCallback((draftId: string) => {
        if (window.confirm("Are you sure you want to discard this draft? This cannot be undone.")) {
          handleSiteUpdate('drafts', selectedSite?.drafts.filter(d => d.id !== draftId) || []);
        }
    }, [selectedSite, handleSiteUpdate]);

    const handleBlogPostUpdate = (updatedPost: BlogPost) => {
        if (strategicBrief && selectedSite) {
            const { score, checklist } = calculateSeoScore(updatedPost, strategicBrief, selectedSite);
            setSeoScore({ score, checklist });
        }
        setBlogPost(updatedPost);
    };

    const handleAddNewSite = useCallback(() => {
        const defaultTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        const newSite: Site = {
            id: crypto.randomUUID(), name: `New Agency Site ${sites.length}`, wordpressUrl: '', wordpressUsername: '', applicationPassword: '',
            brandGuideline: '', keywordList: '', brandLogoLight: '', brandLogoDark: '', brandColors: '', brandFonts: '', characterReferences: [], promoLink1: '', promoLink2: '',
            googleSheetSources: [], rssSources: [], videoSources: [], references: [], monitoredBacklinks: [], authorName: '', authorId: undefined, availableAuthors: [], availableCategories: [], history: [], monthlyGenerationsCount: 0,
            isAutomationEnabled: false, automationTrigger: 'daily', automationDailyTime: '09:00', automationTimezone: defaultTimezone, lastAutoPilotRun: undefined, recurringSchedules: [],
            isAutoPublishEnabled: true, drafts: [], dailyGenerationSource: 'keyword', scheduleGenerationSource: 'keyword', isInPostImagesEnabled: false, numberOfInPostImages: 3,
            socialMediaSettings: { twitter: [], facebook: [], linkedin: [], instagram: [], pinterest: [], whatsapp: [], youtube: [], tiktok: [], telegram: [], snapchat: [], meta: [], meta_ads: [], google_ads: [] },
            mailchimpSettings: { apiKey: '', serverPrefix: '', defaultListId: '', isConnected: false }, googleAnalyticsSettings: { isConnected: false }, clarityProjectId: '',
            supabaseConnection: { url: '', anonKey: '', status: 'disconnected' }, paystackConnection: { publicKey: '', secretKey: '', status: 'disconnected' }, payfastConnection: { merchantId: '', merchantKey: '', passphrase: '', status: 'disconnected' }, wiseConnection: { apiKey: '', status: 'disconnected' },
            payoneerConnection: { partnerId: '', programId: '', apiKey: '', status: 'disconnected' },
            stripeConnection: { publicKey: '', secretKey: '', status: 'disconnected' },
            payPalConnection: { clientId: '', clientSecret: '', status: 'disconnected' },
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

    const handleOpenDeleteDialog = useCallback(() => {
        if (sites.length <= 1) { setError("You cannot delete the last remaining site in the agency portal."); return; }
        setIsDeleteDialogOpen(true);
        setDeleteConfirmationInput('');
    }, [sites.length, setError]);

    const handleDeleteSite = useCallback(() => {
        if (selectedSite && deleteConfirmationInput === selectedSite.name) {
            setSites(prevSites => {
                const remainingSites = prevSites.filter(s => s.id !== selectedSite.id);
                setSelectedSiteId(remainingSites[0]?.id || null);
                return remainingSites;
            });
            setIsDeleteDialogOpen(false);
        } else {
            setError("Confirmation text does not match the site name.");
        }
    }, [selectedSite, deleteConfirmationInput, setError]);
    
    const onRefreshAnalytics = async () => { toast.addToast('Not implemented in Agency Portal', 'info'); };
    const onRefreshClarityData = async () => { toast.addToast('Not implemented in Agency Portal', 'info'); };
    const handleConnectSocialMedia = () => { toast.addToast('Not implemented in Agency Portal', 'info'); };
    const handleVerifySocialMediaConnection = () => { toast.addToast('Not implemented in Agency Portal', 'info'); };
    const handleVerifyCredentialBasedConnection = () => { toast.addToast('Not implemented in Agency Portal', 'info'); };
    const handleVerifyMailchimp = async () => { toast.addToast('Not implemented in Agency Portal', 'info'); };
    const handleVerifyClarity = async () => { toast.addToast('Not implemented in Agency Portal', 'info'); };
    const handleVerifySupabase = async () => { toast.addToast('Not implemented in Agency Portal', 'info'); };
    
    const handleVerifyPaystack = useCallback(async (c: PaystackConnection) => { if (!selectedSite) return; try { const { success, message } = await verifyPaystackConnection(c); handleSiteUpdate('paystackConnection', { ...c, status: success ? 'connected' : 'error', statusMessage: message }); } catch (e: any) { setError(e.message); }}, [selectedSite, handleSiteUpdate, setError]);
    const handleVerifyPayfast = useCallback(async (c: PayfastConnection) => { if (!selectedSite) return; try { const { success, message } = await verifyPayfastConnection(c); handleSiteUpdate('payfastConnection', { ...c, status: success ? 'connected' : 'error', statusMessage: message }); } catch (e: any) { setError(e.message); }}, [selectedSite, handleSiteUpdate, setError]);
    const handleVerifyWise = useCallback(async (c: WiseConnection) => { if (!selectedSite) return; try { const { success, message } = await verifyWiseConnection(c); handleSiteUpdate('wiseConnection', { ...c, status: success ? 'connected' : 'error', statusMessage: message }); } catch (e: any) { setError(e.message); }}, [selectedSite, handleSiteUpdate, setError]);
    const handleVerifyPayoneer = async (c: PayoneerConnection) => { toast.addToast('Not implemented in Agency Portal', 'info'); };
    const handleVerifyStripe = async (c: StripeConnection) => { toast.addToast('Not implemented in Agency Portal', 'info'); };
    const handleVerifyPayPal = async (c: PayPalConnection) => { toast.addToast('Not implemented in Agency Portal', 'info'); };

    if (isInitializing) return <div className="flex flex-col items-center justify-center p-12 text-center"><svg className="animate-spin h-10 w-10 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><h3 className="mt-4 text-lg font-semibold text-main">Calibrating Promotional Matrix...</h3><p className="text-sm text-text-secondary mt-1">{initMessage}</p></div>;
    if (!selectedSite) return <div className="p-8 text-center text-text-secondary">Loading Agency Portal...</div>;
    
    if (isLoading || status >= AppStatus.READY_TO_PUBLISH) {
        if (status === AppStatus.PUBLISHED) return <PublishSuccessViewer publishedPostUrl={publishedPostUrl} socialPosts={lastGeneratedSocialPosts} site={selectedSite} onReset={resetGeneration} onConnect={handleConnectSocialMedia as any} isConnectingSocial={isConnectingSocial} />;
        if (status >= AppStatus.READY_TO_PUBLISH && blogPost) return <ArticleViewer blogPost={blogPost} seoScore={seoScore} status={status} statusMessage={statusMessage} onPublish={handlePublish} onCancel={resetGeneration} site={selectedSite} onUpdate={handleBlogPostUpdate} originalArticleForDiff={originalArticleForDiff} refreshedArticleForDiff={refreshedArticleForDiff} />;
        return <div className="text-center p-8"><svg className="animate-spin h-10 w-10 text-blue-400 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><p className="mt-4 text-main font-semibold">{statusMessage || "Loading..."}</p></div>;
    }
    
    const portalTabs = [ { id: 'agent', label: 'Agency Agent', icon: SparklesIcon }, { id: 'content', label: 'Content Hub', icon: DocumentTextIcon }, { id: 'automation', label: 'Automation', icon: ClockIcon }, { id: 'branding', label: 'Branding', icon: SparklesIcon }, { id: 'connections', label: 'Connections', icon: LinkIcon }, { id: 'api-spend', label: 'API & Spend', icon: KeyIcon }, { id: 'settings', label: 'Settings', icon: WordPressIcon } ];

    return (
        <div className="space-y-6">
             {isDeleteDialogOpen && selectedSite && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-panel rounded-lg shadow-2xl w-full max-w-md p-6 border border-red-500/50 animate-modal-pop">
                        <div className="flex items-start gap-4">
                            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-900/50 sm:mx-0 sm:h-10 sm:w-10"><ExclamationTriangleIcon className="h-6 w-6 text-red-400" /></div>
                            <div className="mt-0 text-left flex-1">
                                <h3 className="text-lg font-bold text-main">Delete Site</h3>
                                <div className="text-sm text-text-secondary mt-2">
                                    <p>This will permanently delete the site <strong className="text-red-300">{selectedSite.name}</strong> and all its associated data, including:</p>
                                    <ul className="list-disc list-inside my-2 space-y-1 text-red-300/80">
                                        <li>All content history and drafts</li>
                                        <li>All automation schedules and sources</li>
                                        <li>All connection credentials and API keys</li>
                                    </ul>
                                    <p>This action is irreversible. To proceed, please type the site name below.</p>
                                </div>
                                <p className="text-sm text-text-secondary mt-4">Type <strong className="text-red-300 font-mono">{selectedSite.name}</strong> to confirm.</p>
                                <input type="text" value={deleteConfirmationInput} onChange={e => setDeleteConfirmationInput(e.target.value)} className="input-base mt-2 px-3 py-2" />
                            </div>
                        </div>
                        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
                            <button type="button" className="w-full btn bg-red-600 hover:bg-red-700 text-white sm:w-auto disabled:opacity-50" onClick={handleDeleteSite} disabled={deleteConfirmationInput !== selectedSite.name}>Delete</button>
                            <button type="button" className="mt-3 w-full btn btn-secondary sm:mt-0 sm:w-auto" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex-1">
                    <h2 className="text-2xl font-bold text-main">Zenith Engine Agency Workspace</h2>
                    <p className="text-text-secondary mt-1">Manage your internal and client-facing content strategies.</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <select value={selectedSiteId || ''} onChange={(e) => setSelectedSiteId(e.target.value)} className="input-base px-3 py-2 text-sm w-full truncate flex-1">
                        {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    {selectedSite && (
                        <div className="relative group flex-shrink-0">
                            <button
                                onClick={() => setActiveTab('automation')}
                                className="relative w-9 h-9 rounded-lg bg-gray-950/50 border border-gray-700 hover:border-blue-500 hover:bg-gray-800 transition-colors flex items-center justify-center"
                                aria-label="Automation Status"
                            >
                                <div className="relative flex h-4 w-4">
                                    {isAnyAutomationReady && (
                                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75`}></span>
                                    )}
                                    <span className={`relative inline-flex rounded-full h-full w-full ${automationStatusColor}`}></span>
                                </div>
                            </button>
                            <div className="absolute right-0 top-full mt-2 w-max bg-gray-900 p-3 rounded-lg border border-gray-700 text-sm text-gray-300 shadow-lg opacity-0 invisible group-hover:visible group-hover:opacity-100 transition-all pointer-events-none z-40">
                                <h4 className="font-bold text-white mb-2 text-base">Automation Status</h4>
                                <ul className="space-y-2">
                                    {[
                                        { label: 'Blog Posts', enabled: selectedSite.isAutomationEnabled, ready: automationReadiness.blog },
                                        { label: 'Social Graphics', enabled: selectedSite.isSocialGraphicAutomationEnabled, ready: automationReadiness.socialGraphic },
                                        { label: 'Social Videos', enabled: selectedSite.isSocialVideoAutomationEnabled, ready: automationReadiness.socialVideo },
                                        { label: 'Email Marketing', enabled: selectedSite.isEmailMarketingAutomationEnabled, ready: automationReadiness.email },
                                        { label: 'Live Production', enabled: selectedSite.liveBroadcastAutomation?.isEnabled, ready: automationReadiness.liveProduction },
                                    ].map(item => {
                                        let color = 'bg-gray-500';
                                        let statusText = 'Disabled';
                                        if (item.enabled) {
                                            color = item.ready ? 'bg-green-500' : 'bg-yellow-500';
                                            statusText = item.ready ? 'Ready' : 'Misconfigured';
                                        }
                                        return (
                                            <li key={item.label} className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <span className={`w-2.5 h-2.5 rounded-full ${color}`}></span>
                                                    <span className="text-sm text-text-primary">{item.label}</span>
                                                </div>
                                                <span className="text-xs text-text-secondary font-medium">{statusText}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>
                    )}
                    <button onClick={handleAddNewSite} className="btn btn-secondary text-sm flex-shrink-0">+ New Site</button>
                </div>
            </header>
            <div className="border-b border-border"><nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Portal Tabs">{portalTabs.map(tab => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`${activeTab === tab.id ? 'border-blue-500 text-blue-400' : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-500'} flex items-center gap-2 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}><tab.icon className="h-5 w-5" /> {tab.label}</button>))}</nav></div>
            {error && (<div className="bg-red-900/50 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg flex justify-between items-center animate-fade-in"><p className="text-sm">{error}</p><button onClick={() => setError(null)} className="p-1 -mr-1 rounded-full hover:bg-red-800/50"><XIcon className="h-5 w-5" /></button></div>)}
            <div className="animate-fade-in">
                {activeTab === 'agent' && <AgencyAgentDashboard site={selectedSite} onUpdate={handleSiteUpdate} logApiUsage={logApiUsage} setError={setError} />}
                {activeTab === 'content' && <ContentHubTab site={selectedSite} onSiteUpdate={handleSiteUpdate} onMultipleSiteUpdates={handleMultipleSiteUpdates} onGenerateAndScore={generateAndScorePost} setActiveTab={setActiveTab} setError={setError} logApiUsage={logApiUsage} onReviewDraft={handleReviewDraft} onDiscardDraft={onDiscardDraft} onViewHistory={setViewingHistoryItem} onRefreshArticle={onRefreshArticle} onRefreshAnalytics={onRefreshAnalytics} onRefreshClarityData={onRefreshClarityData} initialSubTab={null} isAgencyContext={true} />}
                {activeTab === 'automation' && <AutomationDashboard site={selectedSite} onSiteUpdate={handleSiteUpdate} onMultipleSiteUpdates={handleMultipleSiteUpdates} setActiveTab={setActiveTab} planAccess={agencyPlanAccess} isAgencyContext={true} />}
                {activeTab === 'branding' && <BrandingTab site={selectedSite} onSiteUpdate={handleSiteUpdate} onMultipleSiteUpdates={handleMultipleSiteUpdates} logApiUsage={logApiUsage} setError={setError} setActiveTab={setActiveTab} />}
                {activeTab === 'connections' && <ConnectionsTab site={selectedSite} onSiteUpdate={handleSiteUpdate} onMultipleSiteUpdates={handleMultipleSiteUpdates} isConnectingSocial={isConnectingSocial} setError={setError} onConnect={handleConnectSocialMedia as any} onVerify={handleVerifySocialMediaConnection} onVerifyCredentials={handleVerifyCredentialBasedConnection} setActiveTab={setActiveTab} onVerifyMailchimp={handleVerifyMailchimp} onVerifyClarity={handleVerifyClarity} onVerifySupabase={handleVerifySupabase} onVerifyPaystack={handleVerifyPaystack} onVerifyPayfast={handleVerifyPayfast} onVerifyWise={handleVerifyWise} onVerifyPayoneer={handleVerifyPayoneer} onVerifyStripe={handleVerifyStripe} onVerifyPayPal={handleVerifyPayPal} logApiUsage={logApiUsage} />}
                {activeTab === 'api-spend' && <ApiSpendDashboard site={selectedSite} sites={sites} onResetAllSitesSpend={() => {}} onSiteUpdate={handleSiteUpdate} currentUser={currentUser} />}
                {activeTab === 'settings' && <SettingsTab site={selectedSite} onSiteUpdate={handleSiteUpdate} onMultipleSiteUpdates={handleMultipleSiteUpdates} onOpenDeleteDialog={handleOpenDeleteDialog} setActiveTab={setActiveTab} />}
            </div>
        </div>
    );
};
