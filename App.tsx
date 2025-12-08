
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { AppStatus, AiProvider, SubscriptionPlan, AutomationWorkflow } from './types';
import { AVAILABLE_MODELS } from './types';
import type { BlogPost, Site, RssItem, PostHistoryItem, ApiKeys, SocialMediaPost, SocialMediaSettings, Draft, WhatsAppAccount, TelegramAccount, SocialMediaAccount, StrategicBrief, SeoChecklist, RssSource, GoogleSheetSource, CharacterReference, MailchimpSettings, ModelConfig, GoogleAnalyticsSettings, User, MetaConnection, SupabaseConnection, MetaAsset, SocialAccountStatus, MetaAdsConnection, GoogleAdsConnection, PaystackConnection, PayfastConnection, WiseConnection, LiveBroadcastAutomation, GoogleCalendarConnection, PayoneerConnection, StripeConnection, PayPalConnection } from './types';
import * as aiService from './services/aiService';
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
    KeyIcon, BuildingOffice2Icon, SunIcon, MoonIcon, ArrowRightIcon
} from './components/Icons';
import { HistoryDetailViewer } from './components/HistoryDetailViewer';
import { AutomationDashboard } from './components/AutomationDashboard';
import { ArticleViewer } from './components/ArticleViewer';
import { SettingsTab } from './components/SettingsTab';
import { PublishSuccessViewer } from './components/PublishSuccessViewer';
import { DashboardTab } from './components/DashboardTab';
import { ContentHubTab } from './components/ContentHubTab';
import { GlobalAutomationTracker, AutomationJob } from './components/GlobalAutomationTracker';
import { SimulationWorker } from './components/SimulationWorker';
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
    creator: 'bg-brand-primary/10 text-brand-primary border border-brand-primary/60 shadow-[0_0_8px_theme(colors.brand.primary/30)]',
    pro: 'bg-white/10 text-white border border-white/30 shadow-[0_0_8px_theme(colors.white/20)]',
    agency: 'bg-brand-primary/20 text-brand-primary border border-brand-primary/80 shadow-[0_0_10px_theme(colors.brand.primary/40)]',
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
    handleVerifyCredentialBasedConnection: (platformId: string, account: any) => void;
    onDiscardDraft: (draftId: string) => void;
    onRefreshAnalytics: () => Promise<void>;
    onRefreshClarityData: () => Promise<void>;
    currentUser: User;
    handleUpdatePlan: (plan: SubscriptionPlan, cycle?: 'monthly' | 'yearly') => Promise<void>;
    planAccess: any; 
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
        <div className="flex flex-col items-center justify-center min-h-[50vh]" role="status" aria-live="polite">
            <div className="relative">
                <div className="absolute inset-0 bg-brand-primary/20 blur-xl rounded-full"></div>
                <svg className="animate-spin h-14 w-14 text-brand-primary relative z-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
            <h2 className="text-xl font-bold mt-8 text-main animate-pulse">{statusMessage}</h2>
            <p className="text-sub mt-2 text-sm">{messages[messageIndex]}</p>
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
                    planAccess={planAccess}
                />;
      case 'authority':
        if (!planAccess.canUseAuthority) return <UpgradePlan featureName="The Authority Suite" requiredPlan="Pro" setActiveTab={setActiveTab} />;
        return <AuthorityTab site={site} onSiteUpdate={handleSiteUpdate} logApiUsage={logApiUsage} setError={(err) => console.error(err)} />;
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
                    setError={(err) => console.error(err)}
                />;
      case 'connections':
        return <ConnectionsTab
                    site={site}
                    onSiteUpdate={handleSiteUpdate}
                    onMultipleSiteUpdates={handleMultipleSiteUpdates}
                    isConnectingSocial={isConnectingSocial}
                    setError={(err) => console.error(err)}
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
                    setError={(err) => console.error(err)}
                    currentUser={currentUser}
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
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [isTrackerModalOpen, setIsTrackerModalOpen] = useState(false);
  const [hasActiveJobs, setHasActiveJobs] = useState(false);
  
  const [activeTab, setActiveTabState] = useState('dashboard');
  const [activeSubTab, setActiveSubTab] = useState<AutomationWorkflow | string | null>(null);
  const [isTrialBannerVisible, setIsTrialBannerVisible] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  const mainContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      const storedTheme = localStorage.getItem('zenith-theme') as 'dark' | 'light' | null;
      if (storedTheme) {
          setTheme(storedTheme);
          if (storedTheme === 'light') {
              document.documentElement.classList.add('light');
          }
      }
  }, []);

  const toggleTheme = () => {
      const newTheme = theme === 'dark' ? 'light' : 'dark';
      setTheme(newTheme);
      localStorage.setItem('zenith-theme', newTheme);
      if (newTheme === 'light') {
          document.documentElement.classList.add('light');
      } else {
          document.documentElement.classList.remove('light');
      }
  };

  const setActiveTab = (tab: string, subTab: string | null = null) => {
      setActiveTabState(tab);
      setActiveSubTab(subTab);
      if (!subTab) {
          setActiveSubTab(null);
      }
      setIsSidebarOpen(false);
      
      if (mainContentRef.current) {
          mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
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
      if (!isAnyAutomationEnabled) return 'bg-gray-700 border-gray-600'; 
      return isAnyAutomationReady ? 'bg-brand-primary border-brand-primary' : 'bg-white border-white'; 
  }, [isAnyAutomationEnabled, isAnyAutomationReady]);
  
  const trialDaysLeft = useMemo(() => {
    if (!currentUser?.trialEndsAt) return 0;
    const timeLeft = currentUser.trialEndsAt - Date.now();
    return Math.max(0, Math.ceil(timeLeft / (1000 * 60 * 60 * 24)));
  }, [currentUser]);

  useEffect(() => {
    if (isTrialBannerVisible) {
        const timer = setTimeout(() => setIsTrialBannerVisible(false), 60000);
        return () => clearTimeout(timer);
    }
  }, [isTrialBannerVisible]);

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
      await storageService.migrateGuestDataToUser(user);
      const { sites: savedSites, lastSelectedId } = await storageService.loadSitesAndLastId(user);
      
      let finalSites: Site[] = [];
      const defaultApiKeys: ApiKeys = { google: '', openAI: '', anthropic: '', openRouter: '', xai: '', replicate: '', openArt: '', dataforseo: '' };
      
      if (savedSites) {
          finalSites = savedSites.map((site: any): Site => {
              return { ...site, apiKeys: { ...defaultApiKeys, ...site.apiKeys } };
          });
      }
      setSites(finalSites);
      
      if (lastSelectedId && finalSites.some(s => s.id === lastSelectedId)) {
        setSelectedSiteId(lastSelectedId);
      } else if (finalSites.length > 0) {
        setSelectedSiteId(finalSites[0].id);
      }
    } catch (error: any) {
        console.warn("Could not load user data from storage:", error);
    } finally {
        setIsDataLoaded(true);
    }
  }, []);

  const handleAuthSuccess = useCallback((user: User) => {
    setCurrentUser(user);
    if (!user.isAdmin) {
       loadUserData(user).then(() => {
       });
    } else {
        // Admin doesn't need to load normal user sites immediately, or handles differently
        setIsDataLoaded(true);
    }
  }, [loadUserData]);

  const handleSignOut = useCallback(() => {
    authService.signOut();
    setCurrentUser(null);
    setSites([]);
    setSelectedSiteId(null);
    setImpersonatingUser(null);
    setIsOnboarding(false);
    setIsDataLoaded(false);
  }, []);
  
  useEffect(() => {
    const checkSession = async () => {
        let { user, impersonatingAdmin } = await authService.getCurrentUser();
        if (user) {
            setCurrentUser(user);
            if (impersonatingAdmin) setImpersonatingUser(impersonatingAdmin);
            
            if (user.isAdmin && !impersonatingAdmin) {
                setIsOnboarding(false);
                setIsDataLoaded(true);
            } else {
                await loadUserData(user);
            }
        }
        setAuthLoading(false);
    };
    checkSession();
  }, [loadUserData]);

  useEffect(() => {
      if (!currentUser || currentUser.isAdmin) return;
      if (sites.length > 0 || currentUser.subscriptionPlan !== 'free') { 
          setIsOnboarding(false);
      }
  }, [sites, currentUser]);

  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (!currentUser || currentUser.isAdmin) return;
    
    // GUARD: Ensure we don't save empty state over existing data during initialization
    if (!isDataLoaded) return;

    if (!isInitialMount.current) {
      setSaveStatus('saving');
    }

    saveTimeoutRef.current = window.setTimeout(() => {
        try {
            if (sites.length > 0) {
                storageService.saveSites(sites, currentUser);
                if (selectedSiteId) {
                    storageService.saveLastSelectedSiteId(currentUser.uid, selectedSiteId);
                }
            } else {
                storageService.clearAllSitesData(currentUser);
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
  }, [sites, selectedSiteId, currentUser, isDataLoaded]);

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

  const handleSiteUpdate = useCallback((field: keyof Site, value: any) => {
      setSites(prev => prev.map(s => s.id === selectedSiteId ? { ...s, [field]: value } : s));
  }, [selectedSiteId]);

  const handleMultipleSiteUpdates = useCallback((updates: Partial<Site>) => {
      setSites(prev => prev.map(s => s.id === selectedSiteId ? { ...s, ...updates } : s));
  }, [selectedSiteId]);

  const logApiUsage = useCallback((provider: keyof ApiKeys, cost: number) => {
      if (!selectedSiteId) return;
      setSites(prev => prev.map(s => {
          if (s.id !== selectedSiteId) return s;
          const currentUsage = s.apiUsage?.[provider] || 0;
          return { ...s, apiUsage: { ...s.apiUsage, [provider]: currentUsage + cost } };
      }));
  }, [selectedSiteId]);

  const handleResetAllSitesSpend = useCallback(() => {
      if (window.confirm("Are you sure you want to reset API spend for ALL sites?")) {
          setSites(prev => prev.map(s => ({ ...s, apiUsage: {} })));
          toast.addToast("API spend reset for all sites.", 'success');
      }
  }, [toast]);

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

  const handleConnectSocialMedia = useCallback((platform: any, accountId: string) => {
      if (!selectedSite) return;
      setIsConnectingSocial(`${platform}-${accountId}`);
      // For demo, we use a placeholder or derived ID since we don't have secrets on frontend
      let clientId = '';
      if (platform === 'meta') clientId = selectedSite.socialMediaSettings.metaClientId || '';
      if (!clientId) clientId = 'simulated_client_id';

      oauthService.redirectToAuth(platform, clientId, selectedSite.id, accountId);
  }, [selectedSite]);

  const handleBlogPostUpdate = (updatedPost: BlogPost) => {
      if (strategicBrief && selectedSite) {
          const { score, checklist } = calculateSeoScore(updatedPost, strategicBrief, selectedSite);
          setSeoScore({ score, checklist });
      }
      setBlogPost(updatedPost);
  };

  const handleIncrementGenerationCount = useCallback(async () => {
      if (!currentUser) return;
      const newCount = (currentUser.monthlyGenerations?.count || 0) + 1;
      const updatedUser = { ...currentUser, monthlyGenerations: { ...currentUser.monthlyGenerations, count: newCount } };
      
      setCurrentUser(updatedUser);
      try {
        await authService.updateUser(currentUser.email, { monthlyGenerations: updatedUser.monthlyGenerations });
      } catch (e) {
          console.error("Failed to update generation count", e);
      }
  }, [currentUser]);

  const handlePublish = useCallback(async () => {
      if (!blogPost || !selectedSite || !currentGenerationSource) {
          toast.addToast("Could not publish. Critical data is missing.", 'error');
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
              return { ...s, history: [...s.history, newHistoryItem] };
          });

          setSites(updatedSites);
          setReviewingDraft(null);
          setStatus(AppStatus.PUBLISHED);
          setStatusMessage('Published!');
          toast.addToast('Successfully published!', 'success');
      } catch (e: any) {
          toast.addToast(e.message, 'error');
          setStatus(AppStatus.ERROR);
      }
  }, [blogPost, selectedSite, sites, currentGenerationSource, reviewingDraft, logApiUsage, toast]);

  const generateAndScorePost = useCallback(async (topicToTrack: string, generationSource: 'keyword' | 'rss' | 'video' | 'google_sheet' | 'agency_agent', sourceDetails: any, site: Site) => {
      // CHECK LIMIT
      if (!planAccess.canGenerate) {
          toast.addToast("You have reached your monthly generation limit. Upgrade to create more.", "error");
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

          setStatus(AppStatus.GENERATING_ARTICLE);
          setStatusMessage(`Writing the blog post...`);
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
          
          setStatus(AppStatus.GENERATING_IMAGE);
          setStatusMessage(`Creating a featured image...`);
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
          
          // Increment count here upon successful generation
          handleIncrementGenerationCount();

      } catch (e: any) {
          toast.addToast(e.message, 'error');
          setStatus(AppStatus.ERROR);
      }
  }, [resetGeneration, logApiUsage, toast, planAccess, handleIncrementGenerationCount]);

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

  const handleOpenDeleteDialog = useCallback(() => {
      setIsDeleteDialogOpen(true);
      setDeleteConfirmationInput('');
  }, []);

  const handleVerifySocialMediaConnection = useCallback(async (platformId: oauthService.SocialPlatform, accountId: string, accessToken: string) => {
      const result = await oauthService.verifyConnection(platformId, accessToken);
      if (result.success) {
          toast.addToast(result.message, 'success');
      } else {
          toast.addToast(result.message, 'error');
      }
  }, [toast]);

  const handleVerifyCredentialBasedConnection = useCallback(async (platformId: string, account: any) => {
      const result = await oauthService.verifyCredentialBasedConnection(platformId, account);
      if (result.success) {
          toast.addToast(result.message, 'success');
      } else {
          toast.addToast(result.message, 'error');
      }
  }, [toast]);

  const onDiscardDraft = useCallback((draftId: string) => {
      if (window.confirm("Are you sure you want to discard this draft?")) {
        handleSiteUpdate('drafts', selectedSite?.drafts.filter(d => d.id !== draftId) || []);
      }
  }, [selectedSite, handleSiteUpdate]);

  const onRefreshAnalytics = async () => { toast.addToast('Refreshing Analytics...', 'info'); };
  const onRefreshClarityData = async () => { toast.addToast('Refreshing Clarity Data...', 'info'); };

  const handleUpdatePlan = async (plan: SubscriptionPlan, cycle?: 'monthly' | 'yearly') => {
      if (!currentUser) return;
      const updated = await authService.updateUser(currentUser.email, { subscriptionPlan: plan, subscriptionCycle: cycle });
      setCurrentUser(updated);
      toast.addToast(`Plan updated to ${plan}`, 'success');
  };

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
            toast.addToast(e.message, 'error');
            setStatus(AppStatus.ERROR);
        }
    }, [resetGeneration, logApiUsage, toast]);

    const handleVerifyMailchimp = async (settings: MailchimpSettings) => {
        const result = await mailchimpService.verifyMailchimpConnection(settings);
        if (result.success) {
             handleSiteUpdate('mailchimpSettings', { ...settings, isConnected: true, statusMessage: result.message });
             toast.addToast(result.message, 'success');
        } else {
             handleSiteUpdate('mailchimpSettings', { ...settings, isConnected: false, statusMessage: result.message });
             toast.addToast(result.message, 'error');
        }
    };

    const handleVerifyClarity = async (projectId: string) => {
        const result = await clarityService.verifyClarityProject(projectId);
        if (result.success) {
             toast.addToast(result.message, 'success');
        } else {
             toast.addToast(result.message, 'error');
        }
    };

    const handleVerifySupabaseConnection = async (connection: SupabaseConnection) => {
        if (!selectedSiteId) return;
        const result = await verifySupabaseConnection(connection);
        if (result.success) {
             handleSiteUpdate('supabaseConnection', { ...connection, status: 'connected', statusMessage: result.message });
             toast.addToast(result.message, 'success');
        } else {
             handleSiteUpdate('supabaseConnection', { ...connection, status: 'error', statusMessage: result.message });
             toast.addToast(result.message, 'error');
        }
    };

    const handleVerifyPaystackConnection = async (connection: PaystackConnection) => {
        if (!selectedSiteId) return;
        const result = await verifyPaystackConnection(connection);
        if (result.success) {
             handleSiteUpdate('paystackConnection', { ...connection, status: 'connected', statusMessage: result.message });
             toast.addToast(result.message, 'success');
        } else {
             handleSiteUpdate('paystackConnection', { ...connection, status: 'error', statusMessage: result.message });
             toast.addToast(result.message, 'error');
        }
    };

    const handleVerifyPayfastConnection = async (connection: PayfastConnection) => {
        if (!selectedSiteId) return;
        const result = await verifyPayfastConnection(connection);
        if (result.success) {
             handleSiteUpdate('payfastConnection', { ...connection, status: 'connected', statusMessage: result.message });
             toast.addToast(result.message, 'success');
        } else {
             handleSiteUpdate('payfastConnection', { ...connection, status: 'error', statusMessage: result.message });
             toast.addToast(result.message, 'error');
        }
    };

    const handleVerifyWiseConnection = async (connection: WiseConnection) => {
        if (!selectedSiteId) return;
        const result = await verifyWiseConnection(connection);
        if (result.success) {
             handleSiteUpdate('wiseConnection', { ...connection, status: 'connected', statusMessage: result.message });
             toast.addToast(result.message, 'success');
        } else {
             handleSiteUpdate('wiseConnection', { ...connection, status: 'error', statusMessage: result.message });
             toast.addToast(result.message, 'error');
        }
    };

    const handleVerifyPayoneerConnection = async (connection: PayoneerConnection) => {
        if (!selectedSiteId) return;
        const result = await verifyPayoneerConnection(connection);
        if (result.success) {
             handleSiteUpdate('payoneerConnection', { ...connection, status: 'connected', statusMessage: result.message });
             toast.addToast(result.message, 'success');
        } else {
             handleSiteUpdate('payoneerConnection', { ...connection, status: 'error', statusMessage: result.message });
             toast.addToast(result.message, 'error');
        }
    };

    const handleVerifyStripeConnection = async (connection: StripeConnection) => {
        if (!selectedSiteId) return;
        const result = await verifyStripeConnection(connection);
        if (result.success) {
             handleSiteUpdate('stripeConnection', { ...connection, status: 'connected', statusMessage: result.message });
             toast.addToast(result.message, 'success');
        } else {
             handleSiteUpdate('stripeConnection', { ...connection, status: 'error', statusMessage: result.message });
             toast.addToast(result.message, 'error');
        }
    };

    const handleVerifyPayPalConnection = async (connection: PayPalConnection) => {
        if (!selectedSiteId) return;
        const result = await verifyPayPalConnection(connection);
        if (result.success) {
             handleSiteUpdate('payPalConnection', { ...connection, status: 'connected', statusMessage: result.message });
             toast.addToast(result.message, 'success');
        } else {
             handleSiteUpdate('payPalConnection', { ...connection, status: 'error', statusMessage: result.message });
             toast.addToast(result.message, 'error');
        }
    };
  
  if (authLoading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-app">
        <div className="relative w-20 h-20 flex items-center justify-center rounded-full bg-panel border border-border-highlight animate-pulse-engine">
            <svg className="animate-spin h-10 w-10 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        </div>
        <p className="mt-6 text-sm font-medium text-sub animate-pulse tracking-wide">Initializing Zenith Engine...</p>
      </div>
    );
  }
  
  if (!currentUser) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} theme={theme} toggleTheme={toggleTheme} />;
  }

  if (currentUser.isAdmin && !impersonatingUser) {
      return <AdminDashboard currentUser={currentUser} onImpersonate={(u) => { setImpersonatingUser(currentUser); setCurrentUser(u); loadUserData(u); }} onSignOut={handleSignOut} theme={theme} toggleTheme={toggleTheme} />;
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

  // Sidebar navigation items
  const navItems = [
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
  ];

  const assistantActions = {
      onFindNextTopic: () => {
          if (!selectedSite) return "No site selected.";
          const list = selectedSite.keywordList || '';
          const next = list.split('\n').find(k => k.trim() && !k.trim().startsWith('[DONE]'));
          return next ? next.trim() : "No pending topics found.";
      },
      onResearchKeyword: async (keyword: string) => {
          if (!selectedSite) return "No site selected.";
          const { suggestions } = await aiService.suggestKeywords(keyword, selectedSite);
          return suggestions.join(', ');
      },
      onBrainstormAndAddTopics: async ({ query, count }: { query: string; count: number }) => {
          if (!selectedSite) return "No site selected.";
          const { suggestions } = await aiService.suggestKeywords(query, selectedSite);
          const newTopics = suggestions.slice(0, count);
          const newList = selectedSite.keywordList ? `${selectedSite.keywordList}\n${newTopics.join('\n')}` : newTopics.join('\n');
          handleSiteUpdate('keywordList', newList);
          return `Added ${newTopics.length} topics: ${newTopics.join(', ')}`;
      },
      onGenerateArticle: async (topic: string) => {
          if (!selectedSite) return "No site selected.";
          // Trigger generation. We use 'agency_agent' as a generic source for on-demand generation.
          await generateAndScorePost(topic, 'agency_agent', { value: { topic } }, selectedSite);
          return `Started generating article for "${topic}". Check the screen for progress.`;
      },
      onUpdateSiteField: (field: keyof Site, value: any) => {
          handleSiteUpdate(field, value);
          return `Updated ${field} to ${value}.`;
      },
      onRunSocialGraphicAutomation: async () => {
          handleSiteUpdate('isSocialGraphicAutomationEnabled', true);
          return "Enabled Social Graphic Automation. It will run on the next schedule trigger.";
      },
      onRunSocialVideoAutomation: async () => {
          handleSiteUpdate('isSocialVideoAutomationEnabled', true);
          return "Enabled Social Video Automation. It will run on the next schedule trigger.";
      },
      onNavigateToTab: ({ tab, subTab }: { tab: string; subTab?: string }) => {
          setActiveTab(tab, subTab);
          return `Navigated to ${tab} ${subTab ? `(${subTab})` : ''}.`;
      },
      onGetAutomationStatus: () => {
          if (!selectedSite) return "No site selected.";
          return JSON.stringify({
              blog: selectedSite.isAutomationEnabled,
              graphics: selectedSite.isSocialGraphicAutomationEnabled,
              video: selectedSite.isSocialVideoAutomationEnabled,
              trigger: selectedSite.automationTrigger
          });
      },
      onUpdateAutomationSetting: ({ settingName, settingValue }: { settingName: keyof Site, settingValue: any }) => {
          let value = settingValue;
          if (value === 'true') value = true;
          if (value === 'false') value = false;
          handleSiteUpdate(settingName, value);
          return `Updated ${settingName} to ${value}.`;
      }
  };

  return (
    <div className="h-full w-full flex flex-col md:flex-row bg-app text-main transition-colors duration-300 overflow-hidden relative">
      <SimulationWorker />
      
      {/* Mobile Overlay */}
      {isSidebarOpen && (
          <div 
              onClick={() => setIsSidebarOpen(false)} 
              className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
              aria-hidden="true"
          />
      )}

      {/* Sidebar */}
      <aside className={`
          fixed md:relative z-50 h-full
          flex flex-col flex-shrink-0
          bg-panel border-r border-border
          transition-all duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          w-64 md:w-20 lg:w-64 md:hover:w-64 group/sidebar
      `}>
          {/* Sidebar Header / Logo */}
          <div className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-border bg-panel-solid">
              <div className="flex items-center gap-3 overflow-hidden">
                  <LogoIcon className="h-8 w-8 text-brand-primary flex-shrink-0" />
                  <span className="font-bold text-xl tracking-tight text-main whitespace-nowrap opacity-100 md:opacity-0 lg:opacity-100 group-hover/sidebar:opacity-100 transition-opacity duration-300">
                      Zenith
                  </span>
              </div>
              {/* Mobile Close Button */}
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1 text-sub hover:text-main">
                  <XIcon className="h-6 w-6" />
              </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
              {navItems.map((item) => (
                  <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`
                          w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors relative group
                          ${activeTab === item.id 
                              ? 'bg-brand-primary/10 text-brand-primary' 
                              : 'text-sub hover:text-brand-primary hover:bg-brand-primary/5'
                          }
                          ${item.mt ? 'mt-6' : ''}
                      `}
                  >
                      {activeTab === item.id && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-brand-primary rounded-r-full" />
                      )}
                      
                      <div className="relative">
                          <item.icon className={`h-5 w-5 flex-shrink-0 ${activeTab === item.id ? 'text-brand-primary' : 'text-sub group-hover:text-brand-primary'}`} />
                          {item.locked && (
                              <div className="absolute -top-1.5 -right-1.5 bg-panel rounded-full p-0.5 border border-border">
                                  <LockClosedIcon className="h-2.5 w-2.5 text-text-tertiary" />
                              </div>
                          )}
                      </div>
                      
                      <span className="whitespace-nowrap opacity-100 md:opacity-0 lg:opacity-100 group-hover/sidebar:opacity-100 transition-opacity duration-300 delay-75">
                          {item.label}
                      </span>
                  </button>
              ))}
          </nav>

          {/* Footer / Profile */}
          <div className="p-4 border-t border-border bg-panel-solid">
              <div 
                  className="flex items-center gap-3 overflow-hidden cursor-pointer hover:bg-panel-light p-2 -m-2 rounded-lg transition-colors group/profile"
                  onClick={() => setIsProfileModalOpen(true)}
                  role="button"
                  tabIndex={0}
              >
                  <div className="h-9 w-9 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary font-semibold flex-shrink-0 border border-brand-primary/30">
                      {currentUser?.firstName?.[0] || currentUser?.email?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 opacity-100 md:opacity-0 lg:opacity-100 group-hover/sidebar:opacity-100 transition-opacity duration-300">
                      <p className="text-sm font-medium text-main truncate group-hover/profile:text-brand-primary transition-colors">
                          {currentUser?.firstName || 'User'}
                      </p>
                      <p className="text-xs text-sub truncate">
                          {currentUser?.email}
                      </p>
                  </div>
                  <div className="flex flex-col gap-1 opacity-100 md:opacity-0 lg:opacity-100 group-hover/sidebar:opacity-100 transition-opacity duration-300" onClick={(e) => e.stopPropagation()}>
                        <button onClick={toggleTheme} className="p-1.5 text-sub hover:text-main hover:bg-panel-light rounded transition-colors" title="Toggle Theme">
                            {theme === 'dark' ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
                        </button>
                        <button onClick={handleSignOut} className="p-1.5 text-sub hover:text-red-400 hover:bg-red-400/10 rounded transition-colors" title="Sign Out">
                            <SignOutIcon className="h-4 w-4" />
                        </button>
                  </div>
              </div>
              {impersonatingUser && (
                  <div className="mt-3 px-2 py-1 bg-yellow-900/30 border border-yellow-500/30 rounded text-xs text-yellow-500 text-center opacity-100 md:opacity-0 lg:opacity-100 group-hover/sidebar:opacity-100 transition-opacity duration-300">
                      Impersonating
                  </div>
              )}
              {hasActiveJobs && (
                  <button 
                      onClick={() => setIsTrackerModalOpen(true)}
                      className="mt-3 w-full flex items-center justify-between px-3 py-2 bg-brand-primary/10 text-brand-primary rounded-lg text-xs font-medium border border-brand-primary/20 hover:bg-brand-primary/20 transition-colors animate-pulse opacity-100 md:opacity-0 lg:opacity-100 group-hover/sidebar:opacity-100 transition-opacity duration-300"
                  >
                      <span className="flex items-center gap-2">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary"></span>
                          </span>
                          Processing...
                      </span>
                      <ArrowRightIcon className="h-3 w-3" />
                  </button>
              )}
          </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col relative h-full bg-app">
        {/* Mobile Header (Only visible on small screens) */}
        <header className="md:hidden h-16 bg-panel border-b border-border flex items-center justify-between px-4 flex-shrink-0 z-30 sticky top-0">
             <button onClick={() => setIsSidebarOpen(true)} className="text-sub hover:text-main p-2 -ml-2">
                <MenuIcon className="h-6 w-6" />
             </button>
             <span className="font-bold text-lg text-main">Zenith Engine</span>
             <button 
                onClick={() => setIsProfileModalOpen(true)}
                className="w-9 h-9 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary text-sm font-semibold border border-brand-primary/30"
             >
                {currentUser?.firstName?.[0] || 'U'}
             </button>
        </header>

        <main ref={mainContentRef} className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth relative">
            <div className="max-w-7xl mx-auto relative z-10">
                {selectedSite ? (
                    <div key={activeTab} className="animate-fade-in h-full">
                        <ActiveComponent
                            status={status}
                            blogPost={blogPost}
                            currentUser={currentUser}
                            planAccess={planAccess}
                            site={selectedSite}
                            sites={sites}
                            handleResetAllSitesSpend={handleResetAllSitesSpend}
                            publishedPostUrl={publishedPostUrl}
                            lastGeneratedSocialPosts={lastGeneratedSocialPosts}
                            resetGeneration={resetGeneration}
                            handleConnectSocialMedia={handleConnectSocialMedia as any}
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
                            handleOpenDeleteDialog={handleOpenDeleteDialog}
                            handleVerifySocialMediaConnection={handleVerifySocialMediaConnection}
                            handleVerifyCredentialBasedConnection={handleVerifyCredentialBasedConnection}
                            onDiscardDraft={onDiscardDraft}
                            onRefreshAnalytics={onRefreshAnalytics}
                            onRefreshClarityData={onRefreshClarityData}
                            handleUpdatePlan={handleUpdatePlan}
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
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <h2 className="text-xl font-bold">No Sites Found</h2>
                            <p className="text-sub mt-2">Create a new site to get started.</p>
                            <button onClick={handleAddNewSite} className="mt-4 btn btn-primary">+ Create Site</button>
                        </div>
                    </div>
                )}
            </div>
        </main>
      </div>
      
      {/* On-screen Agent - Placed outside main content to handle positioning/stacking context correctly */}
      {selectedSite && (
          <AssistantUI site={selectedSite} actions={assistantActions} />
      )}
      
      {/* Global Tracker Overlay */}
      <GlobalAutomationTracker 
          isOpen={isTrackerModalOpen} 
          onClose={() => setIsTrackerModalOpen(false)} 
          sites={sites} 
          onActiveJobsChange={setHasActiveJobs} 
      />

      {/* Profile Modal */}
      <ProfileModal 
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          currentUser={currentUser}
          onUserUpdate={(updated) => setCurrentUser(updated)}
          onSignOut={handleSignOut}
          planAccess={planAccess}
          onManageSubscription={() => {
              setIsProfileModalOpen(false);
              setActiveTab('subscription');
          }}
      />
    </div>
  );
};
