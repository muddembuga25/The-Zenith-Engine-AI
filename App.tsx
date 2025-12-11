

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
import { isBackendConfigured } from './services/supabaseClient';
import * as authService from './services/authService';
import { useToast } from './hooks/useToast';
import { 
    LogoIcon, CheckCircleIcon, ExclamationTriangleIcon, Cog6ToothIcon, ClockIcon, MenuIcon, XIcon, PenIcon, HomeIcon, 
    ScaleIcon, SparklesIcon, PhotoIcon, VideoCameraIcon, DocumentTextIcon, ShareIcon, LightbulbIcon, LinkIcon, 
    ChartBarIcon, QuestionMarkCircleIcon, SignOutIcon, UserIcon, CreditCardIcon, LockClosedIcon, WordPressIcon, 
    KeyIcon, BuildingOffice2Icon, SunIcon, MoonIcon
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
import { BackendSetupWizard } from './components/BackendSetupWizard';
import { checkAutomationReadiness } from './utils/automationReadiness';


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
        "Analyzing SERPs for competitive advantages...",
        "Crafting a unique angle for your post...",
        "Drafting compelling, SEO-optimized content...",
        "Generating a unique featured image...",
        "Performing Self-Correction SEO Loop...",
        "Finalizing SEO metadata and schema...",
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

  const setActiveTab = (tab: string, subTab: string | null = null) => {
      setActiveTabState(tab);
      setActiveSubTab(subTab);
      if (!subTab) {
          setActiveSubTab(null);
      }
      setIsSidebarOpen(false);
  };

  const selectedSite = sites.find(s => s.id === selectedSiteId);
  const isLoading = status > AppStatus.IDLE && status < AppStatus.READY_TO_PUBLISH;

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
                      needsMigration = true;
                      break;
                  }
                  if (!migratedSocialSettings[platform]) {
                    migratedSocialSettings[platform] = [];
                  }
              }

              if(needsMigration) {
                  const newSocialSettings: any = { ...defaultSocialSettings };
                  for (const platform of socialPlatforms) {
                       if (platform === 'whatsapp' || platform === 'telegram' || platform === 'meta' || platform === 'meta_ads' || platform === 'google_ads') {
                            newSocialSettings[platform] = migratedSocialSettings[platform] || [];
                            continue;
                       };
                      const platformSetting = migratedSocialSettings[platform];
                       if (platformSetting && typeof platformSetting === 'object' && !Array.isArray(platformSetting)) {
                            newSocialSettings[platform] = [{
                                id: crypto.randomUUID(),
                                name: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Account`,
                                isAutomationEnabled: platformSetting.isAutomationEnabled ?? false,
                                isConnected: platformSetting.isConnected ?? false,
                                accessToken: platformSetting.accessToken,
                                clientId: platformSetting.clientId,
                                clientSecret: platformSetting.clientSecret,
                            }];
                       } else {
                            newSocialSettings[platform] = platformSetting || [];
                       }
                  }
                  migratedSocialSettings = newSocialSettings;
              }

              // Add status and destinationType to existing accounts
              for (const platform of socialPlatforms) {
                  if (migratedSocialSettings[platform]) {
                    migratedSocialSettings[platform] = (migratedSocialSettings[platform] as any[]).map((acc: any) => ({
                      ...acc,
                      status: acc.status || (acc.isConnected ? 'connected' : 'disconnected'),
                      destinationType: acc.destinationType || (platform === 'facebook' ? 'page' : 'profile'),
                    }));
                  }
              }

              let migratedHistory = site.history || [];
              migratedHistory = migratedHistory.map((item: any) => {
                  let newItem = { ...item };
                  if (newItem.type === 'Social Graphic' && newItem.imageUrl && !newItem.socialGraphics) {
                      newItem.socialGraphics = {
                          custom: { imageUrl: newItem.imageUrl, caption: newItem.caption || '' }
                      };
                      delete newItem.imageUrl;
                      delete newItem.caption;
                  }
                  return newItem;
              });

              const liveBroadcastData = site.liveBroadcastAutomation || (site as any).sundayServiceAutomation || {};
              const migratedLiveBroadcast: LiveBroadcastAutomation = { ...defaultLiveBroadcast, ...liveBroadcastData };
              if ((liveBroadcastData as any).sourceType === 'url') {
                  migratedLiveBroadcast.sourceType = 'facebook_url';
              }
              // Handle URL renames for Live Production
              migratedLiveBroadcast.facebookPageUrl = migratedLiveBroadcast.facebookPageUrl || (migratedLiveBroadcast as any).facebookLiveUrl || '';
              migratedLiveBroadcast.youtubeChannelUrl = migratedLiveBroadcast.youtubeChannelUrl || (migratedLiveBroadcast as any).youtubeLiveUrl || '';
              migratedLiveBroadcast.tiktokProfileUrl = migratedLiveBroadcast.tiktokProfileUrl || (migratedLiveBroadcast as any).tiktokLiveUrl || '';
              migratedLiveBroadcast.xProfileUrl = migratedLiveBroadcast.xProfileUrl || (migratedLiveBroadcast as any).xLiveUrl || (migratedLiveBroadcast as any).xComLiveUrl || '';

              if (!migratedLiveBroadcast.dailyPostTimes || migratedLiveBroadcast.dailyPostTimes.length === 0) {
                  migratedLiveBroadcast.dailyPostTimes = ['09:00', '17:00'];
              }
              if (migratedLiveBroadcast.currentWeekClips?.some((c: any) => c.scheduledTime === 'AM' || c.scheduledTime === 'PM')) {
                  migratedLiveBroadcast.currentWeekClips = [];
              }
              if (typeof migratedLiveBroadcast.lastRunTimestamp === 'undefined') {
                  migratedLiveBroadcast.lastRunTimestamp = 0;
              }
              migratedLiveBroadcast.youtubeSourceMethod = migratedLiveBroadcast.youtubeSourceMethod || 'url';
              migratedLiveBroadcast.tiktokSourceMethod = migratedLiveBroadcast.tiktokSourceMethod || 'url';
              migratedLiveBroadcast.xSourceMethod = migratedLiveBroadcast.xSourceMethod || 'url';
              migratedLiveBroadcast.youtubeAccountId = migratedLiveBroadcast.youtubeAccountId || '';
              migratedLiveBroadcast.tiktokAccountId = migratedLiveBroadcast.tiktokAccountId || '';
              migratedLiveBroadcast.xAccountId = migratedLiveBroadcast.xAccountId || '';


              let newSite: Site = { 
                ...site, 
                brandGuideline: site.brandGuideline || '',
                brandLogoLight: site.brandLogoLight || (site as any).brandLogo || '',
                brandLogoDark: site.brandLogoDark || '',
                brandColors: site.brandColors || '',
                brandFonts: site.brandFonts || '',
                characterReferences: site.characterReferences || [],
                authorName: site.authorName || site.wordpressUsername || 'Admin',
                authorId: site.authorId,
                availableAuthors: site.availableAuthors || [],
                availableCategories: site.availableCategories || [],
                isStrictCategoryMatching: site.isStrictCategoryMatching ?? false,
                scheduleGenerationSource: site.scheduleGenerationSource || generationSource,
                rssSources: site.rssSources || [],
                googleSheetSources: site.googleSheetSources || [],
                recurringSchedules: site.recurringSchedules || [],
                history: migratedHistory,
                monthlyGenerationsCount: site.monthlyGenerationsCount || 0,
                videoSources: site.videoSources || [],
                references: site.references || [],
                monitoredBacklinks: site.monitoredBacklinks || [],
                isAutomationEnabled: site.isAutomationEnabled ?? false,
                isAutoPublishEnabled: site.isAutoPublishEnabled ?? true,
                drafts: site.drafts || [],
                lastAutoPilotRun: site.lastAutoPilotRun, 
                isInPostImagesEnabled: site.isInPostImagesEnabled ?? false,
                numberOfInPostImages: site.numberOfInPostImages ?? 3,
                socialMediaSettings: migratedSocialSettings,
                mailchimpSettings: site.mailchimpSettings || defaultMailchimpSettings,
                googleAnalyticsSettings: site.googleAnalyticsSettings || defaultAnalyticsSettings,
                clarityProjectId: site.clarityProjectId || '',
                supabaseConnection: site.supabaseConnection || defaultSupabaseConnection,
                paystackConnection: site.paystackConnection || defaultPaystackConnection,
                payfastConnection: site.payfastConnection || defaultPayfastConnection,
                wiseConnection: site.wiseConnection || defaultWiseConnection,
                payoneerConnection: site.payoneerConnection || defaultPayoneerConnection,
                stripeConnection: site.stripeConnection || defaultStripeConnection,
                payPalConnection: site.payPalConnection || defaultPayPalConnection,
                activePaymentGateway: site.activePaymentGateway,
                modelConfig: migratedModelConfig,
                apiKeys: site.apiKeys || defaultApiKeys,
                apiUsage: site.apiUsage || defaultApiUsage,
                fetchedModels: site.fetchedModels || {},
                isAssistantEnabled: site.isAssistantEnabled ?? true,
                isVoiceControlEnabled: site.isVoiceControlEnabled ?? true,
                isVideoControlEnabled: site.isVideoControlEnabled ?? true,
                isTextControlEnabled: site.isTextControlEnabled ?? true,
                // Automation - time based
                automationTrigger: site.automationTrigger === 'interval' ? 'daily' : (site.automationTrigger || 'daily'),
                automationDailyTime: site.automationDailyTime || '09:00',
                automationTimezone: site.automationTimezone || defaultTimezone,
                dailyGenerationSource: site.dailyGenerationSource || site.intervalGenerationSource || generationSource,
                // Social Graphics
                isSocialGraphicAutomationEnabled: site.isSocialGraphicAutomationEnabled ?? false,
                isSocialGraphicAutoPublishEnabled: site.isSocialGraphicAutoPublishEnabled ?? true,
                socialGraphicAutomationTrigger: site.socialGraphicAutomationTrigger === 'interval' ? 'daily' : (site.socialGraphicAutomationTrigger || 'daily'),
                socialGraphicDailyTime: site.socialGraphicDailyTime || '14:00',
                lastSocialGraphicAutoPilotRun: site.lastSocialGraphicAutoPilotRun,
                socialGraphicRecurringSchedules: site.socialGraphicRecurringSchedules || [],
                socialGraphicGenerationSource: site.socialGraphicGenerationSource || 'keyword',
                // Social Videos
                isSocialVideoAutomationEnabled: site.isSocialVideoAutomationEnabled ?? false,
                isSocialVideoAutoPublishEnabled: site.isSocialVideoAutoPublishEnabled ?? true,
                socialVideoAutomationTrigger: site.socialVideoAutomationTrigger === 'interval' ? 'daily' : (site.socialVideoAutomationTrigger || 'daily'),
                socialVideoDailyTime: site.socialVideoDailyTime || '18:00',
                lastSocialVideoAutoPilotRun: site.lastSocialVideoAutoPilotRun,
                socialVideoRecurringSchedules: site.socialVideoRecurringSchedules || [],
                socialVideoGenerationSource: site.socialVideoGenerationSource || 'keyword',
                // Email Marketing
                isEmailMarketingAutomationEnabled: site.isEmailMarketingAutomationEnabled ?? false,
                emailMarketingAutomationTrigger: site.emailMarketingAutomationTrigger || 'daily',
                emailMarketingDailyTime: site.emailMarketingDailyTime || '10:00',
                lastEmailMarketingAutoPilotRun: site.lastEmailMarketingAutoPilotRun,
                emailMarketingRecurringSchedules: site.emailMarketingRecurringSchedules || [],
                emailMarketingGenerationSource: site.emailMarketingGenerationSource || 'newly_published_post',
                // SEO & Geo-targeting
                seoDataProvider: site.seoDataProvider || 'google_search',
                isLocalSeoEnabled: site.isLocalSeoEnabled ?? false,
                localSeoServiceArea: site.localSeoServiceArea || '',
                localSeoBusinessName: site.localSeoBusinessName || '',
                localSeoPhoneNumber: site.localSeoPhoneNumber || '',
                // Agency Features
                isAgencyAgentEnabled: site.isAgencyAgentEnabled ?? false,
                agentCheckFrequencyHours: site.agentCheckFrequencyHours || 24,
                agentActionOnDiscovery: site.agentActionOnDiscovery || 'addToReviewList',
                agencyAgentLogs: site.agencyAgentLogs || [],
                agentScheduledPosts: site.agentScheduledPosts || [],
                lastAgentRun: site.lastAgentRun,
                liveBroadcastAutomation: migratedLiveBroadcast,
              };
              
              // Clean up old interval properties
              delete (newSite as any).automationIntervalHours;
              delete (newSite as any).intervalGenerationSource;
              delete (newSite as any).socialGraphicAutomationIntervalHours;
              delete (newSite as any).socialVideoAutomationIntervalHours;
              delete (newSite as any).brandLogo;
              delete (newSite as any).mcpServers;
              delete (newSite as any).mcpTextServerId;
              delete (newSite as any).mcpImageServerId;
              delete (newSite as any).mcpVideoServerId;
              delete (newSite as any).stripeConnection;
              delete (newSite as any).sundayServiceAutomation;
              delete (newSite.liveBroadcastAutomation as any)?.facebookLiveUrl;
              delete (newSite.liveBroadcastAutomation as any)?.youtubeLiveUrl;
              delete (newSite.liveBroadcastAutomation as any)?.tiktokLiveUrl;
              delete (newSite.liveBroadcastAutomation as any)?.xLiveUrl;
              delete (newSite.liveBroadcastAutomation as any)?.xComLiveUrl;

              // Migration for single source URLs to array-based sources
              if (site.rssFeedUrl && (!site.rssSources || site.rssSources.length === 0)) {
                newSite.rssSources = [{
                    id: crypto.randomUUID(),
                    url: site.rssFeedUrl,
                    name: site.rssFeedUrl,
                    processedRssGuids: site.processedRssGuids || []
                }];
              }
              if (site.googleSheetUrl && (!site.googleSheetSources || site.googleSheetSources.length === 0)) {
                  newSite.googleSheetSources = [{
                      id: crypto.randomUUID(),
                      url: site.googleSheetUrl,
                      name: site.googleSheetUrl,
                      processedGoogleSheetRows: site.processedGoogleSheetRows || []
                  }];
              }
              
              if ((newSite as any).generationSource) delete (newSite as any).generationSource;
              if (site.videoUrlList) newSite.videoSources = site.videoUrlList.split('\n').filter((url: string) => url.trim()).map((url: string) => ({ id: crypto.randomUUID(), url: url.trim(), type: 'video', name: url.trim().replace(/^\[DONE\]\s*/, ''), processedVideoGuids: url.trim().startsWith('[DONE]') ? [url.trim().replace(/^\[DONE\]\s*/, '')] : [] }));
              if (!site.references) newSite.references = [];
              if (site.scheduledPosts) delete site.scheduledPosts;
              if (site.socialGraphicPromptList) delete (newSite as any).socialGraphicPromptList;
              delete (newSite as any).rssFeedUrl;
              delete (newSite as any).processedRssGuids;
              delete (newSite as any).googleSheetUrl;
              delete (newSite as any).processedGoogleSheetRows;
              
              if (newSite.keywordList && !site.history) {
                const newHistory: PostHistoryItem[] = [];
                const newKeywordList: string[] = [];
                newSite.keywordList.split('\n').forEach((line: string) => {
                  const match = line.trim().match(/^\[DONE\]\s*(.*?)\s*—\s*(https?:\/\/\S+)\s*—\s*(\d{4}-\d{2}-\d{2})/);
                  if (match) {
                    newHistory.push({ id: crypto.randomUUID(), topic: match[1], url: match[2], date: new Date(match[3]).getTime(), type: 'Keyword' });
                    newKeywordList.push(`[DONE] ${match[1]}`);
                  } else { newKeywordList.push(line); }
                });
                if(newHistory.length > 0) {
                  newSite.history = [...newSite.history, ...newHistory];
                  newSite.keywordList = newKeywordList.join('\n');
                }
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
          googleSheetSources: [],
          rssSources: [],
          videoSources: [], references: [], monitoredBacklinks: [], authorName: settings.wordpressUsername || 'Admin', authorId: undefined, availableAuthors: [], availableCategories: [], isStrictCategoryMatching: false, history: [], monthlyGenerationsCount: 0,
          isAutomationEnabled: settings.isAutomationEnabled ?? false, automationTrigger: 'daily', automationDailyTime: '09:00', automationTimezone: defaultTimezone,
          lastAutoPilotRun: undefined,
          recurringSchedules: [], dailyGenerationSource: 'keyword', scheduleGenerationSource: 'keyword',
          isAutoPublishEnabled: true, drafts: [],
          isInPostImagesEnabled: false,
          numberOfInPostImages: 3,
          socialMediaSettings: defaultSocialSettings,
          mailchimpSettings: defaultMailchimpSettings,
          googleAnalyticsSettings: defaultAnalyticsSettings,
          clarityProjectId: '',
          supabaseConnection: defaultSupabaseConnection,
          paystackConnection: defaultPaystackConnection,
          payfastConnection: defaultPayfastConnection,
          wiseConnection: defaultWiseConnection,
          payoneerConnection: defaultPayoneerConnection,
          stripeConnection: defaultStripeConnection,
          payPalConnection: defaultPayPalConnection,
          modelConfig: defaultModelConfig,
          apiKeys: defaultApiKeys,
          apiUsage: defaultApiUsage,
          fetchedModels: {},
          isAssistantEnabled: true,
          isVoiceControlEnabled: true,
          isVideoControlEnabled: true,
          isTextControlEnabled: true,
          isSocialGraphicAutomationEnabled: false, socialGraphicAutomationTrigger: 'daily',
          isSocialGraphicAutoPublishEnabled: true,
          socialGraphicDailyTime: '14:00', lastSocialGraphicAutoPilotRun: undefined, socialGraphicRecurringSchedules: [],
          socialGraphicGenerationSource: 'keyword',
          isSocialVideoAutomationEnabled: false, socialVideoAutomationTrigger: 'daily',
          isSocialVideoAutoPublishEnabled: true,
          socialVideoDailyTime: '18:00', lastSocialVideoAutoPilotRun: undefined, socialVideoRecurringSchedules: [],
          socialVideoGenerationSource: 'keyword',
          isEmailMarketingAutomationEnabled: false, emailMarketingAutomationTrigger: 'daily',
          emailMarketingDailyTime: '10:00', lastEmailMarketingAutoPilotRun: undefined, emailMarketingRecurringSchedules: [],
          emailMarketingGenerationSource: 'newly_published_post',
          seoDataProvider: 'google_search', isLocalSeoEnabled: false, localSeoServiceArea: '', localSeoBusinessName: '', localSeoPhoneNumber: '',
          isAgencyAgentEnabled: false, agentCheckFrequencyHours: 24, agentActionOnDiscovery: 'addToReviewList', agencyAgentLogs: [], agentScheduledPosts: [], lastAgentRun: undefined,
          liveBroadcastAutomation: defaultLiveBroadcast,
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
        // A user is considered onboarded if they have a subscription plan OR if they have at least one site.
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

  useEffect(() => {
    const checkSession = async () => {
        let { user, impersonatingAdmin } = await authService.getCurrentUser();
        if (user) {
            setCurrentUser(user);
            if (impersonatingAdmin) {
                setImpersonatingUser(impersonatingAdmin);
            }
            if (user.isAdmin && !impersonatingAdmin) {
                setIsOnboarding(false);
            } else {
                const { sites: savedSites } = await storageService.loadSitesAndLastId(user);
                // A user is considered onboarded if they have a subscription plan OR if they have at least one site.
                if (user.subscriptionPlan || (savedSites && savedSites.length > 0)) {
                    setIsOnboarding(false);
                } else {
                    setIsOnboarding(true);
                }
                await loadUserData(user);
            }
        }
        setAuthLoading(false);
    };

    try {
      const handleAsyncCallback = async () => {
        const callbackData = oauthService.handleOAuthCallback();
        if (callbackData) {
            const { platform, siteId, accountId, code } = callbackData;
            
            const { user: activeUser } = await authService.getCurrentUser();
            if (!activeUser) {
                console.error("OAuth callback: No active user session.");
                toast.addToast("Your session expired. Please log in and try connecting again.", 'error');
                setAuthLoading(false);
                return;
            }
            setCurrentUser(activeUser);
            
            const { sites: userSites } = await storageService.loadSitesAndLastId(activeUser);
            const targetSite = userSites?.find(s => s.id === siteId);

            if (!targetSite) {
                console.error("OAuth callback: Could not find site for token exchange.");
                toast.addToast("Could not complete the connection process. Site details are missing.", 'error');
                setAuthLoading(false);
                return;
            }
            
            if (platform === 'meta') {
                const { metaClientId, metaClientSecret } = targetSite.socialMediaSettings;
                if (metaClientId && metaClientSecret) {
                    setIsConnectingSocial(`meta-${accountId}`);
                    try {
                        const { accessToken } = await oauthService.exchangeCodeForToken('meta', code, targetSite, accountId);
                        const userInfo = await oauthService.verifyConnection('meta', accessToken);
                        const assets = await oauthService.getMetaAssets(accessToken);
                        
                        const newMetaConnection: MetaConnection = {
                            id: crypto.randomUUID(),
                            name: userInfo.data.name,
                            userId: userInfo.data.id,
                            userAccessToken: accessToken,
                            isConnected: true,
                            status: 'connected',
                            statusMessage: 'Connected successfully!',
                            assets: assets.map(a => ({...a, isEnabled: true})) // Enable all assets by default
                        };
                        
                        const currentSettings = targetSite.socialMediaSettings;
                        targetSite.socialMediaSettings = { ...currentSettings, meta: [newMetaConnection] };
                        storageService.saveSites(userSites!, activeUser);
                    } catch (err) {
                        console.error("Failed to exchange Meta OAuth code for token:", err);
                        toast.addToast(`Failed to connect Meta: ${(err as Error).message}`, 'error');
                    } finally {
                        setIsConnectingSocial(null);
                    }
                }
            } else if (platform === 'meta_ads') {
                const { metaAdsClientId, metaAdsClientSecret } = targetSite.socialMediaSettings;
                if (metaAdsClientId && metaAdsClientSecret) {
                    setIsConnectingSocial(`meta_ads-${accountId}`);
                    try {
                        const { accessToken } = await oauthService.exchangeCodeForToken('meta_ads', code, targetSite, accountId);
                        const userInfo = await oauthService.verifyConnection('meta_ads', accessToken);
                        const adAccounts = await oauthService.getMetaAdAccounts(accessToken);
                        
                        const newMetaAdsConnection: MetaAdsConnection = {
                            id: crypto.randomUUID(),
                            name: userInfo.data.name,
                            userId: userInfo.data.id,
                            userAccessToken: accessToken,
                            isConnected: true,
                            status: 'connected',
                            statusMessage: 'Connected successfully!',
                            adAccounts: adAccounts.map(a => ({...a, isEnabled: true}))
                        };
                        
                        const currentSettings = targetSite.socialMediaSettings;
                        targetSite.socialMediaSettings = { ...currentSettings, meta_ads: [newMetaAdsConnection] };
                        storageService.saveSites(userSites!, activeUser);
                    } catch (err) {
                        console.error("Failed to exchange Meta Ads OAuth code for token:", err);
                        toast.addToast(`Failed to connect Meta Ads: ${(err as Error).message}`, 'error');
                    } finally {
                        setIsConnectingSocial(null);
                    }
                }
            } else if (platform === 'google_ads') {
                const { googleAdsClientId, googleAdsClientSecret } = targetSite.socialMediaSettings;
                if (googleAdsClientId && googleAdsClientSecret) {
                    setIsConnectingSocial(`google_ads-${accountId}`);
                    try {
                        const { accessToken } = await oauthService.exchangeCodeForToken('google_ads', code, targetSite, accountId);
                        const userInfo = await oauthService.verifyConnection('google_ads', accessToken);
                        const adAccounts = await oauthService.getGoogleAdAccounts(accessToken);
                        
                        const newGoogleAdsConnection: GoogleAdsConnection = {
                            id: crypto.randomUUID(),
                            name: userInfo.data.name,
                            userAccessToken: accessToken,
                            isConnected: true,
                            status: 'connected',
                            statusMessage: 'Connected successfully!',
                            adAccounts: adAccounts.map(a => ({...a, isEnabled: true}))
                        };
                        
                        const currentSettings = targetSite.socialMediaSettings;
                        targetSite.socialMediaSettings = { ...currentSettings, google_ads: [newGoogleAdsConnection] };
                        storageService.saveSites(userSites!, activeUser);
                    } catch (err) {
                        console.error("Failed to exchange Google Ads OAuth code for token:", err);
                        toast.addToast(`Failed to connect Google Ads: ${(err as Error).message}`, 'error');
                    } finally {
                        setIsConnectingSocial(null);
                    }
                }
            } else if (platform === 'google_analytics') {
                if (targetSite.googleAnalyticsSettings.clientId && targetSite.googleAnalyticsSettings.clientSecret) {
                    setIsConnectingSocial(`google_analytics-${accountId}`);
                    try {
                        const { accessToken } = await oauthService.exchangeCodeForToken('google_analytics', code, targetSite, accountId);
                        const properties = await googleAnalyticsService.getCoreMetrics(accessToken, 'DUMMY_ID').then(() => [
                            { id: 'properties/12345678', name: 'My Awesome Blog (GA4)' },
                            { id: 'properties/87654321', name: 'My Other Site (GA4)' },
                        ]);
                        
                        targetSite.googleAnalyticsSettings = {
                            ...targetSite.googleAnalyticsSettings,
                            isConnected: true,
                            accessToken,
                            statusMessage: 'Connected! Please select a property.',
                            availableProperties: properties
                        };
                        storageService.saveSites(userSites!, activeUser);
                    } catch (err) {
                        console.error("Failed to exchange GA OAuth code for token:", err);
                        toast.addToast(`Failed to connect Google Analytics: ${(err as Error).message}`, 'error');
                    } finally {
                        setIsConnectingSocial(null);
                    }
                }
            } else if (platform === 'google_calendar') {
                const { googleCalendarClientId, googleCalendarClientSecret } = targetSite.socialMediaSettings;
                if (googleCalendarClientId && googleCalendarClientSecret) {
                    setIsConnectingSocial(`google_calendar-${accountId}`);
                    try {
                        const { accessToken } = await oauthService.exchangeCodeForToken('google_calendar', code, targetSite, accountId);
                        const calendars = await googleCalendarService.fetchCalendarList(accessToken);
                        const primaryCalendar = calendars.find(c => c.primary) || calendars[0];
                        
                        targetSite.googleCalendarConnection = {
                            isConnected: true,
                            accessToken,
                            statusMessage: 'Connected! A primary calendar has been selected.',
                            availableCalendars: calendars,
                            primaryCalendarId: primaryCalendar?.id || ''
                        };
                        storageService.saveSites(userSites!, activeUser);
                    } catch (err) {
                        console.error("Failed to connect Google Calendar:", err);
                        toast.addToast(`Failed to connect Google Calendar: ${(err as Error).message}`, 'error');
                    } finally {
                        setIsConnectingSocial(null);
                    }
                }
            } else { // Handle social media connections
                const platformKey = platform as any;
                const accountsForPlatform = targetSite?.socialMediaSettings[platformKey as keyof SocialMediaSettings];
                const targetAccount = Array.isArray(accountsForPlatform) ? accountsForPlatform.find((acc: any) => acc.id === accountId) : undefined;
    
                if (targetAccount && 'clientId' in targetAccount && targetAccount.clientId && 'clientSecret' in targetAccount && targetAccount.clientSecret) {
                    setIsConnectingSocial(`${platform}-${accountId}`);
                    try {
                        const { accessToken } = await oauthService.exchangeCodeForToken(platform as any, code, targetSite, accountId);
                        targetAccount.isConnected = true;
                        targetAccount.accessToken = accessToken;
                        targetAccount.status = 'connected';
                        targetAccount.statusMessage = '';
                        storageService.saveSites(userSites!, activeUser);
                    } catch (err) {
                        console.error("Failed to exchange OAuth code for token:", err);
                        toast.addToast(`Failed to connect ${platform}: ${(err as Error).message}`, 'error');
                    } finally {
                        setIsConnectingSocial(null);
                    }
                } else {
                    console.error("OAuth callback: Could not find account credentials for token exchange.");
                    toast.addToast("Could not complete the connection process. Account details are missing.", 'error');
                }
            }
            
            await loadUserData(activeUser);
            setSelectedSiteId(siteId);
            setActiveTab('connections');
        }
      };

      handleAsyncCallback().then(() => {
        checkSession();
      });

    } catch (error: any) { 
        console.warn("Could not load settings from storage:", error); 
        setAuthLoading(false);
    }
  }, [loadUserData, toast]);
  
  // This effect sets a timer to automatically downgrade a user when their trial expires,
  // without requiring them to refresh the page.
  useEffect(() => {
    let trialEndTimer: number | null = null;

    // Check if the user is on an active trial
    if (currentUser?.trialEndsAt && currentUser.trialEndsAt > Date.now()) {
      const msUntilExpiry = currentUser.trialEndsAt - Date.now();
      
      // Set a timeout for the exact moment the trial ends
      trialEndTimer = window.setTimeout(async () => {
        if (currentUser) { // Check if user is still logged in
            console.log("User trial has ended. Downgrading to free plan in the background.");
            try {
              const updatedUser = await authService.updateUser(currentUser.email, {
                subscriptionPlan: 'free',
                trialEndsAt: undefined // Remove the trial property
              });
              // Update the user state in the app to reflect the change immediately
              setCurrentUser(updatedUser);
            } catch (e) {
              console.error("Failed to automatically downgrade user after trial:", e);
              // The user will be downgraded on the next refresh by the logic in getCurrentUser anyway.
            }
        }
      }, msUntilExpiry);
    }

    // Cleanup function to clear the timer if the component unmounts or the user changes
    return () => {
      if (trialEndTimer) {
        clearTimeout(trialEndTimer);
      }
    };
  }, [currentUser]); // This effect re-runs whenever the user state changes.

  const logApiUsage = useCallback((provider: keyof ApiKeys, cost: number) => {
    if (!selectedSiteId || !provider || cost === 0) return;
    setSites(prevSites =>
        prevSites.map(site => {
            if (site.id === selectedSiteId) {
                const currentCost = site.apiUsage?.[provider] || 0;
                const newApiUsage = { ...(site.apiUsage || {}), [provider]: currentCost + cost };
                return { ...site, apiUsage: newApiUsage };
            }
            return site;
        })
    );
  }, [selectedSiteId]);
  
  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (!currentUser || currentUser.isAdmin) return;
    
    if (!isInitialMount.current) {
      setSaveStatus('saving');
    }

    saveTimeoutRef.current = window.setTimeout(async () => {
        try {
            if (sites.length > 0) {
                await storageService.saveSites(sites, currentUser);
                if (selectedSiteId) {
                    await storageService.saveLastSelectedSiteId(currentUser.uid, selectedSiteId);
                }
            } else {
                await storageService.clearAllSitesData(currentUser);
            }
            
            if (isInitialMount.current) {
                isInitialMount.current = false;
            } else {
                setSaveStatus('saved');
                saveTimeoutRef.current = window.setTimeout(() => setSaveStatus('idle'), 2000);
            }
        } catch (error: any) {
            console.warn("Could not save settings to storage:", error);
            if (!isInitialMount.current) {
                setSaveStatus('idle');
            }
        }
    }, 1500);

    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [sites, selectedSiteId, currentUser]);
  
  // This effect listens for changes in localStorage made by the background
  // automation service and reloads the UI state to reflect those changes.
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      const userSitesKey = currentUser ? `zenith-engine-ai-sites-${currentUser.uid}` : null; // Fixed: Use UID for key
      if (event.key === userSitesKey && currentUser) {
        console.log('Storage changed by background process, reloading UI...');
        loadUserData(currentUser);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [currentUser, loadUserData]);

  const handleSiteUpdate = useCallback((field: keyof Site, value: any) => {
    if (!selectedSiteId) return;
    setSites(prevSites =>
      prevSites.map(site =>
        site.id === selectedSiteId ? { ...site, [field]: value } : site
      )
    );
  }, [selectedSiteId]);
  
  const handleMultipleSiteUpdates = useCallback((updates: Partial<Site>) => {
    if (!selectedSiteId) return;
    setSites(prevSites =>
      prevSites.map(site =>
        site.id === selectedSiteId ? { ...site, ...updates } : site
      )
    );
  }, [selectedSiteId]);

  const handleResetAllSitesSpend = useCallback(() => {
    setSites(prevSites => 
        prevSites.map(site => {
            const resetUsage: Partial<Record<keyof ApiKeys, number>> = {};
            for (const key in site.apiKeys) {
                resetUsage[key as keyof ApiKeys] = 0;
            }
            return { ...site, apiUsage: resetUsage };
        })
    );
  }, []);

  const handleAddNewSite = useCallback(() => {
    if (sites.length >= planAccess.siteLimit) {
        toast.addToast(`You have reached the ${planAccess.plan} plan's limit of ${planAccess.siteLimit} site(s). Please upgrade to add more.`, 'error');
        setActiveTab('subscription');
        return;
    }

    const defaultTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const newSite: Site = {
      id: crypto.randomUUID(), name: `New Site ${sites.length + 1}`, wordpressUrl: '', wordpressUsername: '', applicationPassword: '',
      brandGuideline: '', brandLogoLight: '', brandLogoDark: '', brandColors: '', brandFonts: '', characterReferences: [], promoLink1: '', promoLink2: '', keywordList: '',
      googleSheetSources: [],
      rssSources: [],
      videoSources: [], references: [], monitoredBacklinks: [], authorName: '', authorId: undefined, availableAuthors: [], availableCategories: [], isStrictCategoryMatching: false, history: [], monthlyGenerationsCount: 0,
      isAutomationEnabled: false, automationTrigger: 'daily', automationDailyTime: '09:00', automationTimezone: defaultTimezone, lastAutoPilotRun: undefined, recurringSchedules: [],
      isAutoPublishEnabled: true, drafts: [],
      dailyGenerationSource: 'keyword', scheduleGenerationSource: 'keyword',
      isInPostImagesEnabled: false,
      numberOfInPostImages: 3,
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
      modelConfig: { 
        textProvider: AiProvider.GOOGLE, textModel: AVAILABLE_MODELS.GOOGLE.text[0], 
        imageProvider: AiProvider.GOOGLE, imageModel: AVAILABLE_MODELS.GOOGLE.image[0],
        videoProvider: AiProvider.GOOGLE, videoModel: AVAILABLE_MODELS.GOOGLE.video[0],
      },
      apiKeys: { google: '', openAI: '', anthropic: '', openRouter: '', xai: '', replicate: '', openArt: '', dataforseo: '' },
      apiUsage: { google: 0, openAI: 0, anthropic: 0, openRouter: 0, xai: 0, replicate: 0, openArt: 0, dataforseo: 0 },
      fetchedModels: {},
      isAssistantEnabled: true,
      isVoiceControlEnabled: true,
      isVideoControlEnabled: true,
      isTextControlEnabled: true,
      isSocialGraphicAutomationEnabled: false, socialGraphicAutomationTrigger: 'daily',
      isSocialGraphicAutoPublishEnabled: true,
      socialGraphicDailyTime: '14:00', lastSocialGraphicAutoPilotRun: undefined, socialGraphicRecurringSchedules: [],
      socialGraphicGenerationSource: 'keyword',
      isSocialVideoAutomationEnabled: false, socialVideoAutomationTrigger: 'daily',
      isSocialVideoAutoPublishEnabled: true,
      socialVideoDailyTime: '18:00', lastSocialVideoAutoPilotRun: undefined, socialVideoRecurringSchedules: [],
      socialVideoGenerationSource: 'keyword',
      isEmailMarketingAutomationEnabled: false, emailMarketingAutomationTrigger: 'daily',
      emailMarketingDailyTime: '10:00', lastEmailMarketingAutoPilotRun: undefined, emailMarketingRecurringSchedules: [],
      emailMarketingGenerationSource: 'newly_published_post',
      seoDataProvider: 'google_search', isLocalSeoEnabled: false, localSeoServiceArea: '', localSeoBusinessName: '', localSeoPhoneNumber: '',
      isAgencyAgentEnabled: false, agentCheckFrequencyHours: 24, agentActionOnDiscovery: 'addToReviewList', agencyAgentLogs: [], agentScheduledPosts: [], lastAgentRun: undefined,
      liveBroadcastAutomation: { isEnabled: false, sourceType: 'meta', facebookPageId: '', facebookPageUrl: '', youtubeChannelUrl: '', tiktokProfileUrl: '', xProfileUrl: '', scheduleType: 'monitor', broadcastDay: 0, broadcastStartTime: '10:00', broadcastEndTime: '12:00', dailyPostTimes: ['09:00', '17:00'], status: 'idle', currentWeekClips: [], youtubeSourceMethod: 'url', tiktokSourceMethod: 'url', xSourceMethod: 'url' },
    };
    setSites(prevSites => [...prevSites, newSite]);
    setSelectedSiteId(newSite.id);
  }, [sites.length, planAccess, toast]);
  
  const handleOpenDeleteDialog = useCallback(() => {
      setIsDeleteDialogOpen(true);
      setDeleteConfirmationInput('');
  }, []);

  const handleDeleteSite = useCallback(() => {
    if (selectedSite && deleteConfirmationInput === selectedSite.name) {
      setSites(prevSites => {
        const remainingSites = prevSites.filter(s => s.id !== selectedSite.id);
        if (remainingSites.length > 0) {
          setSelectedSiteId(remainingSites[0].id);
        } else {
          setSelectedSiteId(null);
        }
        return remainingSites;
      });
      setIsDeleteDialogOpen(false);
    } else {
      toast.addToast("Confirmation text does not match the site name.", 'error');
    }
  }, [selectedSite, deleteConfirmationInput, toast]);
  
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
        } catch (e: any) {
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

  // CRITICAL CHANGE: Check if backend is configured. If not, show setup wizard.
  // This blocks normal authentication flow until the admin sets up the connection.
  if (!isBackendConfigured()) {
      return <BackendSetupWizard />;
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
    <div className="h-full w-full flex flex-col md:flex-row bg-app text-main transition-colors duration-300">
      {isSidebarOpen && (
          <div 
              onClick={() => setIsSidebarOpen(false)} 
              className="fixed inset-0 bg-black/60 z-20 md:hidden backdrop-blur-sm"
              aria-hidden="true"
          />
      )}
      {/* --- SIDEBAR --- */}
      <aside className={`group/sidebar absolute md:relative z-30 w-64 md:w-20 lg:w-64 md:hover:w-64 bg-panel border-r border-border flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="h-16 flex-shrink-0 flex items-center justify-between px-4 lg:px-6 border-b border-border bg-panel-solid">
            <div className="flex items-center gap-3">
                <LogoIcon className="h-7 w-7 text-brand-primary" />
                <span className="font-bold text-xl text-main md:hidden lg:inline group-hover/sidebar:inline">{APP_TITLE}</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 -mr-2 text-sub hover:text-main md:hidden"><XIcon className="h-6 w-6"/></button>
        </div>
        <div className="flex-1 min-h-0 flex flex-col">
            <div className="p-4 border-b border-border">
                <div className="flex items-center gap-2">
                    <select value={selectedSiteId || ''} onChange={(e) => setSelectedSiteId(e.target.value)} className="input-base px-3 py-2 text-sm w-full truncate flex-1">
                        {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    
                    {selectedSite && (
                        <div className="relative group flex-shrink-0">
                            <button
                                onClick={() => setActiveTab('automation')}
                                className="relative w-9 h-9 rounded-lg bg-panel-light border border-border-subtle hover:border-brand-primary hover:bg-bg-surface-highlight transition-colors flex items-center justify-center"
                                aria-label="Automation Status"
                            >
                                <div className="relative flex h-4 w-4">
                                    {isAnyAutomationReady && (
                                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75`}></span>
                                    )}
                                    <span className={`relative inline-flex rounded-full h-full w-full ${automationStatusColor}`}></span>
                                </div>
                            </button>
                            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 w-max bg-panel p-3 rounded-lg border border-border text-sm text-text-secondary shadow-lg opacity-0 invisible group-hover:visible group-hover:opacity-100 transition-all z-40 pointer-events-none">
                                <h4 className="font-bold text-main mb-2 text-base">Automation Status</h4>
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
                </div>
                <button onClick={handleAddNewSite} className="w-full mt-3 btn btn-secondary text-xs py-1.5 flex items-center justify-center gap-2">
                    <span className="text-lg font-light leading-none">+</span> New Site
                </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                {[
                    { id: 'dashboard', label: 'Mission Control', icon: HomeIcon },
                    { id: 'content', label: 'Content Hub', icon: DocumentTextIcon },
                    { id: 'authority', label: 'Authority Suite', icon: LightbulbIcon, locked: !planAccess.canUseAuthority },
                    { id: 'automation', label: 'Automation', icon: ClockIcon, locked: !planAccess.canUseBlogAutomation },
                    { id: 'advertising', label: 'Advertising', icon: ChartBarIcon, locked: !planAccess.canUseAdvertising },
                    { id: 'branding', label: 'Branding', icon: SparklesIcon },
                    { id: 'connections', label: 'Connections', icon: LinkIcon },
                    { id: 'analytics', label: 'Analytics', icon: ChartBarIcon, locked: !planAccess.canUseAnalytics },
                    { id: 'api-spend', label: 'API & Spend', icon: KeyIcon, mt: true },
                    { id: 'settings', label: 'Settings', icon: Cog6ToothIcon },
                ].map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        disabled={item.locked}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative ${
                            activeTab === item.id 
                                ? 'bg-brand-primary/10 text-brand-primary' 
                                : item.locked 
                                    ? 'text-tertiary cursor-not-allowed opacity-60' 
                                    : 'text-sub hover:bg-bg-surface-highlight hover:text-main'
                        } ${item.mt ? 'mt-6' : ''}`}
                    >
                        {activeTab === item.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-brand-primary rounded-r-full" />}
                        <item.icon className={`h-5 w-5 flex-shrink-0 ${activeTab === item.id ? 'text-brand-primary' : 'text-sub group-hover:text-main'}`} />
                        <span className="whitespace-nowrap opacity-100 md:opacity-0 lg:opacity-100 group-hover/sidebar:opacity-100 transition-opacity delay-75">{item.label}</span>
                        {item.locked && (
                            <span className="ml-auto text-[10px] uppercase font-bold text-tertiary border border-border px-1.5 rounded opacity-100 md:opacity-0 lg:opacity-100 group-hover/sidebar:opacity-100 transition-opacity">
                                Lock
                            </span>
                        )}
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-border bg-panel-solid">
                <button 
                    onClick={() => setIsProfileModalOpen(true)}
                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-bg-surface-highlight transition-colors group text-left"
                >
                    <div className="h-9 w-9 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-sm border border-brand-primary/20 flex-shrink-0">
                        {currentUser.firstName?.[0] || currentUser.email[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0 opacity-100 md:opacity-0 lg:opacity-100 group-hover/sidebar:opacity-100 transition-opacity">
                        <p className="text-sm font-medium text-main truncate">{currentUser.firstName || 'User'}</p>
                        <div className={`text-[10px] px-1.5 py-0.5 rounded-full inline-block mt-0.5 font-bold uppercase tracking-wider border ${planPillClasses[planAccess.plan].replace('bg-', 'bg-opacity-20 ')}`}>
                            {planAccess.plan}
                        </div>
                    </div>
                </button>
                <div className="flex items-center justify-between mt-3 opacity-100 md:opacity-0 lg:opacity-100 group-hover/sidebar:opacity-100 transition-opacity px-2">
                     <button onClick={toggleTheme} className="p-1.5 text-sub hover:text-main hover:bg-panel-light rounded transition-colors" title="Toggle Theme">
                        {theme === 'dark' ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
                    </button>
                    <button onClick={() => authService.signOut().then(() => window.location.reload())} className="p-1.5 text-sub hover:text-red-400 hover:bg-red-900/20 rounded transition-colors" title="Sign Out">
                        <SignOutIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <div className="flex-1 flex flex-col min-w-0 bg-app h-full relative">
        <header className="md:hidden h-16 bg-panel border-b border-border flex items-center justify-between px-4 flex-shrink-0 sticky top-0 z-20">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-sub hover:text-main"><MenuIcon className="h-6 w-6"/></button>
            <span className="font-bold text-lg text-main truncate">{selectedSite?.name}</span>
            <div className="w-9 h-9 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold border border-brand-primary/20">
                {currentUser.firstName?.[0] || 'U'}
            </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth relative">
            <div className="max-w-7xl mx-auto pb-20">
                {isTrialBannerVisible && currentUser.trialEndsAt && currentUser.trialEndsAt > Date.now() && (
                    <div className="mb-6 bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500/20 rounded-lg text-purple-300">
                                <SparklesIcon className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="font-bold text-white text-sm">Agency Plan Trial Active</p>
                                <p className="text-xs text-purple-200/80 mt-0.5">You have {trialDaysLeft} days left to experience unlimited power.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button onClick={() => setActiveTab('subscription')} className="btn btn-primary text-xs px-4 py-2 w-full sm:w-auto">Upgrade Now</button>
                            <button onClick={() => setIsTrialBannerVisible(false)} className="p-1.5 text-purple-300/60 hover:text-white rounded-full"><XIcon className="h-4 w-4" /></button>
                        </div>
                    </div>
                )}

                <ActiveComponent 
                    status={status}
                    blogPost={blogPost}
                    publishedPostUrl={publishedPostUrl}
                    lastGeneratedSocialPosts={lastGeneratedSocialPosts}
                    site={selectedSite!}
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
        </main>
      </div>

      {/* --- MODALS & OVERLAYS --- */}
      <GlobalAutomationTracker 
          isOpen={isTrackerModalOpen} 
          onClose={() => setIsTrackerModalOpen(false)} 
          sites={sites}
          onActiveJobsChange={(hasJobs) => {
              const badge = document.getElementById('tracker-badge');
              if(badge) badge.style.display = hasJobs ? 'block' : 'none';
          }}
      />

      <AssistantUI
          site={selectedSite!}
          actions={{
              onFindNextTopic: () => {
                  const next = selectedSite!.keywordList.split('\n').find(k => k.trim() && !k.trim().startsWith('[DONE]'));
                  return next || "No topics found.";
              },
              onResearchKeyword: async (keyword) => {
                  const { suggestions } = await suggestKeywords(keyword, selectedSite!);
                  return suggestions[0] || keyword;
              },
              onBrainstormAndAddTopics: async ({ query, count }) => {
                  const { suggestions } = await suggestKeywords(query, selectedSite!);
                  const newTopics = suggestions.slice(0, count);
                  const newList = selectedSite!.keywordList ? `${selectedSite!.keywordList}\n${newTopics.join('\n')}` : newTopics.join('\n');
                  handleSiteUpdate('keywordList', newList);
                  return `Added ${newTopics.length} new topics about "${query}".`;
              },
              onGenerateArticle: async (topic) => {
                  generateAndScorePost(topic, 'keyword', topic, selectedSite!);
                  return `Started generating article for "${topic}". Check the UI for progress.`;
              },
              onUpdateSiteField: (field, value) => {
                  handleSiteUpdate(field, value);
                  return `Updated ${String(field)} to ${value}.`;
              },
              onRunSocialGraphicAutomation: async () => {
                  return "Social graphic automation triggered (simulation).";
              },
              onRunSocialVideoAutomation: async () => {
                  return "Social video automation triggered (simulation).";
              },
              onNavigateToTab: ({ tab, subTab }) => {
                  const tabIdMap: Record<string, string> = {
                      'Dashboard': 'dashboard', 'Content Hub': 'content', 'Automation': 'automation',
                      'Branding': 'branding', 'Connections': 'connections', 'Settings': 'settings'
                  };
                  const targetTab = tabIdMap[tab] || tab.toLowerCase();
                  setActiveTab(targetTab, subTab ? subTab.toLowerCase() : null);
                  return `Navigated to ${tab}.`;
              },
              onGetAutomationStatus: () => {
                  return JSON.stringify({
                      isWordPressConnected: !!(selectedSite!.wordpressUrl && selectedSite!.wordpressUsername),
                      hasContentSources: selectedSite!.keywordList.length > 0 || selectedSite!.rssSources.length > 0,
                      isBlogAutomationEnabled: selectedSite!.isAutomationEnabled,
                      automationTrigger: selectedSite!.automationTrigger,
                      blogSource: selectedSite!.automationTrigger === 'daily' ? selectedSite!.dailyGenerationSource : selectedSite!.scheduleGenerationSource,
                      isSocialGraphicEnabled: selectedSite!.isSocialGraphicAutomationEnabled,
                      isSocialVideoEnabled: selectedSite!.isSocialVideoAutomationEnabled
                  });
              },
              onUpdateAutomationSetting: ({ settingName, settingValue }) => {
                  let value = settingValue;
                  if (value === 'true') value = true;
                  if (value === 'false') value = false;
                  handleSiteUpdate(settingName, value);
                  return `Updated ${settingName} to ${value}.`;
              }
          }}
      />

      {isHelpGuideOpen && <HelpGuide onClose={() => setIsHelpGuideOpen(false)} />}
      
      {/* Profile Modal */}
      <ProfileModal 
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onUserUpdate={handleUserUpdate}
        onSignOut={() => { handleSignOut(); setIsProfileModalOpen(false); }}
        planAccess={planAccess}
        onManageSubscription={handleManageSubscription}
      />

      {/* Viewing History Item Modal */}
      {viewingHistoryItem && selectedSite && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setViewingHistoryItem(null)}>
            <div className="bg-panel rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] border border-border flex flex-col animate-modal-pop" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-border flex justify-between items-center bg-panel-solid rounded-t-xl">
                    <h2 className="font-bold text-main text-lg flex items-center gap-2">
                        <DocumentTextIcon className="h-5 w-5 text-brand-primary"/>
                        Post Details
                    </h2>
                    <button onClick={() => setViewingHistoryItem(null)} className="p-2 text-sub hover:text-main rounded-full hover:bg-panel-light transition-colors"><XIcon className="h-6 w-6"/></button>
                </header>
                <div className="flex-1 overflow-y-auto p-6">
                    <HistoryDetailViewer post={viewingHistoryItem} site={selectedSite} />
                </div>
            </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-panel rounded-xl shadow-2xl w-full max-w-md p-6 border border-red-500/50 animate-modal-pop">
                <div className="flex items-start gap-4">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-900/50 sm:mx-0 sm:h-10 sm:w-10"><ExclamationTriangleIcon className="h-6 w-6 text-red-400" /></div>
                    <div className="mt-0 text-left flex-1">
                        <h3 className="text-lg font-bold text-main">Delete Site</h3>
                        <div className="text-sm text-sub mt-2">
                            <p>This will permanently delete <strong className="text-red-300">{selectedSite?.name}</strong> and all its data.</p>
                            <p className="mt-2">This action is irreversible. To proceed, please type the site name below.</p>
                        </div>
                        <input type="text" value={deleteConfirmationInput} onChange={e => setDeleteConfirmationInput(e.target.value)} className="input-base mt-4 px-3 py-2 w-full" placeholder={selectedSite?.name} />
                    </div>
                </div>
                <div className="mt-6 flex flex-row-reverse gap-3">
                    <button type="button" className="w-full sm:w-auto btn bg-red-600 hover:bg-red-700 text-white disabled:opacity-50" onClick={handleDeleteSite} disabled={deleteConfirmationInput !== selectedSite?.name}>Delete</button>
                    <button type="button" className="w-full sm:w-auto btn btn-secondary" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</button>
                </div>
            </div>
        </div>
      )}
      
      {/* Automation Tracker FAB (only if jobs running) */}
      <button 
        onClick={() => setIsTrackerModalOpen(true)}
        className="fixed bottom-6 left-6 z-40 bg-panel border border-border p-3 rounded-full shadow-xl hover:scale-105 transition-transform group"
        title="View Active Automations"
      >
        <div id="tracker-badge" className="absolute top-0 right-0 w-3 h-3 bg-brand-primary rounded-full hidden"></div>
        <ClockIcon className="h-6 w-6 text-brand-primary group-hover:animate-spin" />
      </button>

    </div>
  );
};
