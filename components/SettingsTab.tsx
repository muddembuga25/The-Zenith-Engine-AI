
import React, { useState, useCallback, useEffect } from 'react';
import type { Site } from '../types';
import { AiProvider, AVAILABLE_MODELS } from '../types';
import { fetchAuthors, fetchCategories, verifyWordPressConnection } from '../services/wordpressService';
import { UserIcon, KeyIcon, LinkIcon, ExclamationTriangleIcon, TrashIcon, ArrowPathIcon, CheckCircleIcon, WordPressIcon, SparklesIcon, ScaleIcon, NewspaperIcon, LightbulbIcon, XIcon, BrainCircuitIcon } from './Icons';
import { NextStepGuide } from './NextStepGuide';

// --- PROPS INTERFACE ---
interface SettingsTabProps {
    site: Site;
    onSiteUpdate: (field: keyof Site, value: any) => void;
    onMultipleSiteUpdates: (updates: Partial<Site>) => void;
    onOpenDeleteDialog: () => void;
    setActiveTab: (tab: string, subTab?: string | null) => void;
}

type WPConnectionStatus = 'idle' | 'verifying' | 'connected' | 'error';

const TabGuide: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => {
    const [isVisible, setIsVisible] = useState(true);
    if (!isVisible) return null;
    return (
        <div className="bg-panel p-5 rounded-xl border-l-4 border-brand-primary shadow-sm mb-8 flex items-start gap-4 animate-fade-in relative overflow-hidden border-y border-r border-border-subtle">
            <div className="absolute -right-6 -top-6 opacity-[0.03] pointer-events-none">
                <LightbulbIcon className="h-32 w-32 text-brand-primary" />
            </div>
            <div className="p-2 bg-brand-primary/10 rounded-full flex-shrink-0 relative z-10">
                <LightbulbIcon className="h-5 w-5 text-brand-primary" />
            </div>
            <div className="flex-1 pt-0.5 relative z-10">
                <h3 className="font-bold text-main text-lg">{title}</h3>
                <div className="text-sm text-text-secondary mt-1 leading-relaxed">
                    {children}
                </div>
            </div>
            <button 
                onClick={() => setIsVisible(false)} 
                className="p-1.5 text-text-tertiary hover:text-main rounded-full relative z-10 transition-colors hover:bg-bg-surface-highlight"
            >
                <XIcon className="h-5 w-5" />
            </button>
        </div>
    );
};

// --- Reusable Panel Component ---
const SettingsPanel: React.FC<{
    title: string;
    description: string;
    icon: React.FC<any>;
    children: React.ReactNode;
}> = ({ title, description, icon: Icon, children }) => (
    <div className="bg-panel p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex items-start gap-4 mb-6">
            <div className="p-3 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex-shrink-0">
                <Icon className="h-6 w-6 text-brand-primary" />
            </div>
            <div>
                <h3 className="text-xl font-bold text-main">{title}</h3>
                <p className="text-sm text-text-secondary mt-1">{description}</p>
            </div>
        </div>
        {children}
    </div>
);

// --- SUB-COMPONENTS FOR SETTINGS SECTIONS ---

const SiteSettingsPanel: React.FC<{ 
    site: Site;
    onSiteUpdate: (field: keyof Site, value: any) => void;
    wpConnectionState: { status: WPConnectionStatus; message: string };
    onVerifyWordPress: () => void;
}> = React.memo(({ site, onSiteUpdate, wpConnectionState, onVerifyWordPress }) => (
    <div className="space-y-4">
        <p className="text-sm text-text-secondary">Enter your site details to publish directly. <a href="https://wordpress.com/support/security/two-step-authentication/application-specific-passwords/" target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline">How to get an Application Password.</a></p>
        <div>
            <label htmlFor="site-name" className="block text-sm font-medium text-main mb-2">Site Name</label>
            <input id="site-name" type="text" value={site.name} onChange={(e) => onSiteUpdate('name', e.target.value)} placeholder="e.g., My Awesome Blog" className="input-base px-4 py-2 w-full" />
        </div>
        <div className="relative"> <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><LinkIcon className="h-5 w-5 text-text-tertiary"/></div> <input type="url" value={site.wordpressUrl} onChange={(e) => onSiteUpdate('wordpressUrl', e.target.value)} placeholder="https://your-wordpress-site.com" className="input-base pl-10 pr-4 py-2 w-full" /> </div>
        <div className="relative"> <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><UserIcon className="h-5 w-5 text-text-tertiary"/></div> <input type="text" value={site.wordpressUsername} onChange={(e) => onSiteUpdate('wordpressUsername', e.target.value)} placeholder="WordPress Username" className="input-base pl-10 pr-4 py-2 w-full" /> </div>
        <div className="relative"> <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><KeyIcon className="h-5 w-5 text-text-tertiary"/></div> <input type="password" value={site.applicationPassword} onChange={(e) => onSiteUpdate('applicationPassword', e.target.value)} placeholder="Application Password" className="input-base pl-10 pr-4 py-2 w-full" /> </div>
        <div className="flex items-center gap-3 mt-4 p-3 rounded-lg border border-border-subtle bg-panel-light/50">
            {wpConnectionState.status === 'verifying' && <svg className="animate-spin h-5 w-5 text-brand-primary flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
            {wpConnectionState.status === 'connected' && <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0" />}
            {wpConnectionState.status === 'error' && <ExclamationTriangleIcon className="h-5 w-5 text-red-400 flex-shrink-0" />}
            {wpConnectionState.status === 'idle' && <div className="h-5 w-5 flex-shrink-0 pt-1.5 pl-1.5"><div className="w-2 h-2 rounded-full bg-text-tertiary"></div></div>}
            
            <p className={`text-sm flex-grow ${
                wpConnectionState.status === 'connected' ? 'text-green-500' :
                wpConnectionState.status === 'error' ? 'text-red-500' :
                'text-text-secondary'
            }`}>
                {wpConnectionState.message}
            </p>
             {wpConnectionState.status !== 'connected' && (
                <button onClick={onVerifyWordPress} className="btn btn-secondary text-xs px-3 py-1.5" disabled={wpConnectionState.status === 'verifying'}>
                    {wpConnectionState.status === 'verifying' ? 'Verifying...' : 'Verify'}
                </button>
             )}
        </div>
    </div>
));

const AuthorAndContentPanel: React.FC<{
    site: Site;
    onSiteUpdate: (field: keyof Site, value: any) => void;
    onMultipleSiteUpdates: (updates: Partial<Site>) => void;
}> = React.memo(({ site, onSiteUpdate, onMultipleSiteUpdates }) => {
    const [isFetchingAuthors, setIsFetchingAuthors] = useState(false);
    const [authorFetchError, setAuthorFetchError] = useState<string | null>(null);
    const [isFetchingCategories, setIsFetchingCategories] = useState(false);
    const [categoryFetchError, setCategoryFetchError] = useState<string | null>(null);

    const handleFetchAuthors = useCallback(async () => {
        if (!site.wordpressUrl || !site.wordpressUsername || !site.applicationPassword) {
            setAuthorFetchError("Please fill in your WordPress URL, Username, and Application Password first.");
            return;
        }
        setIsFetchingAuthors(true);
        setAuthorFetchError(null);
        try {
            const authors = await fetchAuthors({ url: site.wordpressUrl, username: site.wordpressUsername, password: site.applicationPassword });
            const updates: Partial<Site> = { availableAuthors: authors };
            if (authors.length > 0 && (!site.authorId || !authors.some(a => a.id === site.authorId))) {
                updates.authorId = authors[0].id;
                updates.authorName = authors[0].name;
            }
            onMultipleSiteUpdates(updates);
        } catch (error: any) {
            setAuthorFetchError(error.message || "Failed to fetch authors. Your user might not have permission.");
            onMultipleSiteUpdates({ availableAuthors: [], authorId: undefined });
        } finally {
            setIsFetchingAuthors(false);
        }
    }, [site.wordpressUrl, site.wordpressUsername, site.applicationPassword, site.authorId, onMultipleSiteUpdates]);
    
    const handleAuthorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newAuthorId = e.target.value ? parseInt(e.target.value, 10) : undefined;
        const selectedAuthor = site.availableAuthors?.find(a => a.id === newAuthorId);
        onMultipleSiteUpdates({
            authorId: newAuthorId,
            authorName: selectedAuthor?.name || site.wordpressUsername || 'Admin' // Fallback
        });
    };

    const handleFetchCategories = useCallback(async () => {
        if (!site.wordpressUrl || !site.wordpressUsername || !site.applicationPassword) {
            setCategoryFetchError("Please fill in your WordPress credentials first.");
            return;
        }
        setIsFetchingCategories(true);
        setCategoryFetchError(null);
        try {
            const categories = await fetchCategories({ url: site.wordpressUrl, username: site.wordpressUsername, password: site.applicationPassword });
            onSiteUpdate('availableCategories', categories);
        } catch (error: any) {
            setCategoryFetchError(error.message || "Failed to fetch categories.");
            onSiteUpdate('availableCategories', []);
        } finally {
            setIsFetchingCategories(false);
        }
    }, [site.wordpressUrl, site.wordpressUsername, site.applicationPassword, onSiteUpdate]);

    useEffect(() => {
        if (site.wordpressUrl && site.wordpressUsername && site.applicationPassword) {
            if (!site.availableAuthors || site.availableAuthors.length === 0) {
                handleFetchAuthors();
            }
            if (!site.availableCategories || site.availableCategories.length === 0) {
                handleFetchCategories();
            }
        }
    }, [site.wordpressUrl, site.wordpressUsername, site.applicationPassword, handleFetchAuthors, handleFetchCategories]);

    const showAuthorDropdown = site.availableAuthors && site.availableAuthors.length > 0;

    return (
        <div className="space-y-6">
            <div>
                <h4 className="text-md font-bold text-main">Author Configuration</h4>
                <div className="mt-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-main mb-1">Default Post Author</label>
                         <p className="text-xs text-text-secondary mb-2">Select an author from your WordPress site. This will be the public author of the post and will be used in schema data.</p>
                        <div className="flex items-center gap-2">
                            {showAuthorDropdown ? (
                                <select value={site.authorId || ''} onChange={handleAuthorChange} className="input-base px-3 py-2 flex-grow" disabled={isFetchingAuthors}>
                                    <option value="" disabled>Select an author...</option>
                                    {site.availableAuthors?.map(author => (<option key={author.id} value={author.id}>{author.name}</option>))}
                                </select>
                            ) : (
                                <div className="input-base px-3 py-2 flex-grow bg-panel-light text-text-secondary italic text-sm">
                                    {isFetchingAuthors ? 'Fetching authors...' : 'Connect to WP...'}
                                </div>
                            )}
                            <button onClick={handleFetchAuthors} disabled={isFetchingAuthors} className="btn btn-secondary p-2 flex-shrink-0" title="Refresh author list">
                                {isFetchingAuthors ? <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle opacity="25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path opacity="75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <ArrowPathIcon className="h-5 w-5"/>}
                            </button>
                        </div>
                        {authorFetchError && !isFetchingAuthors && (<p className="text-xs text-yellow-500 mt-2">{authorFetchError}</p>)}
                    </div>
                </div>
            </div>
            <div className="mt-6 pt-6 border-t border-border-subtle">
                <h4 className="text-md font-bold text-main">Category Configuration</h4>
                <div className="mt-4 space-y-4">
                    <div className="flex items-center justify-between p-3 bg-panel-light rounded-lg border border-border-subtle">
                        <div>
                            <label htmlFor="strict-categories" className="font-medium text-main cursor-pointer">Strict Category Matching</label>
                            <p className="text-xs text-text-secondary mt-1">Only use categories that already exist on your WordPress site. Prevents AI from creating new ones.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                id="strict-categories" 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={site.isStrictCategoryMatching ?? false} 
                                onChange={e => onSiteUpdate('isStrictCategoryMatching', e.target.checked)} 
                            />
                            <div className="w-11 h-6 bg-gray-500/30 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                        </label>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-main mb-1">Available Categories</label>
                        <p className="text-xs text-text-secondary mb-2">Fetch and view categories from your WordPress site. The AI will use these when "Strict Matching" is enabled.</p>
                        <div className="flex items-center gap-2">
                            <div className="input-base px-3 py-2 flex-grow bg-panel-light text-text-secondary italic text-sm overflow-hidden h-10">
                                {site.availableCategories && site.availableCategories.length > 0
                                    ? <div className="flex flex-wrap gap-1 overflow-hidden h-full">{site.availableCategories.map(c => <span key={c.id} className="bg-panel border border-border-subtle text-xs px-2 py-0.5 rounded-full">{c.name}</span>)}</div>
                                    : (isFetchingCategories ? 'Fetching...' : 'Connect to WP to fetch categories...')
                                }
                            </div>
                            <button onClick={handleFetchCategories} disabled={isFetchingCategories} className="btn btn-secondary p-2 flex-shrink-0" title="Refresh category list">
                                {isFetchingCategories ? <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle opacity="25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path opacity="75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <ArrowPathIcon className="h-5 w-5"/>}
                            </button>
                        </div>
                        {categoryFetchError && !isFetchingCategories && (<p className="text-xs text-yellow-500 mt-2">{categoryFetchError}</p>)}
                    </div>
                </div>
            </div>
        </div>
    );
});

const ModelConfigurationPanel: React.FC<{
    site: Site;
    onSiteUpdate: (field: keyof Site, value: any) => void;
}> = React.memo(({ site, onSiteUpdate }) => {
    const handleModelChange = (field: keyof typeof site.modelConfig, value: string) => {
        onSiteUpdate('modelConfig', { ...site.modelConfig, [field]: value });
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 className="text-sm font-semibold text-main mb-3 flex items-center gap-2"><NewspaperIcon className="h-4 w-4"/> Text Generation</h4>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-text-secondary">Provider</label>
                            <select value={site.modelConfig.textProvider} onChange={e => handleModelChange('textProvider', e.target.value)} className="input-base w-full text-sm">
                                {Object.keys(AiProvider).map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-text-secondary">Model</label>
                            <input list="text-models" value={site.modelConfig.textModel} onChange={e => handleModelChange('textModel', e.target.value)} className="input-base w-full text-sm" />
                            <datalist id="text-models">
                                {AVAILABLE_MODELS[site.modelConfig.textProvider]?.text.map(m => <option key={m} value={m} />)}
                            </datalist>
                        </div>
                    </div>
                </div>
                <div>
                    <h4 className="text-sm font-semibold text-main mb-3 flex items-center gap-2"><SparklesIcon className="h-4 w-4"/> Image Generation</h4>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-text-secondary">Provider</label>
                            <select value={site.modelConfig.imageProvider} onChange={e => handleModelChange('imageProvider', e.target.value)} className="input-base w-full text-sm">
                                {Object.keys(AiProvider).map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-text-secondary">Model</label>
                            <input list="image-models" value={site.modelConfig.imageModel} onChange={e => handleModelChange('imageModel', e.target.value)} className="input-base w-full text-sm" />
                            <datalist id="image-models">
                                {AVAILABLE_MODELS[site.modelConfig.imageProvider]?.image.map(m => <option key={m} value={m} />)}
                            </datalist>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

const AssistantSettingsPanel: React.FC<{
    site: Site;
    onSiteUpdate: (field: keyof Site, value: any) => void;
}> = React.memo(({ site, onSiteUpdate }) => {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <label htmlFor="enable-assistant" className="font-medium text-main cursor-pointer">Enable AI Agent</label>
                <label className="relative inline-flex items-center cursor-pointer"><input id="enable-assistant" type="checkbox" className="sr-only peer" checked={site.isAssistantEnabled ?? true} onChange={e => onSiteUpdate('isAssistantEnabled', e.target.checked)} /><div className="w-11 h-6 bg-gray-600/50 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div></label>
            </div>
            {(site.isAssistantEnabled ?? true) && (
                <div className="pl-6 border-l-2 border-border-subtle space-y-3 pt-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                        <label htmlFor="show-voice-btn" className="text-sm text-text-secondary cursor-pointer">Show Voice Button</label>
                        <label className="relative inline-flex items-center cursor-pointer"><input id="show-voice-btn" type="checkbox" className="sr-only peer" checked={site.isVoiceControlEnabled ?? true} onChange={e => onSiteUpdate('isVoiceControlEnabled', e.target.checked)} /><div className="w-9 h-5 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary"></div></label>
                    </div>
                     <div className="flex items-center justify-between">
                        <label htmlFor="show-video-btn" className="text-sm text-text-secondary cursor-pointer">Show Video Button</label>
                        <label className="relative inline-flex items-center cursor-pointer"><input id="show-video-btn" type="checkbox" className="sr-only peer" checked={site.isVideoControlEnabled ?? true} onChange={e => onSiteUpdate('isVideoControlEnabled', e.target.checked)} /><div className="w-9 h-5 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary"></div></label>
                    </div>
                    <div className="flex items-center justify-between">
                        <label htmlFor="show-text-btn" className="text-sm text-text-secondary cursor-pointer">Show Text Button</label>
                        <label className="relative inline-flex items-center cursor-pointer"><input id="show-text-btn" type="checkbox" className="sr-only peer" checked={site.isTextControlEnabled ?? true} onChange={e => onSiteUpdate('isTextControlEnabled', e.target.checked)} /><div className="w-9 h-5 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary"></div></label>
                    </div>
                </div>
            )}
        </div>
    );
});

export const SettingsTab: React.FC<SettingsTabProps> = ({ site, onSiteUpdate, onMultipleSiteUpdates, onOpenDeleteDialog, setActiveTab }) => {
    const [wpConnectionState, setWpConnectionState] = useState<{ status: WPConnectionStatus; message: string }>({ status: 'idle', message: 'Not connected' });

    useEffect(() => {
        if (!site.wordpressUrl) {
            setWpConnectionState({ status: 'idle', message: 'Enter site URL' });
        } else if (site.wordpressUrl && site.wordpressUsername && site.applicationPassword) {
            setWpConnectionState({ status: 'idle', message: 'Credentials entered. Ready to verify.' });
        }
    }, [site.wordpressUrl, site.wordpressUsername, site.applicationPassword]);

    const handleVerifyWordPress = useCallback(async () => {
        setWpConnectionState({ status: 'verifying', message: 'Verifying...' });
        const result = await verifyWordPressConnection({
            url: site.wordpressUrl,
            username: site.wordpressUsername,
            password: site.applicationPassword,
        });
        
        setWpConnectionState({ 
            status: result.success ? 'connected' : 'error', 
            message: result.message 
        });
        
        if (result.success && result.siteName) {
            // Optional: Update site name if it was just "New Site"
            if (site.name.startsWith("New Site")) {
                onSiteUpdate('name', result.siteName);
            }
        }
    }, [site.wordpressUrl, site.wordpressUsername, site.applicationPassword, site.name, onSiteUpdate]);

    const hasKeywords = site.keywordList && site.keywordList.split('\n').some(k => k.trim() && !k.trim().startsWith('[DONE]'));

    return (
        <div className="w-full max-w-4xl mx-auto space-y-8">
            <TabGuide title="Site Configuration">
                <p>Configure the foundational settings for <strong>{site.name}</strong>. Connect your WordPress site, manage authors, and fine-tune your AI model preferences.</p>
            </TabGuide>

            <div className="bg-panel/50 p-6 rounded-2xl border border-border">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-main">General Settings</h2>
                        <p className="text-text-secondary mt-1">Manage core configuration for this site.</p>
                    </div>
                    <button onClick={onOpenDeleteDialog} className="btn bg-red-900/40 hover:bg-red-800/60 text-red-300 flex items-center gap-2 px-4 py-2 border border-red-500/30">
                        <TrashIcon className="h-5 w-5" />
                        Delete Site
                    </button>
                </div>
            </div>

            <SettingsPanel title="WordPress Connection" description="Connect your WordPress site to enable direct publishing." icon={WordPressIcon}>
                <SiteSettingsPanel site={site} onSiteUpdate={onSiteUpdate} wpConnectionState={wpConnectionState} onVerifyWordPress={handleVerifyWordPress} />
            </SettingsPanel>

            <SettingsPanel title="Authors & Content" description="Map AI content to specific WordPress authors and categories." icon={UserIcon}>
                <AuthorAndContentPanel site={site} onSiteUpdate={onSiteUpdate} onMultipleSiteUpdates={onMultipleSiteUpdates} />
            </SettingsPanel>

            <SettingsPanel title="AI Model Configuration" description="Choose which AI models power your content generation." icon={ScaleIcon}>
                <ModelConfigurationPanel site={site} onSiteUpdate={onSiteUpdate} />
            </SettingsPanel>

            <SettingsPanel title="AI Agent Settings" description="Configure the on-screen assistant capabilities for this site." icon={BrainCircuitIcon}>
                <AssistantSettingsPanel site={site} onSiteUpdate={onSiteUpdate} />
            </SettingsPanel>

            {wpConnectionState.status === 'connected' && !hasKeywords && (
                <NextStepGuide
                    label="Add Content Ideas"
                    description="Your site is connected! Now, let's give the AI some topics to write about."
                    onClick={() => setActiveTab('content', 'blog')}
                />
            )}
        </div>
    );
};
