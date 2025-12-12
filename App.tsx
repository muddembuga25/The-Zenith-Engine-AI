
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { AppStatus, AiProvider, SubscriptionPlan, AutomationWorkflow } from './types';
import { AVAILABLE_MODELS } from './types';
import type { BlogPost, Site, RssItem, PostHistoryItem, ApiKeys, SocialMediaPost, SocialMediaSettings, Draft, WhatsAppAccount, TelegramAccount, SocialMediaAccount, StrategicBrief, SeoChecklist, RssSource, GoogleSheetSource, CharacterReference, MailchimpSettings, ModelConfig, GoogleAnalyticsSettings, User, MetaConnection, SupabaseConnection, MetaAsset, SocialAccountStatus, MetaAdsConnection, GoogleAdsConnection, PaystackConnection, PayfastConnection, WiseConnection, LiveBroadcastAutomation, GoogleCalendarConnection, PayoneerConnection, StripeConnection, PayPalConnection } from './types';
import { 
    generateStrategicBriefFromKeyword, generateArticleFromBrief, generateFeaturedImage, generateSocialMediaPosts, 
    generateSocialGraphicAndCaption, generateSocialVideoAndCaption, correctSeoIssues, discoverAndSelectBestKeyword, 
    suggestKeywords, postProcessArticleLinks, generateEmailCampaign, processGalleryImagesInHtml, selectImageFromGallery, 
    editImageFromGallery, _applyLogoToImage, processNewInPostImages, generateRefreshedArticleFromUrl 
} from './services/aiService';
import { publishPost, verifyWordPressConnection } from './services/wordpressService';
import { calculateSeoScore } from './services/seoService';
import * as oauthService from './services/oauthService';
import * as googleAnalyticsService from './services/googleAnalyticsService';
import * as googleCalendarService from './services/googleCalendarService';
import * as clarityService from './services/clarityService';
import { verifySupabaseConnection } from './services/dbService';
import { verifyPaystackConnection } from './services/paystackService';
import { verifyPayfastConnection } from './services/payfastService';
import { verifyWiseConnection } from './services/wiseService';
import { verifyPayoneerConnection } from './services/payoneerService';
import { verifyStripeConnection } from './services/stripeService';
import { verifyPayPalConnection } from './services/paypalService';
import { fetchAndParseRssFeed } from './services/rssService';
import { fetchSheetData } from './services/googleSheetService';
import * as socialMediaService from './services/socialMediaService';
import { getEnabledDestinations } from './services/socialMediaService';
import * as mailchimpService from './services/mailchimpService';
import { storageService } from './services/storageService';
import * as authService from './services/authService';
import { useToast } from './hooks/useToast';
import { 
    LogoIcon, CheckCircleIcon, ExclamationTriangleIcon, Cog6ToothIcon, ClockIcon, MenuIcon, XIcon, PenIcon, HomeIcon, 
    ScaleIcon, SparklesIcon, PhotoIcon, VideoCameraIcon, DocumentTextIcon, ShareIcon, LightbulbIcon, LinkIcon, 
    ChartBarIcon, QuestionMarkCircleIcon, SignOutIcon, UserIcon, CreditCardIcon, LockClosedIcon, WordPressIcon, 
    KeyIcon, BuildingOffice2Icon 
} from './components/Icons';
import { HistoryDetailViewer } from './components/HistoryDetailViewer';
import { AutomationDashboard } from './components/AutomationDashboard';
import { ArticleViewer } from './components/ArticleViewer';
import { SettingsTab } from './components/SettingsTab';
import { PublishSuccessViewer } from './components/PublishSuccessViewer';
import { DashboardTab } from './components/DashboardTab';
import { ContentHubTab } from './components/ContentHubTab';
import { GlobalAutomationTracker, AutomationJob } from './components/GlobalAutomationTracker';
import { AssistantUI } from './components/AssistantUI';
import { AuthorityTab } from './components/AuthorityTab';
import { ApiManagementTab } from './components/ApiManagementTab';
import { BrandingTab } from './components/BrandingTab';
import { ConnectionsTab } from './components/ConnectionsTab';
import { HelpGuide } from './components/HelpGuide';
import { AuthPage } from './components/AuthPage';
import { AdminDashboard } from './components/AdminDashboard';
import { ApiSpendDashboard } from './components/ApiSpendDashboard';
import { SubscriptionPage } from './components/SubscriptionPage';
import { UpgradePlan } from './components/UpgradePlan';
import { ProfileModal } from './components/ProfileModal';
import { AdvertisingTab } from './components/AdvertisingTab';
import { OnboardingWizard } from './components/OnboardingWizard';
import { checkAutomationReadiness } from './utils/automationReadiness';
import { isBackendConfigured } from './services/supabaseClient';
import { Layout } from './components/Layout';


const providerDisplayNames: Record<AiProvider, string> = {
  [AiProvider.GOOGLE]: 'Google',
  [AiProvider.OPENAI]: 'OpenAI',
  [AiProvider.OPENROUTER]: 'OpenRouter',
  [AiProvider.ANTHROPIC]: 'Anthropic',
  [AiProvider.XAI]: 'X.AI Grok',
  [AiProvider.REPLICATE]: 'Replicate',
  [AiProvider.OPENART]: 'OpenArt AI',
};

const APP_TITLE = 'Zenith Engine AI';

const planPillClasses: Record<string, string> = {
    creator: 'bg-cyan-400/10 text-cyan-300 border border-cyan-400/60 shadow-[0_0_8px_theme(colors.cyan.400/30)]',
    pro: 'bg-purple-400/10 text-purple-300 border border-purple-400/60 shadow-[0_0_8px_theme(colors.purple.400/30)]',
    agency: 'bg-yellow-400/10 text-yellow-300 border border-yellow-400/60 shadow-[0_0_8px_theme(colors.yellow.400/30)]',
};

interface ActiveComponentProps {
    status: AppStatus;
    blogPost: BlogPost | null;
    publishedPostUrl: string | null;
    lastGeneratedSocialPosts: Record<string, SocialMediaPost> | null;
    site: Site;
    sites: Site[];
    resetGeneration: () => void;
    handleConnectSocialMedia: (platform: keyof Omit<SocialMediaSettings, 'whatsapp' | 'telegram' | 'metaClientId' | 'metaClientSecret' | 'metaAdsClientId' | 'metaAdsClientSecret' | 'googleAdsClientId' | 'googleAdsClientSecret' | 'googleCalendarClientId' | 'googleCalendarClientSecret' | 'googleAuthClientId' | 'googleAuthClientSecret'> | 'google_analytics' | 'google_calendar', accountId: string) => void;
    isConnectingSocial: string | null;
    handleBlogPostUpdate: (updatedPost: BlogPost) => void;
    seoScore: any | null;
    statusMessage: string;
    handlePublish: () => void;
    isLoading: boolean;
    activeTab: string;
    activeSubTab: AutomationWorkflow | string | null;
    setActiveTab: (tab: string, subTab?: string | null) => void;
    generateAndScorePost: (topicToTrack: string, generationSource: 'keyword' | 'rss' | 'video' | 'google_sheet' | 'agency_agent', sourceDetails: any, site: Site) => Promise<void>;
    handleReviewDraft: (draftId: string) => void;
    handleSiteUpdate: (field: keyof Site, value: any) => void;
    handleMultipleSiteUpdates: (updates: Partial<Site>) => void;
    setViewingHistoryItem: (item: PostHistoryItem | null) => void;
    logApiUsage: (provider: keyof ApiKeys, cost: number) => void;
    handleResetAllSitesSpend: () => void;
    handleOpenDeleteDialog: () => void;
    handleVerifySocialMediaConnection: (platformId: oauthService.SocialPlatform, accountId: string, accessToken: string) => void;
    handleVerifyCredentialBasedConnection: (platformId: 'whatsapp' | 'telegram', account: WhatsAppAccount | TelegramAccount) => void;
    onDiscardDraft: (draftId: string) => void;
    onRefreshAnalytics: () => Promise<void>;
    onRefreshClarityData: () => Promise<void>;
    currentUser: User;
    handleUpdatePlan: (plan: SubscriptionPlan, cycle?: 'monthly' | 'yearly') => Promise<void>;
    planAccess: any; // Add planAccess here
    onRefreshArticle: (url: string, site: Site) => Promise<void>;
    originalArticleForDiff: string | null;
    refreshedArticleForDiff: BlogPost | null;
    handleVerifyMailchimp: (settings: MailchimpSettings) => Promise<void>;
    handleVerifyClarity: (projectId: string) => Promise<void>;
    handleVerifySupabase: (connection: SupabaseConnection) => Promise<void>;
    handleVerifyPaystack: (connection: PaystackConnection) => Promise<void>;
    handleVerifyPayfast: (connection: PayfastConnection) => Promise<void>;
    handleVerifyWise: (connection: WiseConnection) => Promise<void>;
    handleVerifyPayoneer: (connection: PayoneerConnection) => Promise<void>;
    handleVerifyStripe: (connection: StripeConnection) => Promise<void>;
    handleVerifyPayPal: (connection: PayPalConnection) => Promise<void>;
}

const ActiveComponent: React.FC<ActiveComponentProps> = ({
    status, blogPost, publishedPostUrl, lastGeneratedSocialPosts, site, sites,
    resetGeneration, handleConnectSocialMedia, isConnectingSocial, handleBlogPostUpdate,
    seoScore, statusMessage, handlePublish, isLoading, activeTab, activeSubTab,
    setActiveTab, generateAndScorePost, handleReviewDraft, handleSiteUpdate,
    handleMultipleSiteUpdates, setViewingHistoryItem, logApiUsage, handleResetAllSitesSpend,
    handleOpenDeleteDialog, handleVerifySocialMediaConnection, handleVerifyCredentialBasedConnection,
    onDiscardDraft, onRefreshAnalytics, onRefreshClarityData, currentUser, handleUpdatePlan, planAccess,
    onRefreshArticle, originalArticleForDiff, refreshedArticleForDiff, handleVerifyMailchimp,
    handleVerifyClarity, handleVerifySupabase, handleVerifyPaystack, handleVerifyPayfast, handleVerifyWise,
    handleVerifyPayoneer, handleVerifyStripe, handleVerifyPayPal
}) => {
    if (status >= AppStatus.READY_TO_PUBLISH && blogPost) {
        if (status === AppStatus.PUBLISHED) {
            return <PublishSuccessViewer publishedPostUrl={publishedPostUrl} socialPosts={lastGeneratedSocialPosts} site={site} onReset={resetGeneration} onConnect={handleConnectSocialMedia as any} isConnectingSocial={isConnectingSocial} />
        }
        return <ArticleViewer blogPost={blogPost} seoScore={seoScore} status={status} statusMessage={statusMessage} onPublish={handlePublish} onCancel={resetGeneration} site={site} onUpdate={handleBlogPostUpdate} originalArticleForDiff={originalArticleForDiff} refreshedArticleForDiff={refreshedArticleForDiff} />;
    }

    if (isLoading) {
      const messages = [
        "Discovering high-intent keywords...",
        "Analyzing GEO landscape...",
        "Crafting a unique content angle...",
        "Drafting authoritative content...",
        "Generating a unique featured image...",
        "Performing Self-Correction GEO Loop...",
        "Finalizing schema markup and metadata...",
      ];
      const messageIndex = Math.min(status - 1, messages.length - 1);

      return (
        <div className="text-center" role="status" aria-live="polite">
            <svg className="animate-spin h-12 w-12 text-blue-400 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <h2 className="text-xl font-bold mt-6 text-white">{statusMessage}</h2>
            <p className="text-text-secondary mt-2">{messages[messageIndex]}</p>
        </div>
      );
    }
    
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab site={site} sites={sites} setActiveTab={setActiveTab} onGenerate={generateAndScorePost} onReviewDraft={handleReviewDraft} currentUser={currentUser} />;
      case 'content':
        return <ContentHubTab 
                    site={site} 
                    onSiteUpdate={handleSiteUpdate} 
                    onMultipleSiteUpdates={handleMultipleSiteUpdates} 
                    onGenerateAndScore={generateAndScorePost} 
                    onReviewDraft={handleReviewDraft}
                    onDiscardDraft={onDiscardDraft}
                    onViewHistory={setViewingHistoryItem}
                    setActiveTab={setActiveTab}
                    logApiUsage={logApiUsage}
                    initialSubTab={activeSubTab}
                    onRefreshAnalytics={onRefreshAnalytics}
                    onRefreshClarityData={onRefreshClarityData}
                    onRefreshArticle={onRefreshArticle}
                />;
      case 'authority':
        if (!planAccess.canUseAuthority) return <UpgradePlan featureName="The Authority Suite" requiredPlan="Pro" setActiveTab={setActiveTab} />;
        return <AuthorityTab site={site} onSiteUpdate={handleSiteUpdate} logApiUsage={logApiUsage} setError={(e) => {}} />;
      case 'automation':
        if (!planAccess.canUseBlogAutomation) return <UpgradePlan featureName="Content Automation" requiredPlan="Creator" setActiveTab={setActiveTab} />;
        return <AutomationDashboard 
                    site={site} 
                    onSiteUpdate={handleSiteUpdate} 
                    onMultipleSiteUpdates={handleMultipleSiteUpdates} 
                    setActiveTab={setActiveTab} 
                    planAccess={planAccess} 
                    initialSubTab={activeSubTab}
                />;
      case 'advertising':
        if (!planAccess.canUseAdvertising) return <UpgradePlan featureName="Advertising Dashboard" requiredPlan="Pro" setActiveTab={setActiveTab} />;
        return <AdvertisingTab site={site} setActiveTab={setActiveTab} />;
      case 'branding':
        return <BrandingTab 
                    site={site} 
                    onSiteUpdate={handleSiteUpdate}
                    onMultipleSiteUpdates={handleMultipleSiteUpdates}
                    logApiUsage={logApiUsage}
                    setActiveTab={setActiveTab}
                    setError={(e) => {}}
                />;
      case 'connections':
        return <ConnectionsTab
                    site={site}
                    onSiteUpdate={handleSiteUpdate}
                    onMultipleSiteUpdates={handleMultipleSiteUpdates}
                    isConnectingSocial={isConnectingSocial}
                    onConnect={handleConnectSocialMedia}
                    onVerify={handleVerifySocialMediaConnection}
                    onVerifyCredentials={handleVerifyCredentialBasedConnection}
                    onVerifyMailchimp={handleVerifyMailchimp}
                    onVerifyClarity={handleVerifyClarity}
                    onVerifySupabase={handleVerifySupabase}
                    onVerifyPaystack={handleVerifyPaystack}
                    onVerifyPayfast={handleVerifyPayfast}
                    onVerifyWise={handleVerifyWise}
                    onVerifyPayoneer={handleVerifyPayoneer}
                    onVerifyStripe={handleVerifyStripe}
                    onVerifyPayPal={handleVerifyPayPal}
                    setActiveTab={setActiveTab}
                    logApiUsage={logApiUsage}
                    setError={(e) => {}}
                />;
      case 'analytics':
        if (!planAccess.canUseAnalytics) return <UpgradePlan featureName="Analytics & Monitoring" requiredPlan="Creator" setActiveTab={setActiveTab} />;
        return <ApiManagementTab
                    site={site}
                    setActiveTab={setActiveTab}
                    onSiteUpdate={handleSiteUpdate}
                    logApiUsage={logApiUsage}
                />;
      case 'api-spend':
        return <ApiSpendDashboard
                    site={site}
                    sites={sites}
                    onResetAllSitesSpend={handleResetAllSitesSpend}
                    onSiteUpdate={handleSiteUpdate}
                    currentUser={currentUser}
                    setError={(e) => {}}
                />;
      case 'subscription':
        return <SubscriptionPage currentUser={currentUser} onUpdatePlan={handleUpdatePlan} />;
      case 'settings':
        return <SettingsTab 
                    site={site} 
                    onSiteUpdate={handleSiteUpdate} 
                    onMultipleSiteUpdates={handleMultipleSiteUpdates} 
                    onOpenDeleteDialog={handleOpenDeleteDialog}
                    setActiveTab={setActiveTab}
                />;
      default:
        return <div>Tab not found</div>;
    }
};


export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [blogPost, setBlogPost] = useState<BlogPost | null>(null);
  const [strategicBrief, setStrategicBrief] = useState<StrategicBrief | null>(null);
  const toast = useToast();
  const [publishedPostUrl, setPublishedPostUrl] = useState<string | null>(null);
  const [currentTopic, setCurrentTopic] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimeoutRef = useRef<number | null>(null);
  const isInitialMount = useRef(true);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [seoScore, setSeoScore] = useState<any | null>(null);
  const [viewingHistoryItem, setViewingHistoryItem] = useState<PostHistoryItem | null>(null);
  const [isConnectingSocial, setIsConnectingSocial] = useState<string | null>(null);
  const [currentGenerationSource, setCurrentGenerationSource] = useState<PostHistoryItem['type'] | null>(null);
  const [currentSourceDetails, setCurrentSourceDetails] = useState<any>(null);
  const [lastGeneratedSocialPosts, setLastGeneratedSocialPosts] = useState<Record<string, SocialMediaPost> | null>(null);
  const [reviewingDraft, setReviewingDraft] = useState<Draft | null>(null);
  const [isHelpGuideOpen, setIsHelpGuideOpen] = useState(false);
  const [impersonatingUser, setImpersonatingUser] = useState<User | null>(null);
  const [originalArticleForDiff, setOriginalArticleForDiff] = useState<string | null>(null);
  const [refreshedArticleForDiff, setRefreshedArticleForDiff] = useState<BlogPost | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [isTrackerModalOpen, setIsTrackerModalOpen] = useState(false);
  
  const [activeTab, setActiveTabState] = useState('dashboard');
  const [activeSubTab, setActiveSubTab] = useState<AutomationWorkflow | string | null>(null);
  const [isTrialBannerVisible, setIsTrialBannerVisible] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const isLoading = status > AppStatus.IDLE && status < AppStatus.READY_TO_PUBLISH;

  const selectedSite = sites.find(s => s.id === selectedSiteId);

  // --------------------------------------------------------------------------------
  // 1. Core Functions Declarations (Must be before usage)
  // --------------------------------------------------------------------------------

  // resetGeneration: Clears the current generation state
  const resetGeneration = useCallback(() => {
    setStatus(AppStatus.IDLE);
    setBlogPost(null);
    setStrategicBrief(null);
    setPublishedPostUrl(null);
    setCurrentTopic('');
    setSeoScore(null);
    setStatusMessage('');
    setLastGeneratedSocialPosts(null);
    setOriginalArticleForDiff(null);
    setRefreshedArticleForDiff(null);
  }, []);

  // handleSiteUpdate: Updates a single field on the selected site
  const handleSiteUpdate = useCallback((field: keyof Site, value: any) => {
      setSites(prevSites => prevSites.map(s => s.id === selectedSiteId ? { ...s, [field]: value } : s));
  }, [selectedSiteId]);

  // handleMultipleSiteUpdates: Updates multiple fields on the selected site
  const handleMultipleSiteUpdates = useCallback((updates: Partial<Site>) => {
      setSites(prevSites => prevSites.map(s => s.id === selectedSiteId ? { ...s, ...updates } : s));
  }, [selectedSiteId]);

  // logApiUsage: Tracks API costs
  const logApiUsage = useCallback((provider: keyof ApiKeys, cost: number) => {
      if (!selectedSiteId) return;
      setSites(prevSites => prevSites.map(s => s.id === selectedSiteId ? { 
          ...s, 
          apiUsage: { ...(s.apiUsage || {}), [provider]: (s.apiUsage?.[provider] || 0) + cost } 
      } : s));
  }, [selectedSiteId]);

  const handleResetAllSitesSpend = useCallback(() => {
      setSites(prevSites => prevSites.map(s => ({ ...s, apiUsage: {} })));
  }, []);

  const handleOpenDeleteDialog = useCallback(() => {
      setIsDeleteDialogOpen(true);
      setDeleteConfirmationInput('');
  }, []);

  const handleAddNewSite = useCallback(() => {
      const defaultTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
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
      setIsOnboarding(false);
  }, [sites.length]);

  const setActiveTab = (tab: string, subTab: string | null = null) => {
      setActiveTabState(tab);
      setActiveSubTab(subTab);
      if (!subTab) {
          setActiveSubTab(null);
      }
      setIsSidebarOpen(false);
  };

  const handleReviewDraft = useCallback((draftId: string) => {
      if (!selectedSite) return;
      const draft = selectedSite.drafts.find(d => d.id === draftId);
      if (draft) {
          setReviewingDraft(draft);
          setBlogPost(draft.blogPost);
          setStrategicBrief(draft.strategicBrief);
          setStatus(AppStatus.READY_TO_PUBLISH);
          setActiveTab('content', 'blog'); 
      }
  }, [selectedSite]);

  const onDiscardDraft = useCallback((draftId: string) => {
      if (window.confirm("Are you sure you want to discard this draft? This cannot be undone.")) {
          handleSiteUpdate('drafts', selectedSite?.drafts.filter(d => d.id !== draftId) || []);
      }
  }, [selectedSite, handleSiteUpdate]);

  // Theme initialization
  useEffect(() => {
    const storedTheme = localStorage.getItem('zenith-theme') as 'dark' | 'light' | null;
    if (storedTheme) {
        setTheme(storedTheme);
        if (storedTheme === 'light') document.documentElement.classList.add('light');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('zenith-theme', newTheme);
    if (newTheme === 'light') document.documentElement.classList.add('light');
    else document.documentElement.classList.remove('light');
  };

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
  
  const trialDaysLeft = useMemo(() => {
    if (!currentUser?.trialEndsAt) return 0;
    const timeLeft = currentUser.trialEndsAt - Date.now();
    return Math.max(0, Math.ceil(timeLeft / (1000 * 60 * 60 * 24)));
  }, [currentUser]);

  const planAccess = useMemo(() => {
    const plan = currentUser?.subscriptionPlan || 'free';
    const planLevels: Record<SubscriptionPlan, number> = { free: 0, creator: 1, pro: 2, agency: 3 };
    const currentLevel = planLevels[plan];

    const generationLimits: Record<SubscriptionPlan, number> = {
        free: 2,
        creator: 50,
        pro: 200,
        agency: Infinity,
    };
    const siteLimits: Record<SubscriptionPlan, number> = {
        free: 1,
        creator: 1,
        pro: 10,
        agency: Infinity,
    };

    const monthlyGenerations = currentUser?.monthlyGenerations || { count: 0, resetDate: Date.now() };
    const limit = generationLimits[plan];
    const canGenerate = !!currentUser?.isAdmin || monthlyGenerations.count < limit;

    return {
        plan,
        canUseAnalytics: currentLevel >= planLevels.creator,
        canUseAuthority: currentLevel >= planLevels.pro,
        canUseAdvertising: currentLevel >= planLevels.pro,
        canUseAuthorityCommenting: currentLevel >= planLevels.pro,
        canUseAuthorityOutreach: currentLevel >= planLevels.agency,
        canUseBlogAutomation: currentLevel >= planLevels.free,
        canUseSocialAutomation: currentLevel >= planLevels.creator,
        canUseSocialGraphicsAutomation: currentLevel >= planLevels.creator,
        canUseSocialVideoAutomation: currentLevel >= planLevels.creator,
        canUseEmailMarketing: currentLevel >= planLevels.pro,
        canUseAdvancedBranding: currentLevel >= planLevels.creator,
        canUseCharacterPersonas: currentLevel >= planLevels.pro,
        canUseAdvancedConnections: currentLevel >= planLevels.creator,
        canUseMcp: currentLevel >= planLevels.agency,
        canUseDataForSeo: currentLevel >= planLevels.pro,
        canUseCustomModels: currentLevel >= planLevels.creator,
        canUseGoogleSheets: currentLevel >= planLevels.pro,
        canUseClientManagement: currentLevel >= planLevels.agency,
        canUseLiveProduction: currentLevel >= planLevels.pro,
        siteLimit: siteLimits[plan],
        generationLimit: limit,
        generationsUsed: monthlyGenerations.count,
        canGenerate,
    };
  }, [currentUser]);
  
  // --- AUTH & DATA LOADING ---
  const loadUserData = useCallback(async (user: User) => {
    try {
      const { sites: savedSites, lastSelectedId } = await storageService.loadSitesAndLastId(user);
      let finalSites: Site[] = [];
      
      const defaultApiKeys: ApiKeys = { google: '', openAI: '', anthropic: '', openRouter: '', xai: '', replicate: '', openArt: '', dataforseo: '' };
      const defaultModelConfig: ModelConfig = {
        textProvider: AiProvider.GOOGLE, textModel: AVAILABLE_MODELS.GOOGLE.text[0],
        imageProvider: AiProvider.GOOGLE, imageModel: AVAILABLE_MODELS.GOOGLE.image[0],
        videoProvider: AiProvider.GOOGLE, videoModel: AVAILABLE_MODELS.GOOGLE.video[0],
      };
      const defaultSocialSettings: SocialMediaSettings = { twitter: [], facebook: [], linkedin: [], instagram: [], pinterest: [], whatsapp: [], youtube: [], tiktok: [], telegram: [], snapchat: [], meta: [], meta_ads: [], google_ads: [] };
      const defaultMailchimpSettings: MailchimpSettings = { apiKey: '', serverPrefix: '', defaultListId: '', isConnected: false };
      const defaultAnalyticsSettings: GoogleAnalyticsSettings = { isConnected: false };
      const defaultApiUsage: any = { google: 0, openAI: 0, anthropic: 0, openRouter: 0, xai: 0, replicate: 0, openArt: 0, dataforseo: 0 };
      const defaultSupabaseConnection: SupabaseConnection = { url: '', anonKey: '', status: 'disconnected' };
      const defaultPaystackConnection: PaystackConnection = { publicKey: '', secretKey: '', status: 'disconnected' };
      const defaultPayfastConnection: PayfastConnection = { merchantId: '', merchantKey: '', passphrase: '', status: 'disconnected' };
      const defaultWiseConnection: WiseConnection = { apiKey: '', status: 'disconnected' };
      const defaultPayoneerConnection: PayoneerConnection = { partnerId: '', programId: '', apiKey: '', status: 'disconnected' };
      const defaultStripeConnection: StripeConnection = { publicKey: '', secretKey: '', status: 'disconnected' };
      const defaultPayPalConnection: PayPalConnection = { clientId: '', clientSecret: '', status: 'disconnected' };
      const defaultLiveBroadcast: LiveBroadcastAutomation = { isEnabled: false, sourceType: 'meta', facebookPageId: '', facebookPageUrl: '', youtubeChannelUrl: '', tiktokProfileUrl: '', xProfileUrl: '', scheduleType: 'monitor', broadcastDay: 0, broadcastStartTime: '10:00', broadcastEndTime: '12:00', dailyPostTimes: ['09:00', '17:00'], status: 'idle', currentWeekClips: [], youtubeSourceMethod: 'url', tiktokSourceMethod: 'url', xSourceMethod: 'url' };
      const socialPlatforms: (keyof Omit<SocialMediaSettings, 'metaClientId'|'metaClientSecret'|'metaAdsClientId'|'metaAdsClientSecret'|'googleAdsClientId'|'googleAdsClientSecret'|'googleCalendarClientId'|'googleCalendarClientSecret' | 'googleAuthClientId' | 'googleAuthClientSecret'>)[] = ['twitter', 'facebook', 'linkedin', 'instagram', 'pinterest', 'whatsapp', 'youtube', 'tiktok', 'telegram', 'snapchat', 'meta', 'meta_ads', 'google_ads'];
      const defaultTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

      if (savedSites) {
          finalSites = savedSites.map((site: any): Site => {
              // ... Migration logic ...
              const migratedModelConfig = { ...defaultModelConfig, ...(site.modelConfig || {}) };
              if (!site.apiKeys || !('dataforseo' in (site.apiKeys || {}))) {
                const oldConfig = site.modelConfig || {};
                const newApiKeys: ApiKeys = { ...defaultApiKeys, ...(site.apiKeys || {}) };
                if (oldConfig.apiKey) {
                    switch (oldConfig.provider) {
                        case AiProvider.OPENAI: newApiKeys.openAI = oldConfig.apiKey; break;
                        case AiProvider.ANTHROPIC: newApiKeys.anthropic = oldConfig.apiKey; break;
                        case AiProvider.OPENROUTER: newApiKeys.openRouter = oldConfig.apiKey; break;
                    }
                }
                migratedModelConfig.textProvider = oldConfig.provider || AiProvider.GOOGLE;
                migratedModelConfig.textModel = oldConfig.textModel || defaultModelConfig.textModel;
                migratedModelConfig.imageProvider = oldConfig.provider || AiProvider.GOOGLE;
                migratedModelConfig.imageModel = oldConfig.imageModel || defaultModelConfig.imageModel;
                if (migratedModelConfig.imageProvider === AiProvider.ANTHROPIC || migratedModelConfig.imageProvider === AiProvider.XAI) {
                    migratedModelConfig.imageProvider = AiProvider.GOOGLE;
                    migratedModelConfig.imageModel = defaultModelConfig.imageModel;
                }
                site.apiKeys = newApiKeys;
              }
              const generationSource = site.generationSource || 'keyword';
              let migratedSocialSettings = { ...defaultSocialSettings, ...(site.socialMediaSettings || {}) };
              let needsMigration = false;
              for (const platform of socialPlatforms) {
                  if (platform !== 'whatsapp' && platform !== 'telegram' && platform !== 'meta' && platform !== 'meta_ads' && platform !== 'google_ads' && migratedSocialSettings[platform] && !Array.isArray(migratedSocialSettings[platform])) {
                      needsMigration = true; break;
                  }
                  if (!migratedSocialSettings[platform]) { migratedSocialSettings[platform] = []; }
              }
              if(needsMigration) {
                  const newSocialSettings: any = { ...defaultSocialSettings };
                  for (const platform of socialPlatforms) {
                       if (platform === 'whatsapp' || platform === 'telegram' || platform === 'meta' || platform === 'meta_ads' || platform === 'google_ads') { newSocialSettings[platform] = migratedSocialSettings[platform] || []; continue; };
                      const platformSetting = migratedSocialSettings[platform];
                       if (platformSetting && typeof platformSetting === 'object' && !Array.isArray(platformSetting)) {
                            newSocialSettings[platform] = [{ id: crypto.randomUUID(), name: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Account`, isAutomationEnabled: platformSetting.isAutomationEnabled ?? false, isConnected: platformSetting.isConnected ?? false, accessToken: platformSetting.accessToken, clientId: platformSetting.clientId, clientSecret: platformSetting.clientSecret, }];
                       } else { newSocialSettings[platform] = platformSetting || []; }
                  }
                  migratedSocialSettings = newSocialSettings;
              }
              for (const platform of socialPlatforms) {
                  if (migratedSocialSettings[platform]) {
                    migratedSocialSettings[platform] = (migratedSocialSettings[platform] as any[]).map((acc: any) => ({ ...acc, status: acc.status || (acc.isConnected ? 'connected' : 'disconnected'), destinationType: acc.destinationType || (platform === 'facebook' ? 'page' : 'profile'), }));
                  }
              }
              let migratedHistory = site.history || [];
              migratedHistory = migratedHistory.map((item: any) => {
                  let newItem = { ...item };
                  if (newItem.type === 'Social Graphic' && newItem.imageUrl && !newItem.socialGraphics) { newItem.socialGraphics = { custom: { imageUrl: newItem.imageUrl, caption: newItem.caption || '' } }; delete newItem.imageUrl; delete newItem.caption; }
                  return newItem;
              });
              const liveBroadcastData = site.liveBroadcastAutomation || (site as any).sundayServiceAutomation || {};
              const migratedLiveBroadcast: LiveBroadcastAutomation = { ...defaultLiveBroadcast, ...liveBroadcastData };
              if ((liveBroadcastData as any).sourceType === 'url') { migratedLiveBroadcast.sourceType = 'facebook_url'; }
              migratedLiveBroadcast.facebookPageUrl = migratedLiveBroadcast.facebookPageUrl || (migratedLiveBroadcast as any).facebookLiveUrl || '';
              migratedLiveBroadcast.youtubeChannelUrl = migratedLiveBroadcast.youtubeChannelUrl || (migratedLiveBroadcast as any).youtubeLiveUrl || '';
              migratedLiveBroadcast.tiktokProfileUrl = migratedLiveBroadcast.tiktokProfileUrl || (migratedLiveBroadcast as any).tiktokLiveUrl || '';
              migratedLiveBroadcast.xProfileUrl = migratedLiveBroadcast.xProfileUrl || (migratedLiveBroadcast as any).xLiveUrl || (migratedLiveBroadcast as any).xComLiveUrl || '';
              if (!migratedLiveBroadcast.dailyPostTimes || migratedLiveBroadcast.dailyPostTimes.length === 0) { migratedLiveBroadcast.dailyPostTimes = ['09:00', '17:00']; }
              if (migratedLiveBroadcast.currentWeekClips?.some((c: any) => c.scheduledTime === 'AM' || c.scheduledTime === 'PM')) { migratedLiveBroadcast.currentWeekClips = []; }
              if (typeof migratedLiveBroadcast.lastRunTimestamp === 'undefined') { migratedLiveBroadcast.lastRunTimestamp = 0; }
              migratedLiveBroadcast.youtubeSourceMethod = migratedLiveBroadcast.youtubeSourceMethod || 'url';
              migratedLiveBroadcast.tiktokSourceMethod = migratedLiveBroadcast.tiktokSourceMethod || 'url';
              migratedLiveBroadcast.xSourceMethod = migratedLiveBroadcast.xSourceMethod || 'url';
              migratedLiveBroadcast.youtubeAccountId = migratedLiveBroadcast.youtubeAccountId || '';
              migratedLiveBroadcast.tiktokAccountId = migratedLiveBroadcast.tiktokAccountId || '';
              migratedLiveBroadcast.xAccountId = migratedLiveBroadcast.xAccountId || '';

              let newSite: Site = { 
                ...site, brandGuideline: site.brandGuideline || '', brandLogoLight: site.brandLogoLight || (site as any).brandLogo || '', brandLogoDark: site.brandLogoDark || '', brandColors: site.brandColors || '', brandFonts: site.brandFonts || '', characterReferences: site.characterReferences || [], authorName: site.authorName || site.wordpressUsername || 'Admin', authorId: site.authorId, availableAuthors: site.availableAuthors || [], availableCategories: site.availableCategories || [], isStrictCategoryMatching: site.isStrictCategoryMatching ?? false, scheduleGenerationSource: site.scheduleGenerationSource || generationSource, rssSources: site.rssSources || [], googleSheetSources: site.googleSheetSources || [], recurringSchedules: site.recurringSchedules || [], history: migratedHistory, monthlyGenerationsCount: site.monthlyGenerationsCount || 0, videoSources: site.videoSources || [], references: site.references || [], monitoredBacklinks: site.monitoredBacklinks || [], isAutomationEnabled: site.isAutomationEnabled ?? false, isAutoPublishEnabled: site.isAutoPublishEnabled ?? true, drafts: site.drafts || [], lastAutoPilotRun: site.lastAutoPilotRun, isInPostImagesEnabled: site.isInPostImagesEnabled ?? false, numberOfInPostImages: site.numberOfInPostImages ?? 3, socialMediaSettings: migratedSocialSettings, mailchimpSettings: site.mailchimpSettings || defaultMailchimpSettings, googleAnalyticsSettings: site.googleAnalyticsSettings || defaultAnalyticsSettings, clarityProjectId: site.clarityProjectId || '', supabaseConnection: site.supabaseConnection || defaultSupabaseConnection, paystackConnection: site.paystackConnection || defaultPaystackConnection, payfastConnection: site.payfastConnection || defaultPayfastConnection, wiseConnection: site.wiseConnection || defaultWiseConnection, payoneerConnection: site.payoneerConnection || defaultPayoneerConnection, stripeConnection: site.stripeConnection || defaultStripeConnection, payPalConnection: site.payPalConnection || defaultPayPalConnection, activePaymentGateway: site.activePaymentGateway, modelConfig: migratedModelConfig, apiKeys: site.apiKeys || defaultApiKeys, apiUsage: site.apiUsage || defaultApiUsage, fetchedModels: site.fetchedModels || {}, isAssistantEnabled: site.isAssistantEnabled ?? true, isVoiceControlEnabled: site.isVoiceControlEnabled ?? true, isVideoControlEnabled: site.isVideoControlEnabled ?? true, isTextControlEnabled: site.isTextControlEnabled ?? true,
                automationTrigger: site.automationTrigger === 'interval' ? 'daily' : (site.automationTrigger || 'daily'), automationDailyTime: site.automationDailyTime || '09:00', automationTimezone: site.automationTimezone || defaultTimezone, dailyGenerationSource: site.dailyGenerationSource || site.intervalGenerationSource || generationSource,
                isSocialGraphicAutomationEnabled: site.isSocialGraphicAutomationEnabled ?? false, isSocialGraphicAutoPublishEnabled: site.isSocialGraphicAutoPublishEnabled ?? true, socialGraphicAutomationTrigger: site.socialGraphicAutomationTrigger === 'interval' ? 'daily' : (site.socialGraphicAutomationTrigger || 'daily'), socialGraphicDailyTime: site.socialGraphicDailyTime || '14:00', lastSocialGraphicAutoPilotRun: site.lastSocialGraphicAutoPilotRun, socialGraphicRecurringSchedules: site.socialGraphicRecurringSchedules || [], socialGraphicGenerationSource: site.socialGraphicGenerationSource || 'keyword',
                isSocialVideoAutomationEnabled: site.isSocialVideoAutomationEnabled ?? false, isSocialVideoAutoPublishEnabled: site.isSocialVideoAutoPublishEnabled ?? true, socialVideoAutomationTrigger: site.socialVideoAutomationTrigger === 'interval' ? 'daily' : (site.socialVideoAutomationTrigger || 'daily'), socialVideoDailyTime: site.socialVideoDailyTime || '18:00', lastSocialVideoAutoPilotRun: site.lastSocialVideoAutoPilotRun, socialVideoRecurringSchedules: site.socialVideoRecurringSchedules || [], socialVideoGenerationSource: site.socialVideoGenerationSource || 'keyword',
                isEmailMarketingAutomationEnabled: site.isEmailMarketingAutomationEnabled ?? false, emailMarketingAutomationTrigger: site.emailMarketingAutomationTrigger || 'daily', emailMarketingDailyTime: site.emailMarketingDailyTime || '10:00', lastEmailMarketingAutoPilotRun: site.lastEmailMarketingAutoPilotRun, emailMarketingRecurringSchedules: site.emailMarketingRecurringSchedules || [], emailMarketingGenerationSource: site.emailMarketingGenerationSource || 'newly_published_post',
                seoDataProvider: site.seoDataProvider || 'google_search', isLocalSeoEnabled: site.isLocalSeoEnabled ?? false, localSeoServiceArea: site.localSeoServiceArea || '', localSeoBusinessName: site.localSeoBusinessName || '', localSeoPhoneNumber: site.localSeoPhoneNumber || '',
                isAgencyAgentEnabled: site.isAgencyAgentEnabled ?? false, agentCheckFrequencyHours: site.agentCheckFrequencyHours || 24, agentActionOnDiscovery: site.agentActionOnDiscovery || 'addToReviewList', agencyAgentLogs: site.agencyAgentLogs || [], agentScheduledPosts: site.agentScheduledPosts || [], lastAgentRun: site.lastAgentRun, liveBroadcastAutomation: migratedLiveBroadcast,
              };
              
              delete (newSite as any).automationIntervalHours; delete (newSite as any).intervalGenerationSource; delete (newSite as any).socialGraphicAutomationIntervalHours; delete (newSite as any).socialVideoAutomationIntervalHours; delete (newSite as any).brandLogo; delete (newSite as any).mcpServers; delete (newSite as any).mcpTextServerId; delete (newSite as any).mcpImageServerId; delete (newSite as any).mcpVideoServerId; delete (newSite as any).stripeConnection; delete (newSite as any).sundayServiceAutomation; delete (newSite.liveBroadcastAutomation as any)?.facebookLiveUrl; delete (newSite.liveBroadcastAutomation as any)?.youtubeLiveUrl; delete (newSite.liveBroadcastAutomation as any)?.tiktokLiveUrl; delete (newSite.liveBroadcastAutomation as any)?.xLiveUrl; delete (newSite.liveBroadcastAutomation as any)?.xComLiveUrl;

              if (site.rssFeedUrl && (!site.rssSources || site.rssSources.length === 0)) { newSite.rssSources = [{ id: crypto.randomUUID(), url: site.rssFeedUrl, name: site.rssFeedUrl, processedRssGuids: site.processedRssGuids || [] }]; }
              if (site.googleSheetUrl && (!site.googleSheetSources || site.googleSheetSources.length === 0)) { newSite.googleSheetSources = [{ id: crypto.randomUUID(), url: site.googleSheetUrl, name: site.googleSheetUrl, processedGoogleSheetRows: site.processedGoogleSheetRows || [] }]; }
              
              if ((newSite as any).generationSource) delete (newSite as any).generationSource;
              if (site.videoUrlList) newSite.videoSources = site.videoUrlList.split('\n').filter((url: string) => url.trim()).map((url: string) => ({ id: crypto.randomUUID(), url: url.trim(), type: 'video', name: url.trim().replace(/^\[DONE\]\s*/, ''), processedVideoGuids: url.trim().startsWith('[DONE]') ? [url.trim().replace(/^\[DONE\]\s*/, '')] : [] }));
              if (!site.references) newSite.references = [];
              if (site.scheduledPosts) delete site.scheduledPosts;
              if (site.socialGraphicPromptList) delete (newSite as any).socialGraphicPromptList;
              delete (newSite as any).rssFeedUrl; delete (newSite as any).processedRssGuids; delete (newSite as any).googleSheetUrl; delete (newSite as any).processedGoogleSheetRows;
              
              if (newSite.keywordList && !site.history) {
                const newHistory: PostHistoryItem[] = [];
                const newKeywordList: string[] = [];
                newSite.keywordList.split('\n').forEach((line: string) => {
                  const match = line.trim().match(/^\[DONE\]\s*(.*?)\s*—\s*(https?:\/\/\S+)\s*—\s*(\d{4}-\d{2}-\d{2})/);
                  if (match) { newHistory.push({ id: crypto.randomUUID(), topic: match[1], url: match[2], date: new Date(match[3]).getTime(), type: 'Keyword' }); newKeywordList.push(`[DONE] ${match[1]}`); } else { newKeywordList.push(line); }
                });
                if(newHistory.length > 0) { newSite.history = [...newSite.history, ...newHistory]; newSite.keywordList = newKeywordList.join('\n'); }
              }
              return newSite;
          });
      }
      
      const oldSettings = storageService.loadLegacySiteSettings();
      if (oldSettings) {
        console.log("Migrating old settings to new multi-site format...");
        const settings = oldSettings;
        const newSite: Site = {
          id: crypto.randomUUID(), name: settings.wordpressUrl || "My First Site", wordpressUrl: settings.wordpressUrl || '', wordpressUsername: settings.wordpressUsername || '', applicationPassword: settings.applicationPassword || '',
          brandGuideline: settings.brandGuideline || '', brandLogoLight: '', brandLogoDark: '', brandColors: '', brandFonts: '', characterReferences: [], promoLink1: settings.promoLink1 || '', promoLink2: settings.promoLink2 || '', keywordList: settings.keywordList || '',
          googleSheetSources: [], rssSources: [], videoSources: [], references: [], monitoredBacklinks: [], authorName: settings.wordpressUsername || 'Admin', authorId: undefined, availableAuthors: [], availableCategories: [], isStrictCategoryMatching: false, history: [], monthlyGenerationsCount: 0,
          isAutomationEnabled: settings.isAutomationEnabled ?? false, automationTrigger: 'daily', automationDailyTime: '09:00', automationTimezone: defaultTimezone, lastAutoPilotRun: undefined, recurringSchedules: [], dailyGenerationSource: 'keyword', scheduleGenerationSource: 'keyword', isAutoPublishEnabled: true, drafts: [], isInPostImagesEnabled: false, numberOfInPostImages: 3,
          socialMediaSettings: defaultSocialSettings, mailchimpSettings: defaultMailchimpSettings, googleAnalyticsSettings: defaultAnalyticsSettings, clarityProjectId: '', supabaseConnection: defaultSupabaseConnection, paystackConnection: defaultPaystackConnection, payfastConnection: defaultPayfastConnection, wiseConnection: defaultWiseConnection, payoneerConnection: defaultPayoneerConnection, stripeConnection: defaultStripeConnection, payPalConnection: defaultPayPalConnection,
          modelConfig: defaultModelConfig, apiKeys: defaultApiKeys, apiUsage: defaultApiUsage, fetchedModels: {}, isAssistantEnabled: true, isVoiceControlEnabled: true, isVideoControlEnabled: true, isTextControlEnabled: true,
          isSocialGraphicAutomationEnabled: false, socialGraphicAutomationTrigger: 'daily', isSocialGraphicAutoPublishEnabled: true, socialGraphicDailyTime: '14:00', lastSocialGraphicAutoPilotRun: undefined, socialGraphicRecurringSchedules: [], socialGraphicGenerationSource: 'keyword',
          isSocialVideoAutomationEnabled: false, socialVideoAutomationTrigger: 'daily', isSocialVideoAutoPublishEnabled: true, socialVideoDailyTime: '18:00', lastSocialVideoAutoPilotRun: undefined, socialVideoRecurringSchedules: [], socialVideoGenerationSource: 'keyword',
          isEmailMarketingAutomationEnabled: false, emailMarketingAutomationTrigger: 'daily', emailMarketingDailyTime: '10:00', lastEmailMarketingAutoPilotRun: undefined, emailMarketingRecurringSchedules: [], emailMarketingGenerationSource: 'newly_published_post',
          seoDataProvider: 'google_search', isLocalSeoEnabled: false, localSeoServiceArea: '', localSeoBusinessName: '', localSeoPhoneNumber: '', isAgencyAgentEnabled: false, agentCheckFrequencyHours: 24, agentActionOnDiscovery: 'addToReviewList', agencyAgentLogs: [], agentScheduledPosts: [], lastAgentRun: undefined, liveBroadcastAutomation: defaultLiveBroadcast,
        };
        finalSites.push(newSite);
        storageService.removeLegacySiteSettings();
      }
      
      setSites(finalSites);
      if (lastSelectedId && finalSites.some(s => s.id === lastSelectedId)) {
        setSelectedSiteId(lastSelectedId);
      } else if (finalSites.length > 0) {
        setSelectedSiteId(finalSites[0].id);
      }
    } catch (error: any) {
        console.warn("Could not load user data from storage:", error);
    }
  }, []);

  const handleAuthSuccess = useCallback((user: User) => {
    setCurrentUser(user);
    if (user.isAdmin) return;

    storageService.migrateGuestDataToUser(user);
    const loadData = async () => {
        const { sites: savedSites } = await storageService.loadSitesAndLastId(user);
        if (user.subscriptionPlan || (savedSites && savedSites.length > 0)) {
            setIsOnboarding(false);
        } else {
            setIsOnboarding(true);
        }
        await loadUserData(user);
    };
    loadData();
  }, [loadUserData]);

  const handleSignOut = useCallback(() => {
    authService.signOut();
    setCurrentUser(null);
    setSites([]);
    setSelectedSiteId(null);
    setImpersonatingUser(null);
    setIsOnboarding(false);
  }, []);
  
  const handleImpersonate = (userToImpersonate: User, siteIdToSelect?: string) => {
    if (!currentUser?.isAdmin) return;
    const adminUser = currentUser;
    authService.impersonateUser(userToImpersonate, adminUser);
    setCurrentUser(userToImpersonate);
    setImpersonatingUser(adminUser);
    loadUserData(userToImpersonate);
    if (siteIdToSelect) {
        setSelectedSiteId(siteIdToSelect);
        setActiveTab('dashboard');
    }
  };
  
  const handleEndImpersonation = () => {
    const adminUser = authService.endImpersonation();
    if (adminUser) {
        setCurrentUser(adminUser);
        setImpersonatingUser(null);
        setSites([]);
        setSelectedSiteId(null);
    }
  };

  const handleUpdatePlan = useCallback(async (plan: SubscriptionPlan, cycle?: 'monthly' | 'yearly') => {
    if (!currentUser) return;
    try {
        const updatedUser = await authService.updateUser(currentUser.email, { 
            subscriptionPlan: plan,
            subscriptionCycle: cycle 
        });
        setCurrentUser(updatedUser);

        if (!isOnboarding) {
            setActiveTab('dashboard');
        }
    } catch (e: any) {
        toast.addToast(e.message, 'error');
    }
  }, [currentUser, isOnboarding, toast]);

  const handleUserUpdate = (updatedUser: User) => {
    setCurrentUser(updatedUser);
  };

  const handleManageSubscription = () => {
    setIsProfileModalOpen(false);
    setActiveTab('subscription');
  }

  const onRefreshArticle = useCallback(async (url: string, site: Site) => {
      resetGeneration();
      setStatus(AppStatus.GENERATING_STRATEGY);
      setStatusMessage('Analyzing existing article...');
      
      try {
          const { originalHtml, refreshedPostData, brief, costs } = await generateRefreshedArticleFromUrl(url, site);
          for (const provider in costs) {
              logApiUsage(provider as keyof ApiKeys, costs[provider as keyof ApiKeys] || 0);
          }
          
          setStatusMessage('Generating refreshed image...');
          const { base64Image, cost: imageCost, provider: imageProvider } = await generateFeaturedImage(refreshedPostData.imagePrompt, site);
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
          toast.addToast(e.message, 'error');
          setStatus(AppStatus.ERROR);
      }
  }, [resetGeneration, logApiUsage, toast]);

  const generateAndScorePost = useCallback(async (topicToTrack: string, generationSource: 'keyword' | 'rss' | 'video' | 'google_sheet' | 'agency_agent', sourceDetails: any, site: Site) => {
    if (!planAccess.canGenerate) {
        toast.addToast(`You have reached your monthly generation limit of ${planAccess.generationLimit} posts. Please upgrade your plan to continue.`, 'error');
        setActiveTab('subscription');
        return;
    }

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
    setCurrentSourceDetails(sourceDetails); // This will hold { item, sourceId, rowIndex, agentPostId }

    try {
        let initialTopic: string;
        let generationType: PostHistoryItem['type'];
        let sourceToUpdate: RssSource | GoogleSheetSource | undefined = undefined;

        switch (generationSource) {
            case 'rss':
                initialTopic = sourceDetails.item.title;
                generationType = 'RSS';
                sourceToUpdate = site.rssSources.find(s => s.id === sourceDetails.sourceId);
                break;
            case 'video':
                initialTopic = sourceDetails.item.title;
                generationType = 'Video';
                // Similar logic for video sources if they need to be updated.
                break;
            case 'google_sheet':
                initialTopic = sourceDetails.item;
                generationType = 'Google Sheet';
                sourceToUpdate = site.googleSheetSources.find(s => s.id === sourceDetails.sourceId);
                break;
            case 'agency_agent':
                 initialTopic = topicToTrack;
                 generationType = 'Agency Agent';
                 break;
            case 'keyword':
            default:
                initialTopic = topicToTrack;
                generationType = 'Keyword';
                break;
        }

        setStatusMessage('Performing competitive analysis...');
        const { brief, costs: briefCosts } = await generateStrategicBriefFromKeyword(initialTopic, site);
        setStrategicBrief(brief);
        for (const provider in briefCosts) {
            logApiUsage(provider as keyof ApiKeys, briefCosts[provider as keyof ApiKeys] || 0);
        }

        const textProviderName = providerDisplayNames[site.modelConfig.textProvider];
        setStatus(AppStatus.GENERATING_ARTICLE);
        setStatusMessage(`Writing the blog post with ${textProviderName}...`);
        const { postData, cost: articleCost, provider: articleProvider } = await generateArticleFromBrief(brief, site);
        logApiUsage(articleProvider, articleCost);

        let contentAfterGallery = postData.content;
        if (site.isIntelligentGalleryEnabled && site.imageGallery && site.imageGallery.length > 0) {
            setStatusMessage('Applying intelligent gallery edits...');
            const { processedHtml, cost: galleryEditCost, provider: galleryEditProvider } = await processGalleryImagesInHtml(postData.content, site);
            contentAfterGallery = processedHtml;
            logApiUsage(galleryEditProvider, galleryEditCost);
        }

        setStatusMessage('Validating external links...');
        const validatedContent1 = await postProcessArticleLinks(contentAfterGallery);
        
        const imageProviderName = providerDisplayNames[site.modelConfig.imageProvider];
        setStatus(AppStatus.GENERATING_IMAGE);
        setStatusMessage(`Creating a featured image with ${imageProviderName}...`);
        const { base64Image, cost: imageCost, provider: imageProvider } = await generateFeaturedImage(postData.imagePrompt, site);
        logApiUsage(imageProvider, imageCost);

        let fullPost: BlogPost = { ...postData, content: validatedContent1, imageUrl: `data:image/jpeg;base64,${base64Image}` };
        
        setStatus(AppStatus.CORRECTING_SEO);
        setStatusMessage('Auto-correcting SEO...');
        const { score: initialScore, checklist: initialChecklist } = calculateSeoScore(fullPost, brief, site);
        if (initialScore < 100) {
            const { correctedHtml, cost: correctionCost, provider: correctionProvider } = await correctSeoIssues(fullPost.content, initialChecklist, brief, site);
            logApiUsage(correctionProvider, correctionCost);
            
            setStatusMessage('Re-validating corrected links...');
            const validatedContent2 = await postProcessArticleLinks(correctedHtml);
            fullPost = { ...fullPost, content: validatedContent2, wasSeoAutoCorrected: true };
        }
        
        let finalContent = fullPost.content;
        if (site.isInPostImagesEnabled && (site.numberOfInPostImages ?? 0) > 0) {
            setStatusMessage('Generating in-post images...');
            const { processedHtml, cost: inPostImageCost, provider: inPostImageProvider } = await processNewInPostImages(finalContent, site);
            finalContent = processedHtml;
            logApiUsage(inPostImageProvider, inPostImageCost);
        }
        fullPost = { ...fullPost, content: finalContent };

        const { score, checklist } = calculateSeoScore(fullPost, brief, site);
        setBlogPost(fullPost);
        setSeoScore({ score, checklist });
        setStatus(AppStatus.READY_TO_PUBLISH);
    } catch (e: any) {
        toast.addToast(e.message, 'error');
        setStatus(AppStatus.ERROR);
    }
  }, [resetGeneration, logApiUsage, planAccess, setActiveTab, toast, selectedSite?.modelConfig.textProvider, selectedSite?.modelConfig.imageProvider]);

  const handleBlogPostUpdate = (updatedPost: BlogPost) => {
    if (strategicBrief) {
        const { score, checklist } = calculateSeoScore(updatedPost, strategicBrief, selectedSite!);
        setSeoScore({ score, checklist });
    }
    setBlogPost(updatedPost);
  };

  const handlePublish = useCallback(async () => {
    if (!blogPost || !selectedSiteId || !selectedSite || !currentGenerationSource || !currentUser) {
        toast.addToast("Could not publish. Critical data is missing.", 'error');
        return;
    }
    
    setStatus(AppStatus.PUBLISHING);
    setStatusMessage('Uploading to WordPress...');

    try {
        const publishedUrl = await publishPost(selectedSite, blogPost, blogPost.focusKeyword);
        setPublishedPostUrl(publishedUrl);
        
        if (selectedSite.isGoogleCalendarSyncEnabled && selectedSite.googleCalendarConnection?.isConnected) {
            const { accessToken, primaryCalendarId } = selectedSite.googleCalendarConnection;
            if (accessToken && primaryCalendarId) {
                const event = {
                    summary: `[Zenith Engine AI] Published: ${blogPost.title}`,
                    description: `Blog post generated and published.\nSource: ${currentGenerationSource}\nURL: ${publishedUrl}`,
                    start: { dateTime: new Date().toISOString(), timeZone: selectedSite.automationTimezone },
                    end: { dateTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(), timeZone: selectedSite.automationTimezone }, // 15 min event
                };
                try {
                    await googleCalendarService.createCalendarEvent(accessToken, primaryCalendarId, event);
                } catch (e) {
                    console.error(`Failed to sync to Google Calendar for site ${selectedSite.name}:`, e);
                    toast.addToast(`Post published, but failed to sync to Google Calendar: ${(e as Error).message}`, 'error');
                }
            }
        }
        
        if (!currentUser.isAdmin) {
             const newGenerations = { count: (currentUser.monthlyGenerations?.count || 0) + 1, resetDate: currentUser.monthlyGenerations?.resetDate || Date.now() };
             const updatedUser = await authService.updateUser(currentUser.email, { monthlyGenerations: newGenerations });
             setCurrentUser(updatedUser);
        }

        setStatus(AppStatus.GENERATING_SOCIAL_POSTS);
        setStatusMessage('Drafting social media posts...');
        const { posts: socialPosts, cost: socialCost, provider: socialProvider } = await generateSocialMediaPosts(blogPost, publishedUrl, selectedSite);
        logApiUsage(socialProvider, socialCost);
        setLastGeneratedSocialPosts(socialPosts);
        
        // Save to history
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
            } else if (currentGenerationSource === 'Agency Agent' && currentSourceDetails.agentPostId) {
                updatedSite.agentScheduledPosts = (updatedSite.agentScheduledPosts || []).map(p => 
                    p.id === currentSourceDetails.agentPostId ? { ...p, status: 'complete' as const, resultingPostId: newHistoryItem.id } : p
                );
            }
            
            // Handle removal from drafts if this was a reviewed draft
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
        toast.addToast(e.message, 'error');
        setStatus(AppStatus.ERROR);
    }
  }, [blogPost, selectedSite, sites, currentGenerationSource, currentSourceDetails, currentTopic, reviewingDraft, logApiUsage, currentUser, selectedSiteId, toast]);

  const handleConnectSocialMedia = useCallback((platform: keyof Omit<SocialMediaSettings, 'whatsapp' | 'telegram' | 'metaClientId' | 'metaClientSecret' | 'metaAdsClientId' | 'metaAdsClientSecret' | 'googleAdsClientId' | 'googleAdsClientSecret' | 'googleCalendarClientId' | 'googleCalendarClientSecret' | 'googleAuthClientId' | 'googleAuthClientSecret'> | 'google_analytics' | 'google_calendar', accountId: string) => {
    if (!selectedSiteId || !selectedSite) {
        toast.addToast("No site selected to connect to.", 'error');
        return;
    }
    const platformKey = platform as any;
    
    if (platform === 'google_analytics' || platform === 'google_ads' || platform === 'google_calendar') {
        const settings = platform === 'google_analytics' ? selectedSite.googleAnalyticsSettings : platform === 'google_ads' ? { clientId: selectedSite.socialMediaSettings.googleAdsClientId, clientSecret: selectedSite.socialMediaSettings.googleAdsClientSecret } : { clientId: selectedSite.socialMediaSettings.googleCalendarClientId, clientSecret: selectedSite.socialMediaSettings.googleCalendarClientSecret };
        if (settings.clientId && settings.clientSecret) {
            oauthService.redirectToAuth(platform, settings.clientId, selectedSiteId, accountId);
        } else {
            toast.addToast(`${platform === 'google_analytics' ? 'Google Analytics' : platform === 'google_ads' ? 'Google Ads' : 'Google Calendar'} Client ID and Secret are not configured for this site.`, 'error');
        }
    } else {
        const accountsForPlatform = selectedSite.socialMediaSettings[platformKey as keyof SocialMediaSettings];
        const account = Array.isArray(accountsForPlatform) ? accountsForPlatform.find((acc: any) => acc.id === accountId) : undefined;
    
        if (account && 'clientId' in account && account.clientId && 'clientSecret' in account && account.clientSecret) {
            oauthService.redirectToAuth(platform as any, account.clientId, selectedSiteId, accountId);
        } else {
            toast.addToast(`Client ID and Secret are not configured for this ${platform} account.`, 'error');
        }
    }
  }, [selectedSite, selectedSiteId, toast]);

    const handleVerifySocialMediaConnection = useCallback(async (platformId: oauthService.SocialPlatform, accountId: string, accessToken: string) => {
        if (!selectedSite) return;
        const platformKey = platformId as keyof SocialMediaSettings;
        
        let newSocialSettings = { ...selectedSite.socialMediaSettings };
        const accountsForPlatform = (newSocialSettings[platformKey] as SocialMediaAccount[] | undefined) || [];
        const accountIndex = accountsForPlatform.findIndex(acc => acc.id === accountId);
        if (accountIndex === -1) return;
        
        const account = accountsForPlatform[accountIndex];

        try {
            const { success, message, data } = await oauthService.verifyConnection(platformId, accessToken);
            
            const status: SocialAccountStatus = success ? 'connected' : 'needs_reauth';
            const updatedAccount: SocialMediaAccount = {
                ...account,
                status,
                isConnected: success,
                statusMessage: message,
                extraData: data ? { ...account.extraData, channelName: data.channelName } : account.extraData,
            };
            
            accountsForPlatform[accountIndex] = updatedAccount;
            handleSiteUpdate('socialMediaSettings', newSocialSettings);
        } catch (err: any) {
            toast.addToast(err.message, 'error');
        }
    }, [selectedSite, handleSiteUpdate, toast]);

    const handleVerifyCredentialBasedConnection = useCallback(async (platformId: 'whatsapp' | 'telegram', account: WhatsAppAccount | TelegramAccount) => {
        if (!selectedSite) return;
        const platformKey = platformId as keyof SocialMediaSettings;

        let newSocialSettings = { ...selectedSite.socialMediaSettings };
        const accountsForPlatform = (newSocialSettings[platformKey] as (WhatsAppAccount | TelegramAccount)[] | undefined) || [];
        const accountIndex = accountsForPlatform.findIndex(acc => acc.id === account.id);
        if (accountIndex === -1) return;

        try {
            const { success, message } = await oauthService.verifyCredentialBasedConnection(platformId, account);
            const updatedAccount = { ...account, status: success ? 'connected' : 'error' as const, isConnected: success, statusMessage: message };
            accountsForPlatform[accountIndex] = updatedAccount as any;
            handleSiteUpdate('socialMediaSettings', newSocialSettings);
        } catch (err: any) {
            toast.addToast(err.message, 'error');
        }
    }, [selectedSite, handleSiteUpdate, toast]);

    const handleVerifyMailchimp = useCallback(async (settings: MailchimpSettings) => {
        if (!selectedSite) return;
        try {
            const { success, message } = await mailchimpService.verifyMailchimpConnection(settings);
            handleSiteUpdate('mailchimpSettings', { ...settings, isConnected: success, statusMessage: message });
        } catch(e: any) {
            toast.addToast(e.message, 'error');
        }
    }, [selectedSite, handleSiteUpdate, toast]);
    
    const handleVerifyClarity = useCallback(async (projectId: string) => {
        if (!selectedSite) return;
        try {
            const { success, message } = await clarityService.verifyClarityProject(projectId);
            if (success) {
                handleSiteUpdate('clarityProjectId', projectId);
                toast.addToast('Clarity Project ID verified!', 'success');
            } else {
                toast.addToast(message, 'error');
            }
        } catch(e: any) {
            toast.addToast(e.message, 'error');
        }
    }, [selectedSite, handleSiteUpdate, toast]);

    const handleVerifySupabaseConnection = useCallback(async (connection: SupabaseConnection) => {
        if (!selectedSite) return;
        try {
            const { success, message } = await verifySupabaseConnection(connection);
            handleSiteUpdate('supabaseConnection', { ...connection, status: success ? 'connected' : 'error', statusMessage: message });
        } catch(e: any) {
            toast.addToast(e.message, 'error');
        }
    }, [selectedSite, handleSiteUpdate, toast]);

    const handleVerifyPaystackConnection = useCallback(async (connection: PaystackConnection) => {
        if (!selectedSite) return;
        try {
            const { success, message } = await verifyPaystackConnection(connection);
            handleSiteUpdate('paystackConnection', { ...connection, status: success ? 'connected' : 'error', statusMessage: message });
        } catch(e: any) {
            toast.addToast(e.message, 'error');
        }
    }, [selectedSite, handleSiteUpdate, toast]);

    const handleVerifyPayfastConnection = useCallback(async (connection: PayfastConnection) => {
        if (!selectedSite) return;
        try {
            const { success, message } = await verifyPayfastConnection(connection);
            handleSiteUpdate('payfastConnection', { ...connection, status: success ? 'connected' : 'error', statusMessage: message });
        } catch(e: any) {
            toast.addToast(e.message, 'error');
        }
    }, [selectedSite, handleSiteUpdate, toast]);
    
    const handleVerifyWiseConnection = useCallback(async (connection: WiseConnection) => {
        if (!selectedSite) return;
        try {
            const { success, message } = await verifyWiseConnection(connection);
            handleSiteUpdate('wiseConnection', { ...connection, status: success ? 'connected' : 'error', statusMessage: message });
        } catch (e: any) {
            toast.addToast(e.message, 'error');
        }
    }, [selectedSite, handleSiteUpdate, toast]);
    
    const handleVerifyPayoneerConnection = useCallback(async (connection: PayoneerConnection) => {
        if (!selectedSite) return;
        try {
            const { success, message } = await verifyPayoneerConnection(connection);
            handleSiteUpdate('payoneerConnection', { ...connection, status: success ? 'connected' : 'error', statusMessage: message });
        } catch (e: any) {
            toast.addToast(e.message, 'error');
        }
    }, [selectedSite, handleSiteUpdate, toast]);
    
    const handleVerifyStripeConnection = useCallback(async (connection: StripeConnection) => {
        if (!selectedSite) return;
        try {
            const { success, message } = await verifyStripeConnection(connection);
            handleSiteUpdate('stripeConnection', { ...connection, status: success ? 'connected' : 'error', statusMessage: message });
        } catch (e: any) {
            toast.addToast(e.message, 'error');
        }
    }, [selectedSite, handleSiteUpdate, toast]);

    const handleVerifyPayPalConnection = useCallback(async (connection: PayPalConnection) => {
        if (!selectedSite) return;
        try {
            const { success, message } = await verifyPayPalConnection(connection);
            handleSiteUpdate('payPalConnection', { ...connection, status: success ? 'connected' : 'error', statusMessage: message });
        } catch (e: any) {
            toast.addToast(e.message, 'error');
        }
    }, [selectedSite, handleSiteUpdate, toast]);

    const onRefreshAnalytics = useCallback(async () => {
        if (!selectedSite || !selectedSite.googleAnalyticsSettings.isConnected || !selectedSite.googleAnalyticsSettings.accessToken || !selectedSite.googleAnalyticsSettings.propertyId) {
            toast.addToast("Google Analytics is not connected or configured.", 'error');
            return;
        }

        const postsToUpdate = selectedSite.history.filter(p => p.url !== '#');
        const pathsToQuery = postsToUpdate.map(p => new URL(p.url).pathname);
        
        try {
            const metricsByPath = await googleAnalyticsService.getBulkPageMetrics(selectedSite.googleAnalyticsSettings.accessToken, selectedSite.googleAnalyticsSettings.propertyId, pathsToQuery);
            
            const updatedHistory = selectedSite.history.map(post => {
                const path = post.url !== '#' ? new URL(post.url).pathname : null;
                if (path && metricsByPath[path]) {
                    return { ...post, analytics: metricsByPath[path] };
                }
                return post;
            });
            
            handleSiteUpdate('history', updatedHistory);

        } catch (e: any) {
            toast.addToast(`Failed to refresh analytics: ${e.message}`, 'error');
        }
    }, [selectedSite, handleSiteUpdate, toast]);

    const onRefreshClarityData = useCallback(async () => {
        if (!selectedSite || !selectedSite.clarityProjectId) {
            toast.addToast("Clarity Project ID is not configured for this site.", 'error');
            return;
        }
        
        const postsToUpdate = selectedSite.history.filter(p => p.url !== '#');
        
        try {
            const metricsPromises = postsToUpdate.map(p => clarityService.fetchClarityMetrics(selectedSite!.clarityProjectId!, p.url));
            const metricsResults = await Promise.all(metricsPromises);
            
            const updatedHistory = selectedSite.history.map(post => {
                const postIndex = postsToUpdate.findIndex(p => p.id === post.id);
                if (postIndex !== -1 && metricsResults[postIndex]) {
                    return { ...post, clarityMetrics: metricsResults[postIndex] };
                }
                return post;
            });

            handleSiteUpdate('history', updatedHistory);

        } catch (e: any) {
            toast.addToast(`Failed to refresh Clarity data: ${e.message}`, 'error');
        }
    }, [selectedSite, handleSiteUpdate, toast]);

  // CRITICAL CHANGE: Check if backend is configured. If not, show error message instead of wizard.
  // This enforces the requirement that config must come from Env Vars.
  if (!isBackendConfigured()) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white p-4 text-center">
            <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mb-4" />
            <h1 className="text-3xl font-bold mb-2">Configuration Missing</h1>
            <p className="text-gray-400 max-w-md">
                The application backend is not configured. Please set the <code>SUPABASE_URL</code> and <code>SUPABASE_ANON_KEY</code> environment variables on the server.
            </p>
        </div>
      );
  }

  if (authLoading) {
    return <div className="h-full w-full flex items-center justify-center"><svg className="animate-spin h-10 w-10 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>;
  }
  
  if (!currentUser) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} theme={theme} toggleTheme={toggleTheme} />;
  }

  if (currentUser.isAdmin && !impersonatingUser) {
      return <AdminDashboard currentUser={currentUser} onImpersonate={handleImpersonate} onSignOut={handleSignOut} theme={theme} toggleTheme={toggleTheme} />;
  }

  if (isOnboarding) {
      return (
          <OnboardingWizard
              currentUser={currentUser}
              onUpdatePlan={handleUpdatePlan}
              onAddNewSite={handleAddNewSite}
              onComplete={() => setIsOnboarding(false)}
              setActiveTab={setActiveTab}
          />
      );
  }

  if (sites.length === 0 || !selectedSite) {
      return (
          <div className="h-full w-full flex items-center justify-center p-4">
              <div className="text-center">
                  <h1 className="text-2xl font-bold text-main">Welcome to {APP_TITLE}</h1>
                  <p className="text-text-secondary mt-2">Create your first site to get started.</p>
                  <button onClick={handleAddNewSite} className="mt-6 btn btn-primary">
                      + Create New Site
                  </button>
              </div>
          </div>
      );
  }
  
  const planDetails: Record<SubscriptionPlan, { title: string; icon: React.FC<any>; colorClasses: string }> = {
    free: {
        title: 'Free',
        icon: UserIcon,
        colorClasses: 'text-gray-400 border-gray-600 bg-gray-800/50 hover:bg-gray-700/60',
    },
    creator: {
        title: 'Creator',
        icon: PenIcon,
        colorClasses: 'text-cyan-300 border-cyan-500/50 bg-cyan-900/40 hover:bg-cyan-900/60',
    },
    pro: {
        title: 'Pro',
        icon: SparklesIcon,
        colorClasses: 'text-purple-300 border-purple-500/50 bg-purple-900/40 hover:bg-purple-900/60',
    },
    agency: {
        title: 'Agency',
        icon: BuildingOffice2Icon,
        colorClasses: 'text-yellow-300 border-yellow-500/50 bg-yellow-900/40 hover:bg-yellow-900/60',
    },
  };
  
  const currentPlanDetails = planDetails[planAccess.plan];
  const PlanIcon = currentPlanDetails.icon;

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      currentUser={currentUser}
      handleSignOut={handleSignOut}
      impersonatingUser={impersonatingUser}
      planAccess={planAccess}
      theme={theme}
      toggleTheme={toggleTheme}
    >
      <div className="animate-fade-in">
        <ActiveComponent
            status={status}
            blogPost={blogPost}
            publishedPostUrl={publishedPostUrl}
            lastGeneratedSocialPosts={lastGeneratedSocialPosts}
            site={selectedSite}
            sites={sites}
            resetGeneration={resetGeneration}
            handleConnectSocialMedia={handleConnectSocialMedia}
            isConnectingSocial={isConnectingSocial}
            handleBlogPostUpdate={handleBlogPostUpdate}
            seoScore={seoScore}
            statusMessage={statusMessage}
            handlePublish={handlePublish}
            isLoading={isLoading}
            activeTab={activeTab}
            activeSubTab={activeSubTab}
            setActiveTab={setActiveTab}
            generateAndScorePost={generateAndScorePost}
            handleReviewDraft={handleReviewDraft}
            handleSiteUpdate={handleSiteUpdate}
            handleMultipleSiteUpdates={handleMultipleSiteUpdates}
            setViewingHistoryItem={setViewingHistoryItem}
            logApiUsage={logApiUsage}
            handleResetAllSitesSpend={handleResetAllSitesSpend}
            handleOpenDeleteDialog={handleOpenDeleteDialog}
            handleVerifySocialMediaConnection={handleVerifySocialMediaConnection}
            handleVerifyCredentialBasedConnection={handleVerifyCredentialBasedConnection}
            onDiscardDraft={onDiscardDraft}
            onRefreshAnalytics={onRefreshAnalytics}
            onRefreshClarityData={onRefreshClarityData}
            currentUser={currentUser}
            handleUpdatePlan={handleUpdatePlan}
            planAccess={planAccess}
            onRefreshArticle={onRefreshArticle}
            originalArticleForDiff={originalArticleForDiff}
            refreshedArticleForDiff={refreshedArticleForDiff}
            handleVerifyMailchimp={handleVerifyMailchimp}
            handleVerifyClarity={handleVerifyClarity}
            handleVerifySupabase={handleVerifySupabaseConnection}
            handleVerifyPaystack={handleVerifyPaystackConnection}
            handleVerifyPayfast={handleVerifyPayfastConnection}
            handleVerifyWise={handleVerifyWiseConnection}
            handleVerifyPayoneer={handleVerifyPayoneerConnection}
            handleVerifyStripe={handleVerifyStripeConnection}
            handleVerifyPayPal={handleVerifyPayPalConnection}
        />
      </div>
      
      {/* Modals and Overlays */}
      {isProfileModalOpen && (
          <ProfileModal
              isOpen={isProfileModalOpen}
              onClose={() => setIsProfileModalOpen(false)}
              currentUser={currentUser}
              onUserUpdate={handleUserUpdate}
              onSignOut={handleSignOut}
              planAccess={{
                  plan: planAccess.plan,
                  generationLimit: planAccess.generationLimit === Infinity ? 'Unlimited' : planAccess.generationLimit,
                  generationsUsed: planAccess.generationsUsed
              }}
              onManageSubscription={handleManageSubscription}
          />
      )}
      
      {selectedSite.isAssistantEnabled && (
          <AssistantUI 
              site={selectedSite} 
              actions={{
                  onFindNextTopic: () => {
                      const topic = selectedSite.keywordList.split('\n').find(k => k.trim() && !k.trim().startsWith('[DONE]'));
                      return topic || "No topics found in keyword list.";
                  },
                  onResearchKeyword: async (kw) => {
                      try {
                          const { suggestions } = await suggestKeywords(kw, selectedSite);
                          return suggestions[0] || kw; 
                      } catch(e) { return kw; }
                  },
                  onBrainstormAndAddTopics: async ({ query, count }) => {
                      try {
                          const { suggestions } = await suggestKeywords(query, selectedSite);
                          const newTopics = suggestions.slice(0, count);
                          handleSiteUpdate('keywordList', (selectedSite.keywordList + '\n' + newTopics.join('\n')).trim());
                          return `Added ${newTopics.length} topics to the list.`;
                      } catch(e: any) { return `Error: ${e.message}`; }
                  },
                  onGenerateArticle: async (topic) => {
                      generateAndScorePost(topic, 'keyword', topic, selectedSite);
                      return `Started generation for "${topic}". Check the main screen for progress.`;
                  },
                  onUpdateSiteField: (field, val) => {
                      handleSiteUpdate(field, val);
                      return `Updated ${field} to ${val}.`;
                  },
                  onRunSocialGraphicAutomation: async () => {
                      setActiveTab('content', 'graphics');
                      return "Opened Social Graphics tab.";
                  },
                  onRunSocialVideoAutomation: async () => {
                      setActiveTab('content', 'video');
                      return "Opened Social Video tab.";
                  },
                  onNavigateToTab: ({ tab, subTab }) => {
                      const tabMap: Record<string, string> = { 'dashboard': 'dashboard', 'content hub': 'content', 'content': 'content', 'authority': 'authority', 'automation': 'automation', 'advertising': 'advertising', 'branding': 'branding', 'connections': 'connections', 'analytics': 'analytics', 'settings': 'settings' };
                      const targetTab = tabMap[tab.toLowerCase()];
                      if (targetTab) {
                          setActiveTab(targetTab, subTab ? subTab.toLowerCase() : null);
                          return `Navigated to ${tab}.`;
                      }
                      return `Tab "${tab}" not found.`;
                  },
                  onGetAutomationStatus: () => {
                      const status = {
                          isWordPressConnected: !!(selectedSite.wordpressUrl && selectedSite.wordpressUsername),
                          hasContentSources: (selectedSite.keywordList.length > 0 || selectedSite.rssSources.length > 0),
                          isAutomationEnabled: selectedSite.isAutomationEnabled,
                          isSocialGraphicAutomationEnabled: selectedSite.isSocialGraphicAutomationEnabled,
                          isSocialVideoAutomationEnabled: selectedSite.isSocialVideoAutomationEnabled,
                      };
                      return JSON.stringify(status);
                  },
                  onUpdateAutomationSetting: ({ settingName, settingValue }) => {
                      let val: any = settingValue;
                      if (settingValue === 'true') val = true;
                      if (settingValue === 'false') val = false;
                      handleSiteUpdate(settingName as keyof Site, val);
                      return `Updated ${settingName} to ${val}.`;
                  }
              }} 
          />
      )}
      
      <GlobalAutomationTracker 
          isOpen={isTrackerModalOpen} 
          onClose={() => setIsTrackerModalOpen(false)} 
          sites={sites} 
          onActiveJobsChange={(isActive) => {
              if (isActive && !isTrackerModalOpen) {
                  // Optional: auto-open or show toast
              }
          }}
      />
      
      {viewingHistoryItem && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setViewingHistoryItem(null)}>
              <div className="bg-panel rounded-xl shadow-2xl w-full max-w-4xl border border-border animate-modal-pop max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <div className="p-6">
                      <div className="flex justify-between items-start mb-6">
                          <h2 className="text-2xl font-bold text-main">History Details</h2>
                          <button onClick={() => setViewingHistoryItem(null)} className="p-2 text-text-secondary hover:text-main rounded-full bg-panel-light hover:bg-bg-surface-highlight transition-colors"><XIcon className="h-6 w-6" /></button>
                      </div>
                      <HistoryDetailViewer post={viewingHistoryItem} site={selectedSite} />
                  </div>
              </div>
          </div>
      )}
    </Layout>
  );
};
