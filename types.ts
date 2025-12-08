
import { GenerateContentResponse, Type as GenaiType } from "@google/genai";

export const Type = GenaiType;

export interface GlobalSettings {
  googleAuthClientId?: string;
  googleAuthClientSecret?: string;
  googleApiKey?: string;
  supabaseConnection?: SupabaseConnection;
  paystackConnection?: PaystackConnection;
  payfastConnection?: PayfastConnection;
  wiseConnection?: WiseConnection;
  payoneerConnection?: PayoneerConnection;
  stripeConnection?: StripeConnection;
  payPalConnection?: PayPalConnection;
  
  // Deprecated: activePaymentGateway (split into local/international below)
  activePaymentGateway?: string; 
  
  // New Dual-Gateway Architecture
  localPaymentGateway?: 'payfast' | 'paystack'; // Optimized for ZAR
  internationalPaymentGateway?: 'stripe' | 'paypal' | 'wise' | 'payoneer'; // Optimized for USD
}

export interface SupabaseConnection {
  url: string;
  anonKey: string;
  status: 'connected' | 'disconnected' | 'error';
  statusMessage?: string;
}

export interface PaystackConnection {
  publicKey: string;
  secretKey: string;
  status: 'connected' | 'disconnected' | 'error';
  statusMessage?: string;
}

export interface PayfastConnection {
  merchantId: string;
  merchantKey: string;
  passphrase?: string;
  status: 'connected' | 'disconnected' | 'error';
  statusMessage?: string;
}

export interface WiseConnection {
  apiKey: string;
  status: 'connected' | 'disconnected' | 'error';
  statusMessage?: string;
}

export interface PayoneerConnection {
    partnerId: string;
    programId: string;
    apiKey: string;
    status: 'connected' | 'disconnected' | 'error';
    statusMessage?: string;
}

export interface StripeConnection {
  publicKey: string;
  secretKey: string;
  status: 'connected' | 'disconnected' | 'error';
  statusMessage?: string;
}

export interface PayPalConnection {
  clientId: string;
  clientSecret: string;
  status: 'connected' | 'disconnected' | 'error';
  statusMessage?: string;
}

export type SubscriptionPlan = 'free' | 'creator' | 'pro' | 'agency';

export interface User {
  uid: string; // Firebase User ID
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string;
  isAdmin?: boolean;
  subscriptionPlan?: SubscriptionPlan;
  subscriptionCycle?: 'monthly' | 'yearly';
  monthlyGenerations?: {
    count: number;
    resetDate: number; // Unix timestamp in ms for when the count was last reset
  };
  trialEndsAt?: number; // Unix timestamp in ms for trial end
}

export interface StrategySuggestion {
  title: string;
  reasoning: string;
  contentIdeas: string[];
}

export enum AppStatus {
  IDLE,
  GENERATING_STRATEGY,
  GENERATING_ARTICLE,
  GENERATING_IMAGE,
  CORRECTING_SEO,
  READY_TO_PUBLISH,
  PUBLISHING,
  GENERATING_SOCIAL_POSTS,
  PUBLISHED,
  ERROR,
}

export enum AiProvider {
  GOOGLE = 'GOOGLE',
  OPENROUTER = 'OPENROUTER',
  OPENAI = 'OPENAI',
  ANTHROPIC = 'ANTHROPIC',
  XAI = 'XAI',
  REPLICATE = 'REPLICATE',
  OPENART = 'OPENART',
}

export interface ApiKeys {
  google: string;
  openAI: string;
  anthropic: string;
  openRouter: string;
  xai: string;
  replicate: string;
  openArt: string;
  dataforseo: string;
}

export interface WordPressCredentials {
  url: string;
  username: string;
  password: string;
}

export interface ModelConfig {
  textProvider: AiProvider;
  textModel: string;
  imageProvider: AiProvider;
  imageModel: string;
  videoProvider: AiProvider;
  videoModel: string;
}

export interface StrategicBrief {
  focusKeyword: string;
  userIntent: 'Informational' | 'Commercial' | 'Transactional' | 'Navigational';
  keyEntities: string[];
  recommendedSchema: 'Article' | 'HowTo' | 'FAQPage' | 'Review' | 'LocalBusiness' | 'None';
  suggestedOutline: { heading: string; subheadings: string[] }[];
  /**
   * the cluster of related keywords.
   * Must be intelligently SEO targeted in the blog post for multiple keyword targeting.
   */
  keywordCluster: string[];
  contentAngle: string;
  seoTitle: string;
  metaDescription: string;
  slug: string;
  imagePrompt: string;
  faq: string[]; // Array of questions
  categories: string[];
  authorName?: string;
  localSeoBusinessName?: string;
  localSeoServiceArea?: string;
  localSeoPhoneNumber?: string;
  externalLinkSuggestions?: { title: string; url: string; }[];
}

export interface BlogPost {
  title: string;
  content: string; // HTML format
  seoTitle: string;
  metaDescription: string;
  slug: string;
  excerpt: string;
  categories: string[];
  tags: string[];
  imageUrl: string; // base64 data url
  imagePrompt: string;
  imageAltText: string;
  imageCaption: string;
  imageDescription: string;
  focusKeyword: string;
  wasSeoAutoCorrected?: boolean;
}

export interface ReferenceItem {
  id: string;
  type: 'url' | 'file';
  value: string; // URL string or Base64 data URL
  name: string | null;
  mimeType: string | null;
}

export interface RssItem {
  guid: string;
  title: string;
  link: string;
  contentSnippet: string;
}

export interface VideoSource {
  id: string;
  url: string; // The URL of the video or the channel RSS feed
  type: 'video' | 'channel';
  name: string; // Display name for the source
  processedVideoGuids: string[]; // For channels, tracks processed videos. For single videos, contains its own URL if processed.
}

export interface RssSource {
  id: string;
  url: string;
  name: string;
  processedRssGuids: string[];
}

export interface GoogleSheetSource {
  id: string;
  url: string;
  name: string;
  processedGoogleSheetRows: number[];
}

export interface RecurringSchedule {
  id:string;
  type: 'weekly' | 'monthly';
  days: number[]; // 0 (Sun) - 6 (Sat) for weekly, 1-31 for monthly
  time: string; // "HH:mm" format
  isEnabled: boolean;
  lastRun?: number; // Unix timestamp in ms
}

export interface SocialMediaPost {
    content: string;
    hashtags: string[];
}

export interface DistributionCampaignAsset {
  id: string;
  platform: 'twitter' | 'linkedin' | 'instagram' | 'audio';
  type: 'thread' | 'post' | 'carousel' | 'summary';
  content: any; // string for post, string[] for thread, { text: string; imagePrompt: string; imageUrl?: string }[] for carousel, string for audio (base64)
  status: 'draft' | 'approved' | 'published' | 'error';
  error?: string;
}

export interface DistributionCampaign {
  status: 'none' | 'generating' | 'generated';
  assets: DistributionCampaignAsset[];
}

export interface PostHistoryItem {
  id: string;
  topic: string;
  url: string;
  date: number; // Unix timestamp in ms
  type: 'Keyword' | 'RSS' | 'Video' | 'Social Graphic' | 'Social Video' | 'Google Sheet' | 'Email Campaign' | 'Article Refresh' | 'Agency Agent' | 'Creator Studio';
  socialMediaPosts?: Record<string, SocialMediaPost>;
  socialGraphics?: Record<string, { imageUrl: string; caption: string; }>;
  socialVideos?: Record<string, { videoUrl: string; caption: string; mcpId?: string }>;
  emailCampaigns?: { subject: string; body: string; };
  analytics?: { pageviews: number; visitors: number; engagement: number; conversions: number; };
  clarityMetrics?: {
    pageviews: number;
    deadClicks: number;
    rageClicks: number;
    scrollDepth: number; // percentage
  };
  distributionCampaign?: DistributionCampaign;
}

export type SocialAccountStatus = 'connected' | 'disconnected' | 'needs_reauth' | 'error';
export type ConnectionMethod = 'oauth' | 'api_key' | 'url' | 'credentials' | 'manual';

export interface SocialMediaAccount {
    id: string;
    name: string;
    isAutomationEnabled: boolean;
    isConnected: boolean;
    connectionMethod: ConnectionMethod;
    
    // OAuth Fields
    accessToken?: string | null;
    clientId?: string;
    clientSecret?: string;
    
    // Credential Fields
    username?: string;
    password?: string;
    twoFactorSecret?: string;
    
    // URL Fields
    profileUrl?: string;
    
    // Generic
    destinationType?: 'profile' | 'page' | 'group' | 'channel' | 'organization';
    destinationId?: string;
    availableAssets?: { id: string; name: string }[]; // List of available pages/orgs to connect to
    
    status: SocialAccountStatus;
    statusMessage?: string;
    extraData?: {
        channelName?: string;
        [key: string]: any;
    };
}

export interface WhatsAppAccount {
    id: string;
    name: string;
    isAutomationEnabled: boolean;
    isConnected: boolean;
    connectionMethod: ConnectionMethod; // 'api_key' (Graph API) or 'manual' (Phone)
    
    // API Method
    accessToken: string;
    phoneNumberId: string;
    
    // Manual Method
    phoneNumber?: string;
    
    // Destinations
    targetMode?: 'individual' | 'group' | 'both';
    recipientPhone?: string; // e.g., "15551234567"
    groupId?: string; // WhatsApp Group ID
    
    // Legacy fields (kept for backward compatibility during migration)
    destination?: string; 
    destinationType?: 'number' | 'group';

    status: SocialAccountStatus;
    statusMessage?: string;
}

export interface TelegramAccount {
    id: string;
    name: string;
    isAutomationEnabled: boolean;
    isConnected: boolean;
    connectionMethod: ConnectionMethod; // 'api_key' (Bot) or 'url' (Channel Link)
    
    // Bot Method
    botToken: string;
    chatId: string; // e.g., @yourchannel or numeric ID
    
    // URL Method
    channelUrl?: string;
    
    status: SocialAccountStatus;
    statusMessage?: string;
}

export interface MetaAsset {
    id: string; // The ID of the page or account
    name: string;
    platform: 'facebook' | 'instagram';
    isEnabled: boolean;
}

export interface MetaConnection {
    id: string; // a UUID for this connection instance
    name: string; // User's name from Meta, e.g., "John Doe"
    userId: string; // Meta User ID
    userAccessToken: string;
    isConnected: boolean;
    status: SocialAccountStatus;
    statusMessage?: string;
    assets: MetaAsset[];
}

export interface MetaAdsAccount {
    id: string; // The Ad Account ID, e.g., "act_12345"
    name: string;
    isEnabled: boolean;
}

export interface MetaAdsConnection {
    id: string; // a UUID for this connection instance
    name: string; // User's name from Meta, e.g., "John Doe"
    userId: string; // Meta User ID
    userAccessToken: string;
    isConnected: boolean;
    status: SocialAccountStatus;
    statusMessage?: string;
    adAccounts: MetaAdsAccount[];
}

export interface GoogleAdsAccount {
    id: string; // The Ad Account ID, e.g., "customers/12345"
    name: string;
    isEnabled: boolean;
}

export interface GoogleAdsConnection {
    id: string; // a UUID for this connection instance
    name: string; // User's name from Google, e.g., "John Doe"
    userAccessToken: string;
    isConnected: boolean;
    status: SocialAccountStatus;
    statusMessage?: string;
    adAccounts: GoogleAdsAccount[];
}


export interface SocialMediaSettings {
    twitter: SocialMediaAccount[];
    facebook: SocialMediaAccount[];
    linkedin: SocialMediaAccount[];
    instagram: SocialMediaAccount[];
    meta?: MetaConnection[];
    metaClientId?: string;
    metaClientSecret?: string;
    meta_ads?: MetaAdsConnection[];
    metaAdsClientId?: string;
    metaAdsClientSecret?: string;
    google_ads?: GoogleAdsConnection[];
    googleAdsClientId?: string;
    googleAdsClientSecret?: string;
    googleCalendarClientId?: string;
    googleCalendarClientSecret?: string;
    pinterest: SocialMediaAccount[];
    whatsapp: WhatsAppAccount[];
    youtube: SocialMediaAccount[];
    tiktok: SocialMediaAccount[];
    telegram: TelegramAccount[];
    snapchat: SocialMediaAccount[];
}

export interface Draft {
  id: string;
  date: number;
  sourceTopic: string;
  sourceDetails: {
    type: 'keyword' | 'rss' | 'video' | 'google_sheet' | 'refresh_url' | 'agency_agent';
    value: any; // Can be keyword string, RssItem, etc.
    source?: VideoSource | RssSource | GoogleSheetSource;
    videoItem?: RssItem; // For specific video from a channel
    rowIndex?: number;
  };
  strategicBrief: StrategicBrief;
  blogPost: BlogPost;
}

export interface CharacterReference {
  id: string;
  name: string;
  personality: string;
  visualPrompt: string;
  referenceImageUrl?: string; // Base64 data URL
}

export interface ImageGalleryItem {
  id: string;
  imageUrl: string; // base64 data URL
  altText: string;
  tags: string[];
}

export interface MonitoredBacklink {
  id: string;
  backlinkUrl: string;
  targetUrl: string;
  status: 'monitoring' | 'active' | 'inactive' | 'not_found' | 'error';
  statusMessage?: string;
  anchorText: string | null;
  lastChecked: number;
}

export interface McpServer {
    id: string;
    label: string;
    url: string;
    accessToken: string;
}

export interface MailchimpSettings {
    apiKey: string;
    serverPrefix: string;
    defaultListId: string;
    isConnected: boolean;
    statusMessage?: string;
}

export interface GoogleAnalyticsSettings {
    isConnected: boolean;
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    propertyId?: string;
    propertyName?: string;
    selectedGoalId?: string;
    statusMessage?: string;
    availableProperties?: { id: string; name: string }[];
    availableGoals?: { id: string; name: string }[];
}

export interface GoogleCalendar {
  id: string;
  summary: string;
  primary?: boolean;
}

export interface GoogleCalendarConnection {
  isConnected: boolean;
  accessToken?: string;
  statusMessage?: string;
  primaryCalendarId?: string;
  availableCalendars?: GoogleCalendar[];
}

export interface SpecificDayEntry {
  id: string;
  type: 'specific_day';
  day: number; // 1-31
  topic: string;
}

export type OrdinalWeek = 'first' | 'second' | 'third' | 'fourth' | 'last';

export interface OrdinalDayEntry {
  id: string;
  type: 'ordinal_day';
  week: OrdinalWeek;
  dayOfWeek: number; // 0-6 for Sunday-Saturday
  topic: string;
}

export type MonthlyCalendarEntry = SpecificDayEntry | OrdinalDayEntry;

export interface ContentCalendar {
    weekly: string[]; // Array of 7 strings, index 0 is Sunday
    monthly: MonthlyCalendarEntry[];
}

export interface AgencyAgentLog {
  id: string;
  timestamp: number;
  type: 'info' | 'trend' | 'schedule' | 'complete' | 'error' | 'check';
  message: string;
  details?: any;
}

export interface AgentScheduledPost {
  id: string;
  topic: string;
  suggestedTime: number; // Unix timestamp in ms
  status: 'pending' | 'processing' | 'complete' | 'error';
  reasoning?: string;
  error?: string;
  resultingPostId?: string; // id from PostHistoryItem
}

export interface LiveBroadcastClip {
  id: string;
  videoUrl: string;
  caption: string;
  mcpId?: string;
  scheduledDay: number; // 0=Sun, 1=Mon...
  scheduledTime: string; // "HH:mm" format
  status: 'pending' | 'posted' | 'error';
  error?: string;
  postedAt?: number;
  postedTo?: string[]; // platform names
}

export interface LiveBroadcastAutomation {
  isEnabled: boolean;
  sourceType: 'meta' | 'facebook_url' | 'youtube' | 'tiktok' | 'x';
  facebookPageId: string;
  facebookPageUrl: string;
  
  youtubeSourceMethod?: 'account' | 'url';
  youtubeAccountId?: string;
  youtubeChannelUrl: string;

  tiktokSourceMethod?: 'account' | 'url';
  tiktokAccountId?: string;
  tiktokProfileUrl: string;
  
  xSourceMethod?: 'account' | 'url';
  xAccountId?: string;
  xProfileUrl: string;

  scheduleType: 'monitor' | 'scheduled';
  broadcastDay: number; // 0-6 for Sun-Sat
  broadcastStartTime: string; // HH:mm
  broadcastEndTime: string; // HH:mm
  dailyPostTimes: string[]; // "HH:mm" format, e.g., ['09:00', '17:00']
  lastProcessedVideoId?: string;
  status: 'idle' | 'monitoring' | 'processing' | 'scheduling' | 'complete' | 'error';
  statusMessage?: string;
  currentWeekClips: LiveBroadcastClip[];
  lastRunTimestamp?: number;
}

export enum AutomationWorkflow {
    Blog = 'blog',
    Social = 'social',
    Live = 'live',
    Email = 'email',
    Creator = 'creator'
}

export interface CreatorProject {
    id: string;
    idea: string;
    script: any;
    storyboard: { scene: number; imageUrl: string; prompt: string }[];
    videoUrl: string;
    voiceoverAudio: string;
    caption: string;
}

export interface Site {
  id:string;
  ownerId?: string; // Firebase User ID
  name:string;
  wordpressUrl:string;
  wordpressUsername:string;
  applicationPassword:string;
  brandGuideline:string;
  brandLogoLight?: string; // For dark backgrounds
  brandLogoDark?: string; // For light backgrounds
  brandColors?: string; // Comma-separated list
  brandFonts?: string; // Comma-separated list
  characterReferences?: CharacterReference[];
  imageGallery?: ImageGalleryItem[];
  isIntelligentGalleryEnabled?: boolean;
  isContentCalendarEnabled?: boolean;
  contentCalendar?: ContentCalendar;
  promoLink1:string;
  promoLink2:string;
  keywordList:string;
  videoSources: VideoSource[];
  rssSources: RssSource[];
  googleSheetSources: GoogleSheetSource[];
  references: ReferenceItem[];
  monitoredBacklinks: MonitoredBacklink[];
  authorName:string;
  authorId?: number;
  availableAuthors?: { id: number; name: string; }[];
  availableCategories?: { id: number; name: string; }[];
  isStrictCategoryMatching?: boolean;
  history: PostHistoryItem[];
  monthlyGenerationsCount?: number;

  // Blog Post Automation
  isAutomationEnabled:boolean;
  isAutoPublishEnabled: boolean;
  automationTrigger: 'daily' | 'schedule';
  automationDailyTime: string;
  automationTimezone: string;
  lastAutoPilotRun?:number; // Unix timestamp in ms
  recurringSchedules: RecurringSchedule[];
  drafts: Draft[];
  isOmnipresenceAutomationEnabled?: boolean;
  isGoogleCalendarSyncEnabled?: boolean;
  
  // Blog Post Generation sources
  dailyGenerationSource: 'keyword' | 'rss' | 'video' | 'google_sheet' | 'agency_agent';
  scheduleGenerationSource: 'keyword' | 'rss' | 'video' | 'google_sheet' | 'agency_agent';
  isInPostImagesEnabled?: boolean;
  numberOfInPostImages?: number;
  
  socialMediaSettings: SocialMediaSettings;
  mailchimpSettings: MailchimpSettings;
  googleAnalyticsSettings: GoogleAnalyticsSettings;
  googleCalendarConnection?: GoogleCalendarConnection;
  clarityProjectId?: string;
  supabaseConnection?: SupabaseConnection;
  paystackConnection?: PaystackConnection;
  payfastConnection?: PayfastConnection;
  wiseConnection?: WiseConnection;
  payoneerConnection?: PayoneerConnection;
  stripeConnection?: StripeConnection;
  payPalConnection?: PayPalConnection;
  activePaymentGateway?: 'paystack' | 'payfast' | 'wise' | 'payoneer' | 'stripe' | 'paypal';

  // AI model and API key configuration
  modelConfig: ModelConfig;
  apiKeys: ApiKeys;
  apiUsage: Partial<Record<keyof ApiKeys, number>>;
  fetchedModels?: Partial<Record<AiProvider, { text: string[], image: string[], video?: string[] }>>;
  isAssistantEnabled?: boolean;
  isVoiceControlEnabled?: boolean;
  isVideoControlEnabled?: boolean;
  isTextControlEnabled?: boolean;
  
  // Social Graphics
  isSocialGraphicAutomationEnabled: boolean;
  isSocialGraphicAutoPublishEnabled?: boolean;
  socialGraphicAutomationTrigger: 'daily' | 'schedule';
  socialGraphicDailyTime: string;
  lastSocialGraphicAutoPilotRun?: number;
  socialGraphicRecurringSchedules: RecurringSchedule[];
  socialGraphicGenerationSource: 'keyword' | 'rss' | 'video' | 'google_sheet' | 'newly_published_post';
  
  // Social Videos
  isSocialVideoAutomationEnabled: boolean;
  isSocialVideoAutoPublishEnabled?: boolean;
  socialVideoAutomationTrigger: 'daily' | 'schedule';
  socialVideoDailyTime: string;
  lastSocialVideoAutoPilotRun?: number;
  socialVideoRecurringSchedules: RecurringSchedule[];
  socialVideoGenerationSource: 'keyword' | 'rss' | 'video' | 'google_sheet' | 'newly_published_post';

  // Email Marketing Automation
  isEmailMarketingAutomationEnabled: boolean;
  emailMarketingAutomationTrigger: 'daily' | 'schedule';
  emailMarketingDailyTime: string;
  lastEmailMarketingAutoPilotRun?: number;
  emailMarketingRecurringSchedules: RecurringSchedule[];
  emailMarketingGenerationSource: 'keyword' | 'rss' | 'video' | 'google_sheet' | 'newly_published_post';

  // SEO & Geo-targeting
  seoDataProvider: 'google_search' | 'dataforseo' | 'standalone';
  isLocalSeoEnabled: boolean;
  localSeoServiceArea: string;
  localSeoBusinessName: string;
  localSeoPhoneNumber: string;

  // Agency Features
  isAgencyAgentEnabled?: boolean;
  agentCheckFrequencyHours?: number;
  agentActionOnDiscovery?: 'addToReviewList' | 'addToKeywordList';
  agencyAgentLogs?: AgencyAgentLog[];
  agentScheduledPosts?: AgentScheduledPost[];
  lastAgentRun?: number;

  // Live Production Features
  liveBroadcastAutomation?: LiveBroadcastAutomation;

  // Creator Studio
  creatorStudioPromptList?: string;
  isCreatorStudioAutomationEnabled?: boolean;
  creatorStudioAutoPublishEnabled?: boolean;
  creatorStudioAutomationTrigger?: 'daily' | 'schedule';
  creatorStudioDailyTime?: string;
  creatorStudioRecurringSchedules?: RecurringSchedule[];
  creatorStudioReviews?: CreatorProject[];
}

export interface SeoChecklist {
  // On-Page Basics
  titleLength: boolean;
  metaDescriptionLength: boolean;
  keywordInTitle: boolean;
  keywordInMetaDescription: boolean;
  keywordInSlug: boolean;
  keywordInIntroduction: boolean;

  // Semantic & Topical Authority
  entityCoverage: boolean;
  topicalDepth: boolean;

  // Content Quality
  contentLength: boolean;
  keywordDensity: boolean;
  keywordInHeading: boolean;
  readability: boolean;
  imageAltText: boolean;
  faqSection: boolean;
  sufficientHeadings: boolean;
  videoEmbed: boolean;

  // Authority & Trust (E-E-A-T)
  internalLinks: boolean;
  externalLinks: boolean;
  authorMention: boolean;
  aboutAuthorSection: boolean;
  schemaMarkup: boolean;
}


export interface SeoScoreResult {
  score: number;
  checklist: SeoChecklist;
}

export const AVAILABLE_MODELS = {
  [AiProvider.GOOGLE]: {
    text: ['gemini-2.5-flash', 'gemini-2.5-pro'],
    image: ['imagen-4.0-generate-001', 'gemini-2.5-flash-image'],
    video: ['veo-3.1-generate-preview', 'veo-3.1-fast-generate-preview'],
  },
  [AiProvider.OPENAI]: {
    text: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo-0125'],
    image: ['dall-e-3', 'dall-e-2'],
    video: [],
  },
  [AiProvider.ANTHROPIC]: {
    text: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
    image: [],
    video: [],
  },
  [AiProvider.OPENROUTER]: {
    text: [
        'openai/gpt-4o',
        'google/gemini-2.5-flash',
        'anthropic/claude-3.5-sonnet',
        'meta-llama/llama-3-70b-instruct',
        'mistralai/mistral-large',
    ],
    image: [
        'openai/dall-e-3',
        'google/imagen-3',
        'stabilityai/stable-diffusion-3',
    ],
    video: [],
  },
  [AiProvider.XAI]: {
    text: ['grok-1'],
    image: [],
    video: [],
  },
  [AiProvider.REPLICATE]: {
    text: [],
    image: [
        'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
        'ai-forever/kandinsky-2.2:ea1addaab376f4dc227f5368bbd8eff901820fd1cc14ed8cad63b29249e9d463'
    ],
    video: [],
  },
  [AiProvider.OPENART]: {
    text: [],
    image: ['stable-diffusion-v1-5', 'dall-e-3', 'juggernaut-xl-v8'],
    video: ['openart-video-v1'],
  },
};
