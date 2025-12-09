
import React, { useState, useCallback } from 'react';
import { useSite } from '../contexts/SiteContext';
import { AppStatus, AutomationWorkflow, type BlogPost, type PostHistoryItem, type SocialMediaPost, type StrategicBrief, type Draft, type User } from '../types';
import * as aiService from '../services/aiService';
import { calculateSeoScore } from '../services/seoService';
import { publishPost } from '../services/wordpressService';
import { useToast } from '../hooks/useToast';
import * as oauthService from '../services/oauthService';
import * as mailchimpService from '../services/mailchimpService';
import * as clarityService from '../services/clarityService';
import * as dbService from '../services/dbService';
import * as paystackService from '../services/paystackService';
import * as payfastService from '../services/payfastService';
import * as wiseService from '../services/wiseService';
import * as payoneerService from '../services/payoneerService';
import * as stripeService from '../services/stripeService';
import * as paypalService from '../services/paypalService';

// Import Tab Components
import { DashboardTab } from './DashboardTab';
import { ContentHubTab } from './ContentHubTab';
import { AuthorityTab } from './AuthorityTab';
import { AutomationDashboard } from './AutomationDashboard';
import { AdvertisingTab } from './AdvertisingTab';
import { BrandingTab } from './BrandingTab';
import { ConnectionsTab } from './ConnectionsTab';
import { ApiManagementTab } from './ApiManagementTab';
import { ApiSpendDashboard } from './ApiSpendDashboard';
import { SubscriptionPage } from './SubscriptionPage';
import { SettingsTab } from './SettingsTab';
import { UpgradePlan } from './UpgradePlan';
import { ArticleViewer } from './ArticleViewer';
import { PublishSuccessViewer } from './PublishSuccessViewer';

interface AppRouterProps {
    activeTab: string;
    activeSubTab: string | null;
    setActiveTab: (tab: string, subTab?: string | null) => void;
    currentUser: User;
    planAccess: any;
    onUpdatePlan: (plan: any, cycle?: any) => Promise<void>;
}

export const AppRouter: React.FC<AppRouterProps> = ({ activeTab, activeSubTab, setActiveTab, currentUser, planAccess, onUpdatePlan }) => {
    const { selectedSite, sites, updateSite, updateMultipleSiteFields, logApiUsage, deleteSite, setSites } = useSite();
    const toast = useToast();

    // Session State
    const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [blogPost, setBlogPost] = useState<BlogPost | null>(null);
    const [strategicBrief, setStrategicBrief] = useState<StrategicBrief | null>(null);
    const [publishedPostUrl, setPublishedPostUrl] = useState<string | null>(null);
    const [lastGeneratedSocialPosts, setLastGeneratedSocialPosts] = useState<Record<string, SocialMediaPost> | null>(null);
    const [seoScore, setSeoScore] = useState<any | null>(null);
    const [currentGenerationSource, setCurrentGenerationSource] = useState<PostHistoryItem['type'] | null>(null);
    const [currentSourceDetails, setCurrentSourceDetails] = useState<any>(null);
    const [reviewingDraft, setReviewingDraft] = useState<Draft | null>(null);
    const [isConnectingSocial, setIsConnectingSocial] = useState<string | null>(null);
    const [originalArticleForDiff, setOriginalArticleForDiff] = useState<string | null>(null);
    const [refreshedArticleForDiff, setRefreshedArticleForDiff] = useState<BlogPost | null>(null);
    const [viewingHistoryItem, setViewingHistoryItem] = useState<PostHistoryItem | null>(null);

    const resetGeneration = useCallback(() => {
        setStatus(AppStatus.IDLE);
        setBlogPost(null);
        setStrategicBrief(null);
        setPublishedPostUrl(null);
        setSeoScore(null);
        setStatusMessage('');
        setLastGeneratedSocialPosts(null);
        setOriginalArticleForDiff(null);
        setRefreshedArticleForDiff(null);
        setReviewingDraft(null);
    }, []);

    // --- Generation Logic ---
    const generateAndScorePost = useCallback(async (topicToTrack: string, generationSource: 'keyword' | 'rss' | 'video' | 'google_sheet' | 'agency_agent', sourceDetails: any, site: any) => {
        resetGeneration();
        setStatus(AppStatus.GENERATING_STRATEGY);
        setStatusMessage('Discovering high-intent keyword...');
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
            let initialTopic = topicToTrack;
            if (generationSource === 'rss') initialTopic = sourceDetails.item.title;
            else if (generationSource === 'video') initialTopic = sourceDetails.item.title;
            else if (generationSource === 'google_sheet') initialTopic = sourceDetails.item;

            setStatusMessage('Performing competitive analysis...');
            const { brief, costs: briefCosts } = await aiService.generateStrategicBriefFromKeyword(initialTopic, site);
            setStrategicBrief(brief);
            for (const provider in briefCosts) { logApiUsage(provider as any, (briefCosts as any)[provider] || 0); }

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

        } catch (e: any) {
            toast.addToast(e.message, 'error');
            setStatus(AppStatus.ERROR);
        }
    }, [resetGeneration, logApiUsage, toast]);

    const handlePublish = async () => {
        if (!blogPost || !selectedSite || !currentGenerationSource) return;
        setStatus(AppStatus.PUBLISHING);
        setStatusMessage('Uploading to WordPress...');
        try {
            const publishedUrl = await publishPost(selectedSite, blogPost, blogPost.focusKeyword);
            setPublishedPostUrl(publishedUrl);
            setStatus(AppStatus.GENERATING_SOCIAL_POSTS);
            setStatusMessage('Drafting social media posts...');
            const { posts: socialPosts, cost, provider } = await aiService.generateSocialMediaPosts(blogPost, publishedUrl, selectedSite);
            logApiUsage(provider, cost);
            setLastGeneratedSocialPosts(socialPosts);
            
            const newHistoryItem: PostHistoryItem = {
                id: crypto.randomUUID(),
                topic: blogPost.title,
                url: publishedUrl,
                date: Date.now(),
                type: currentGenerationSource,
                socialMediaPosts: socialPosts
            };
            
            // Update history via Context
            const updatedHistory = [...selectedSite.history, newHistoryItem];
            updateSite('history', updatedHistory);
            
            // Clean up source
            if (currentGenerationSource === 'Keyword' && typeof currentSourceDetails === 'string') {
                 const lines = selectedSite.keywordList.split('\n');
                 const idx = lines.findIndex(l => l.trim() === currentSourceDetails);
                 if(idx > -1) {
                     lines[idx] = `[DONE] ${currentSourceDetails}`;
                     updateSite('keywordList', lines.join('\n'));
                 }
            } else if (reviewingDraft) {
                const newDrafts = selectedSite.drafts.filter(d => d.id !== reviewingDraft.id);
                updateSite('drafts', newDrafts);
            }

            setReviewingDraft(null);
            setStatus(AppStatus.PUBLISHED);
            setStatusMessage('Published!');
            toast.addToast('Successfully published!', 'success');
        } catch (e: any) {
            toast.addToast(e.message, 'error');
            setStatus(AppStatus.ERROR);
        }
    };

    // --- Tab Handlers ---
    const handleConnectSocialMedia = (platform: any, accountId: string) => {
        if (!selectedSite) return;
        setIsConnectingSocial(`${platform}-${accountId}`);
        let clientId = '';
        if (platform === 'meta') clientId = selectedSite.socialMediaSettings.metaClientId || '';
        if (!clientId) clientId = 'simulated_client_id'; // Fallback for demo
        oauthService.redirectToAuth(platform, clientId, selectedSite.id, accountId);
    };

    const handleVerifySocialMedia = async (platformId: any, accountId: string, accessToken: string) => {
        const result = await oauthService.verifyConnection(platformId, accessToken);
        if (result.success) toast.addToast(result.message, 'success');
        else toast.addToast(result.message, 'error');
    };

    const handleVerifyCredentials = async (platformId: any, account: any) => {
        const result = await oauthService.verifyCredentialBasedConnection(platformId, account);
        if (result.success) toast.addToast(result.message, 'success');
        else toast.addToast(result.message, 'error');
    };

    const onRefreshArticle = useCallback(async (url: string, site: any) => {
        resetGeneration();
        setStatus(AppStatus.GENERATING_STRATEGY);
        setStatusMessage('Analyzing existing article...');
        try {
            const { originalHtml, refreshedPostData, brief, costs } = await aiService.generateRefreshedArticleFromUrl(url, site);
            for (const p in costs) logApiUsage(p as any, (costs as any)[p]);
            
            setStatusMessage('Generating refreshed image...');
            const { base64Image, cost, provider } = await aiService.generateFeaturedImage(refreshedPostData.imagePrompt, site);
            logApiUsage(provider, cost);
            
            const fullPost = { ...refreshedPostData, imageUrl: `data:image/jpeg;base64,${base64Image}` };
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

    const handleOpenDeleteDialog = () => { /* Handled in SettingsTab usually, but logic exists in SiteContext */ };

    // --- Loading / Active View ---
    const isLoading = status > AppStatus.IDLE && status < AppStatus.READY_TO_PUBLISH;
    
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full"></div>
                    <svg className="animate-spin h-14 w-14 text-blue-500 relative z-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                </div>
                <h2 className="text-xl font-bold mt-8 text-white animate-pulse">{statusMessage}</h2>
            </div>
        );
    }

    if (status >= AppStatus.READY_TO_PUBLISH && blogPost) {
        if (status === AppStatus.PUBLISHED) {
            return <PublishSuccessViewer publishedPostUrl={publishedPostUrl} socialPosts={lastGeneratedSocialPosts} site={selectedSite!} onReset={resetGeneration} onConnect={handleConnectSocialMedia as any} isConnectingSocial={isConnectingSocial} />;
        }
        return <ArticleViewer blogPost={blogPost} seoScore={seoScore} status={status} statusMessage={statusMessage} onPublish={handlePublish} onCancel={resetGeneration} site={selectedSite!} onUpdate={setBlogPost} originalArticleForDiff={originalArticleForDiff} refreshedArticleForDiff={refreshedArticleForDiff} />;
    }

    if (!selectedSite) return <div className="p-8 text-center text-text-secondary">Please select or create a site.</div>;

    // --- Router Switch ---
    switch (activeTab) {
        case 'dashboard':
            return <DashboardTab site={selectedSite} sites={sites} setActiveTab={setActiveTab} onGenerate={generateAndScorePost} onReviewDraft={(id) => { const d = selectedSite.drafts.find(dr => dr.id === id); if(d) { setReviewingDraft(d); setBlogPost(d.blogPost); setStrategicBrief(d.strategicBrief); setStatus(AppStatus.READY_TO_PUBLISH); } }} currentUser={currentUser} />;
        case 'content':
            return <ContentHubTab site={selectedSite} onSiteUpdate={updateSite} onMultipleSiteUpdates={updateMultipleSiteFields} onGenerateAndScore={generateAndScorePost} onReviewDraft={(id) => { const d = selectedSite.drafts.find(dr => dr.id === id); if(d) { setReviewingDraft(d); setBlogPost(d.blogPost); setStrategicBrief(d.strategicBrief); setStatus(AppStatus.READY_TO_PUBLISH); } }} onDiscardDraft={(id) => updateSite('drafts', selectedSite.drafts.filter(d => d.id !== id))} onViewHistory={setViewingHistoryItem} setActiveTab={setActiveTab} logApiUsage={logApiUsage} initialSubTab={activeSubTab} onRefreshAnalytics={async () => toast.addToast('Analytic refresh triggered', 'info')} onRefreshClarityData={async () => toast.addToast('Clarity refresh triggered', 'info')} onRefreshArticle={onRefreshArticle} />;
        case 'authority':
            if (!planAccess.canUseAuthority) return <UpgradePlan featureName="The Authority Suite" requiredPlan="Pro" setActiveTab={setActiveTab} />;
            return <AuthorityTab site={selectedSite} onSiteUpdate={updateSite} logApiUsage={logApiUsage} setError={(e) => toast.addToast(e||'Error', 'error')} />;
        case 'automation':
            if (!planAccess.canUseBlogAutomation) return <UpgradePlan featureName="Content Automation" requiredPlan="Creator" setActiveTab={setActiveTab} />;
            return <AutomationDashboard site={selectedSite} onSiteUpdate={updateSite} onMultipleSiteUpdates={updateMultipleSiteFields} setActiveTab={setActiveTab} planAccess={planAccess} initialSubTab={activeSubTab} />;
        case 'advertising':
            if (!planAccess.canUseAdvertising) return <UpgradePlan featureName="Advertising Dashboard" requiredPlan="Pro" setActiveTab={setActiveTab} />;
            return <AdvertisingTab site={selectedSite} setActiveTab={setActiveTab} />;
        case 'branding':
            return <BrandingTab site={selectedSite} onSiteUpdate={updateSite} onMultipleSiteUpdates={updateMultipleSiteFields} logApiUsage={logApiUsage} setActiveTab={setActiveTab} setError={(e) => toast.addToast(e||'Error', 'error')} />;
        case 'connections':
            return <ConnectionsTab site={selectedSite} onSiteUpdate={updateSite} onMultipleSiteUpdates={updateMultipleSiteFields} isConnectingSocial={isConnectingSocial} onConnect={handleConnectSocialMedia} onVerify={handleVerifySocialMedia} onVerifyCredentials={handleVerifyCredentials} onVerifyMailchimp={(s) => mailchimpService.verifyMailchimpConnection(s).then(r => { if(r.success) updateSite('mailchimpSettings', {...s, isConnected: true}); toast.addToast(r.message, r.success?'success':'error'); })} onVerifyClarity={(pid) => clarityService.verifyClarityProject(pid).then(r => { if(r.success) updateSite('clarityProjectId', pid); toast.addToast(r.message, r.success?'success':'error'); })} onVerifySupabase={dbService.verifySupabaseConnection} onVerifyPaystack={paystackService.verifyPaystackConnection} onVerifyPayfast={payfastService.verifyPayfastConnection} onVerifyWise={wiseService.verifyWiseConnection} onVerifyPayoneer={payoneerService.verifyPayoneerConnection} onVerifyStripe={stripeService.verifyStripeConnection} onVerifyPayPal={paypalService.verifyPayPalConnection} setActiveTab={setActiveTab} logApiUsage={logApiUsage} setError={(e) => toast.addToast(e||'Error', 'error')} />;
        case 'analytics':
            if (!planAccess.canUseAnalytics) return <UpgradePlan featureName="Analytics & Monitoring" requiredPlan="Creator" setActiveTab={setActiveTab} />;
            return <ApiManagementTab site={selectedSite} setActiveTab={setActiveTab} onSiteUpdate={updateSite} logApiUsage={logApiUsage} />;
        case 'api-spend':
            return <ApiSpendDashboard site={selectedSite} sites={sites} onResetAllSitesSpend={() => setSites(sites.map(s => ({ ...s, apiUsage: {} })))} onSiteUpdate={updateSite} currentUser={currentUser} setError={(e) => toast.addToast(e||'Error', 'error')} />;
        case 'subscription':
            return <SubscriptionPage currentUser={currentUser} onUpdatePlan={onUpdatePlan} />;
        case 'settings':
            return <SettingsTab site={selectedSite} onSiteUpdate={updateSite} onMultipleSiteUpdates={updateMultipleSiteFields} onOpenDeleteDialog={() => deleteSite(selectedSite.id)} setActiveTab={setActiveTab} />;
        default:
            return <div>Tab not found</div>;
    }
};
