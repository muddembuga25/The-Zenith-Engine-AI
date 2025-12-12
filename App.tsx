
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
import { SiteProvider } from './contexts/SiteContext';
import { AppRouter } from './components/AppRouter';

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

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTabState] = useState('dashboard');
  const [activeSubTab, setActiveSubTab] = useState<string | null>(null);
  const [impersonatingUser, setImpersonatingUser] = useState<User | null>(null);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isTrackerModalOpen, setIsTrackerModalOpen] = useState(false);
  const toast = useToast();

  // --- AUTH & DATA LOADING ---
  const handleAuthSuccess = useCallback((user: User) => {
    setCurrentUser(user);
    if (user.isAdmin) return;

    storageService.migrateGuestDataToUser(user);
    // Check if user has sites to decide onboarding
    storageService.loadSitesAndLastId(user).then(({ sites }) => {
        if (user.subscriptionPlan || (sites && sites.length > 0)) {
            setIsOnboarding(false);
        } else {
            setIsOnboarding(true);
        }
    });
  }, []);

  useEffect(() => {
    const initAuth = async () => {
        try {
            const { user, impersonatingAdmin } = await authService.getCurrentUser();
            if (user) {
                setCurrentUser(user);
                if (impersonatingAdmin) setImpersonatingUser(impersonatingAdmin);
                
                if (!user.isAdmin) {
                    const { sites } = await storageService.loadSitesAndLastId(user);
                    if (!user.subscriptionPlan && (!sites || sites.length === 0)) {
                        setIsOnboarding(true);
                    }
                }
            }
        } catch (e) {
            console.error("Auth check failed", e);
        } finally {
            setAuthLoading(false);
        }
    };
    initAuth();
  }, []);

  const handleSignOut = useCallback(() => {
    authService.signOut();
    setCurrentUser(null);
    setImpersonatingUser(null);
    setIsOnboarding(false);
  }, []);
  
  const handleImpersonate = (userToImpersonate: User) => {
    if (!currentUser?.isAdmin) return;
    const adminUser = currentUser;
    authService.impersonateUser(userToImpersonate, adminUser);
    setCurrentUser(userToImpersonate);
    setImpersonatingUser(adminUser);
    setActiveTab('dashboard');
  };
  
  const handleEndImpersonation = () => {
    const adminUser = authService.endImpersonation();
    if (adminUser) {
        setCurrentUser(adminUser);
        setImpersonatingUser(null);
        setActiveTab('dashboard');
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
        if (!isOnboarding) setActiveTab('dashboard');
    } catch (e: any) {
        toast.addToast(e.message, 'error');
    }
  }, [currentUser, isOnboarding, toast]);

  const setActiveTab = (tab: string, subTab: string | null = null) => {
      setActiveTabState(tab);
      setActiveSubTab(subTab);
  };

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

  const planAccess = useMemo(() => {
    const plan = currentUser?.subscriptionPlan || 'free';
    const planLevels: Record<SubscriptionPlan, number> = { free: 0, creator: 1, pro: 2, agency: 3 };
    const currentLevel = planLevels[plan];
    const limits = { free: 2, creator: 50, pro: 200, agency: Infinity };
    const limit = limits[plan];
    const count = currentUser?.monthlyGenerations?.count || 0;

    return {
        plan,
        canUseAnalytics: currentLevel >= 1,
        canUseAuthority: currentLevel >= 2,
        canUseAdvertising: currentLevel >= 2,
        canUseBlogAutomation: currentLevel >= 0,
        canUseSocialAutomation: currentLevel >= 1,
        canUseEmailMarketing: currentLevel >= 2,
        canUseLiveProduction: currentLevel >= 2,
        canUseClientManagement: currentLevel >= 3,
        generationLimit: limit,
        generationsUsed: count,
        canGenerate: !!currentUser?.isAdmin || count < limit,
    };
  }, [currentUser]);

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
    return <div className="h-screen w-full flex items-center justify-center bg-background"><svg className="animate-spin h-10 w-10 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>;
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
              onAddNewSite={() => {}} // Site creation happens inside wizard using SiteContext
              onComplete={() => setIsOnboarding(false)}
              setActiveTab={setActiveTab}
          />
      );
  }

  return (
    <SiteProvider currentUser={currentUser}>
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
          <AppRouter 
            activeTab={activeTab} 
            activeSubTab={activeSubTab} 
            setActiveTab={setActiveTab} 
            currentUser={currentUser} 
            planAccess={planAccess}
            onUpdatePlan={handleUpdatePlan}
          />
        </Layout>
    </SiteProvider>
  );
};
