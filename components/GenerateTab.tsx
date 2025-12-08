
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { Site, RssItem, ApiKeys, VideoSource, RssSource, GoogleSheetSource } from '../types';
import { suggestKeywords } from '../services/aiService';
import { fetchAndParseRssFeed } from '../services/rssService';
import { fetchSheetData } from '../services/googleSheetService';
import { ExclamationTriangleIcon, LinkIcon, LightbulbIcon, TrashIcon, DocumentTextIcon, RssIcon, VideoCameraIcon, GoogleIcon, ArrowPathIcon, BrainCircuitIcon, XIcon, CheckCircleIcon, SparklesIcon, ChevronDownIcon } from './Icons';
import { ContentSourcesManager } from './ContentSourcesManager';

interface GenerateTabProps {
    site: Site;
    onSiteUpdate: (field: keyof Site, value: any) => void;
    onGenerateAndScore: (topicToTrack: string, generationSource: 'keyword' | 'rss' | 'video' | 'google_sheet' | 'agency_agent', sourceDetails: any, site: Site) => Promise<void>;
    setActiveTab: (tab: string, subTab?: string | null) => void;
    setError: (error: string | null) => void;
    logApiUsage: (provider: keyof ApiKeys, cost: number) => void;
    onRefreshArticle: (url: string, site: Site) => Promise<void>;
}

export const GenerateTab: React.FC<GenerateTabProps> = ({ site, onSiteUpdate, onGenerateAndScore, setActiveTab, setError, logApiUsage, onRefreshArticle }) => {
    const [manualGenerationSource, setManualGenerationSource] = useState<'keyword' | 'rss' | 'video' | 'google_sheet' | 'refresh_url' | 'agency_agent'>('keyword');
    const [isSuggestingKeywords, setIsSuggestingKeywords] = useState(false);
    const [isSourcesManagerOpen, setIsSourcesManagerOpen] = useState(false);
    
    // Data States
    const [rssItems, setRssItems] = useState<RssItem[]>([]);
    const [selectedRssSourceId, setSelectedRssSourceId] = useState<string>('');
    const [isFetchingRss, setIsFetchingRss] = useState(false);

    const [videoItems, setVideoItems] = useState<RssItem[]>([]);
    const [selectedVideoSourceId, setSelectedVideoSourceId] = useState<string>('');
    const [isFetchingVideo, setIsFetchingVideo] = useState(false);

    const [sheetRows, setSheetRows] = useState<string[]>([]);
    const [selectedSheetSourceId, setSelectedSheetSourceId] = useState<string>('');
    const [isFetchingSheet, setIsFetchingSheet] = useState(false);

    const [refreshUrl, setRefreshUrl] = useState('');
    
    // --- Keyword Management ---
    const handleKeywordChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onSiteUpdate('keywordList', e.target.value);
    };

    const handleSuggest = async () => {
        const lines = site.keywordList.split('\n').filter(l => l.trim());
        const seed = lines.length > 0 ? lines[lines.length - 1] : site.name;
        
        setIsSuggestingKeywords(true);
        setError(null);
        try {
            const { suggestions, cost } = await suggestKeywords(seed, site);
            logApiUsage('google', cost);
            const newList = site.keywordList ? `${site.keywordList}\n${suggestions.join('\n')}` : suggestions.join('\n');
            onSiteUpdate('keywordList', newList);
        } catch (error: any) {
            setError(error.message || "Failed to suggest keywords.");
        } finally {
            setIsSuggestingKeywords(false);
        }
    };

    const handleClearKeywords = () => {
        if (window.confirm("Clear all keywords?")) {
            onSiteUpdate('keywordList', '');
        }
    };

    // --- RSS Handling ---
    // Auto-select first source if none selected or if selected was deleted
    useEffect(() => {
        if (manualGenerationSource === 'rss') {
            const exists = site.rssSources.find(s => s.id === selectedRssSourceId);
            if (!exists && site.rssSources.length > 0) {
                setSelectedRssSourceId(site.rssSources[0].id);
            } else if (site.rssSources.length === 0) {
                setSelectedRssSourceId('');
                setRssItems([]);
            }
        }
    }, [manualGenerationSource, site.rssSources, selectedRssSourceId]);

    useEffect(() => {
        if (selectedRssSourceId) {
            const source = site.rssSources.find(s => s.id === selectedRssSourceId);
            if (source) {
                setIsFetchingRss(true);
                setError(null);
                fetchAndParseRssFeed(source.url)
                    .then(feed => setRssItems(feed.items))
                    .catch(err => {
                        console.error(err);
                        setError(`Failed to fetch RSS feed: ${source.name}. ${err.message}`);
                        setRssItems([]);
                    })
                    .finally(() => setIsFetchingRss(false));
            }
        }
    }, [selectedRssSourceId, site.rssSources, setError]);

    // --- Video Handling ---
    useEffect(() => {
        if (manualGenerationSource === 'video') {
            const exists = site.videoSources.find(s => s.id === selectedVideoSourceId);
            if (!exists && site.videoSources.length > 0) {
                setSelectedVideoSourceId(site.videoSources[0].id);
            } else if (site.videoSources.length === 0) {
                setSelectedVideoSourceId('');
                setVideoItems([]);
            }
        }
    }, [manualGenerationSource, site.videoSources, selectedVideoSourceId]);

    useEffect(() => {
        if (selectedVideoSourceId) {
            const source = site.videoSources.find(s => s.id === selectedVideoSourceId);
            if (source) {
                if (source.type === 'channel') {
                    setIsFetchingVideo(true);
                    setError(null);
                    fetchAndParseRssFeed(source.url)
                        .then(feed => setVideoItems(feed.items))
                        .catch(err => {
                            console.error(err);
                            setError(`Failed to fetch video feed: ${source.name}. ${err.message}`);
                            setVideoItems([]);
                        })
                        .finally(() => setIsFetchingVideo(false));
                } else {
                    // Single video, create a dummy item to display
                    setVideoItems([{
                        guid: source.url,
                        title: source.name,
                        link: source.url,
                        contentSnippet: 'Single Video Source'
                    }]);
                }
            }
        }
    }, [selectedVideoSourceId, site.videoSources, setError]);

    // --- Google Sheet Handling ---
    useEffect(() => {
        if (manualGenerationSource === 'google_sheet') {
            const exists = site.googleSheetSources.find(s => s.id === selectedSheetSourceId);
            if (!exists && site.googleSheetSources.length > 0) {
                setSelectedSheetSourceId(site.googleSheetSources[0].id);
            } else if (site.googleSheetSources.length === 0) {
                setSelectedSheetSourceId('');
                setSheetRows([]);
            }
        }
    }, [manualGenerationSource, site.googleSheetSources, selectedSheetSourceId]);

    useEffect(() => {
        if (selectedSheetSourceId) {
            const source = site.googleSheetSources.find(s => s.id === selectedSheetSourceId);
            // Try to find a valid token from connected Google services
            const googleAccount = site.socialMediaSettings.youtube.find(acc => acc.isConnected && acc.accessToken) 
                                || site.socialMediaSettings.google_ads?.[0]
                                || site.googleAnalyticsSettings;
            
            const token = (googleAccount as any)?.accessToken || (googleAccount as any)?.userAccessToken;

            if (source && token) {
                setIsFetchingSheet(true);
                setError(null);
                fetchSheetData(source.url, token)
                    .then(rows => setSheetRows(rows || []))
                    .catch(err => {
                        console.error(err);
                        setError(`Failed to read Google Sheet: ${err.message}`);
                        setSheetRows([]);
                    })
                    .finally(() => setIsFetchingSheet(false));
            } else if (source && !token) {
                setError("No connected Google account found. Please connect YouTube, Google Ads, or Analytics in Connections tab to access Sheets.");
                setSheetRows([]);
            }
        }
    }, [selectedSheetSourceId, site.googleSheetSources, site.socialMediaSettings, site.googleAnalyticsSettings, setError]);


    const sourceTypes = [
        { id: 'keyword', icon: DocumentTextIcon, label: 'Keyword List', color: 'text-brand-primary' },
        { id: 'rss', icon: RssIcon, label: 'RSS Feed', color: 'text-brand-primary' },
        { id: 'video', icon: VideoCameraIcon, label: 'Video Source', color: 'text-brand-primary' },
        { id: 'google_sheet', icon: GoogleIcon, label: 'Google Sheet', color: 'text-brand-primary' },
        { id: 'agency_agent', icon: BrainCircuitIcon, label: 'Agency Agent', color: 'text-brand-primary' },
        { id: 'refresh_url', icon: ArrowPathIcon, label: 'Refresh URL', color: 'text-brand-primary' },
    ];

    const renderContent = () => {
        switch (manualGenerationSource) {
            case 'keyword':
                return (
                    <div className="space-y-4 animate-fade-in">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-medium text-text-primary">Target Keywords (one per line)</label>
                            <div className="space-x-2">
                                <button onClick={handleSuggest} disabled={isSuggestingKeywords} className="btn btn-secondary text-xs px-3 py-1.5">
                                    {isSuggestingKeywords ? 'Suggesting...' : 'Suggest More'}
                                </button>
                                <button onClick={handleClearKeywords} className="btn btn-secondary text-xs px-3 py-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/20">
                                    Clear
                                </button>
                            </div>
                        </div>
                        <textarea
                            value={site.keywordList}
                            onChange={handleKeywordChange}
                            className="input-base w-full p-4 h-96 font-mono text-sm leading-6 resize-y bg-panel-light border-border-subtle focus:bg-panel"
                            placeholder="Enter your keywords here..."
                        />
                        <div className="flex justify-end">
                            <button 
                                onClick={() => {
                                    const nextKeyword = site.keywordList.split('\n').find(k => k.trim() && !k.trim().startsWith('[DONE]'));
                                    if (nextKeyword) onGenerateAndScore(nextKeyword.trim(), 'keyword', nextKeyword.trim(), site);
                                    else setError("No keywords available. Add some above.");
                                }}
                                className="btn btn-primary"
                            >
                                Generate Next from List
                            </button>
                        </div>
                    </div>
                );
            case 'rss':
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex gap-4 items-end">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-text-primary mb-2">Select RSS Feed</label>
                                <select 
                                    value={selectedRssSourceId} 
                                    onChange={e => setSelectedRssSourceId(e.target.value)} 
                                    className="input-base w-full"
                                    disabled={site.rssSources.length === 0}
                                >
                                    {site.rssSources.length === 0 && <option value="">No feeds configured</option>}
                                    {site.rssSources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <button onClick={() => setIsSourcesManagerOpen(true)} className="btn btn-secondary whitespace-nowrap">Manage Sources</button>
                        </div>

                        {site.rssSources.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-border rounded-xl bg-panel-light/30">
                                <RssIcon className="h-10 w-10 text-text-secondary mx-auto" />
                                <p className="mt-2 text-text-secondary">No RSS feeds added yet.</p>
                                <button onClick={() => setIsSourcesManagerOpen(true)} className="mt-4 btn btn-primary text-sm">Add RSS Feed</button>
                            </div>
                        ) : isFetchingRss ? (
                            <div className="text-center py-12"><div className="animate-spin h-8 w-8 border-4 border-brand-primary border-t-transparent rounded-full mx-auto"></div><p className="mt-2 text-text-secondary">Fetching feed...</p></div>
                        ) : (
                            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                                {rssItems.map((item, i) => {
                                    const isProcessed = site.rssSources.find(s => s.id === selectedRssSourceId)?.processedRssGuids.includes(item.guid);
                                    return (
                                        <div key={i} className={`p-4 rounded-lg border ${isProcessed ? 'bg-panel-light border-border opacity-60' : 'bg-panel border-border-subtle hover:border-brand-primary/50'} transition-all`}>
                                            <h4 className="font-semibold text-text-primary mb-1 line-clamp-1">{item.title}</h4>
                                            <p className="text-xs text-text-secondary mb-3 line-clamp-2">{item.contentSnippet}</p>
                                            <div className="flex justify-between items-center">
                                                <a href={item.link} target="_blank" rel="noreferrer" className="text-xs text-brand-primary hover:underline flex items-center gap-1"><LinkIcon className="h-3 w-3" /> Read Original</a>
                                                <button 
                                                    onClick={() => onGenerateAndScore(item.title, 'rss', { item, sourceId: selectedRssSourceId }, site)}
                                                    disabled={isProcessed}
                                                    className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${isProcessed ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-brand-primary text-white hover:bg-brand-primary-hover'}`}
                                                >
                                                    {isProcessed ? 'Generated' : 'Generate Post'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {rssItems.length === 0 && <p className="text-center text-text-secondary py-8">No items found in this feed.</p>}
                            </div>
                        )}
                    </div>
                );
            case 'video':
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex gap-4 items-end">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-text-primary mb-2">Select Video Source</label>
                                <select 
                                    value={selectedVideoSourceId} 
                                    onChange={e => setSelectedVideoSourceId(e.target.value)} 
                                    className="input-base w-full"
                                    disabled={site.videoSources.length === 0}
                                >
                                    {site.videoSources.length === 0 && <option value="">No video sources configured</option>}
                                    {site.videoSources.map(s => <option key={s.id} value={s.id}>{s.name} ({s.type})</option>)}
                                </select>
                            </div>
                            <button onClick={() => setIsSourcesManagerOpen(true)} className="btn btn-secondary whitespace-nowrap">Manage Sources</button>
                        </div>

                        {site.videoSources.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-border rounded-xl bg-panel-light/30">
                                <VideoCameraIcon className="h-10 w-10 text-text-secondary mx-auto" />
                                <p className="mt-2 text-text-secondary">No video sources added yet.</p>
                                <button onClick={() => setIsSourcesManagerOpen(true)} className="mt-4 btn btn-primary text-sm">Add Video Source</button>
                            </div>
                        ) : isFetchingVideo ? (
                            <div className="text-center py-12"><div className="animate-spin h-8 w-8 border-4 border-brand-primary border-t-transparent rounded-full mx-auto"></div><p className="mt-2 text-text-secondary">Fetching videos...</p></div>
                        ) : (
                            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                                {videoItems.map((item, i) => {
                                    const source = site.videoSources.find(s => s.id === selectedVideoSourceId);
                                    const isProcessed = source?.processedVideoGuids.includes(item.guid) || source?.processedVideoGuids.includes(item.link); 
                                    
                                    return (
                                        <div key={i} className={`p-4 rounded-lg border ${isProcessed ? 'bg-panel-light border-border opacity-60' : 'bg-panel border-border-subtle hover:border-brand-primary/50'} transition-all`}>
                                            <h4 className="font-semibold text-text-primary mb-1 line-clamp-1">{item.title}</h4>
                                            <p className="text-xs text-text-secondary mb-3 line-clamp-2">{item.contentSnippet}</p>
                                            <div className="flex justify-between items-center">
                                                <a href={item.link} target="_blank" rel="noreferrer" className="text-xs text-brand-primary hover:underline flex items-center gap-1"><LinkIcon className="h-3 w-3" /> Watch Video</a>
                                                <button 
                                                    onClick={() => onGenerateAndScore(item.title, 'video', { item, sourceId: selectedVideoSourceId }, site)}
                                                    disabled={isProcessed}
                                                    className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${isProcessed ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-brand-primary text-white hover:bg-brand-primary-hover'}`}
                                                >
                                                    {isProcessed ? 'Generated' : 'Generate Post'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {videoItems.length === 0 && <p className="text-center text-text-secondary py-8">No videos found.</p>}
                            </div>
                        )}
                    </div>
                );
            case 'google_sheet':
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex gap-4 items-end">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-text-primary mb-2">Select Google Sheet</label>
                                <select 
                                    value={selectedSheetSourceId} 
                                    onChange={e => setSelectedSheetSourceId(e.target.value)} 
                                    className="input-base w-full"
                                    disabled={site.googleSheetSources.length === 0}
                                >
                                    {site.googleSheetSources.length === 0 && <option value="">No sheets configured</option>}
                                    {site.googleSheetSources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <button onClick={() => setIsSourcesManagerOpen(true)} className="btn btn-secondary whitespace-nowrap">Manage Sources</button>
                        </div>

                        {site.googleSheetSources.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-border rounded-xl bg-panel-light/30">
                                <GoogleIcon className="h-10 w-10 text-text-secondary mx-auto" />
                                <p className="mt-2 text-text-secondary">No Google Sheets added yet.</p>
                                <button onClick={() => setIsSourcesManagerOpen(true)} className="mt-4 btn btn-primary text-sm">Add Google Sheet</button>
                            </div>
                        ) : isFetchingSheet ? (
                            <div className="text-center py-12"><div className="animate-spin h-8 w-8 border-4 border-brand-primary border-t-transparent rounded-full mx-auto"></div><p className="mt-2 text-text-secondary">Reading sheet...</p></div>
                        ) : (
                            <div className="space-y-1 bg-panel border border-border rounded-lg overflow-hidden max-h-[600px] overflow-y-auto">
                                {sheetRows.map((rowTopic, i) => {
                                    const isProcessed = site.googleSheetSources.find(s => s.id === selectedSheetSourceId)?.processedGoogleSheetRows.includes(i);
                                    return (
                                        <div key={i} className={`p-3 flex justify-between items-center border-b border-border last:border-0 ${isProcessed ? 'bg-panel-light opacity-60' : 'hover:bg-bg-surface-highlight'}`}>
                                            <span className="text-sm text-text-primary truncate flex-1 mr-4">{rowTopic}</span>
                                            <button 
                                                onClick={() => onGenerateAndScore(rowTopic, 'google_sheet', { item: rowTopic, sourceId: selectedSheetSourceId, rowIndex: i }, site)}
                                                disabled={isProcessed}
                                                className={`text-xs px-3 py-1 rounded-md font-medium transition-colors ${isProcessed ? 'text-gray-500' : 'text-brand-primary hover:bg-brand-primary/10'}`}
                                            >
                                                {isProcessed ? 'Done' : 'Generate'}
                                            </button>
                                        </div>
                                    );
                                })}
                                {sheetRows.length === 0 && <div className="p-8 text-center text-text-secondary">No rows found in this sheet.</div>}
                            </div>
                        )}
                    </div>
                );
            case 'agency_agent':
                const agentPosts = site.agentScheduledPosts || [];
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-main">Agent Discoveries</h3>
                            <div className="text-xs text-text-secondary">
                                {site.isAgencyAgentEnabled ? <span className="text-green-400">Agent Active</span> : <span className="text-gray-500">Agent Disabled</span>}
                            </div>
                        </div>
                        {agentPosts.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-border rounded-xl bg-panel-light/30">
                                <BrainCircuitIcon className="h-10 w-10 text-text-secondary mx-auto" />
                                <p className="mt-2 text-text-secondary">No agent ideas yet. Enable the agent in Settings or wait for the next run.</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                                {agentPosts.map((post) => (
                                    <div key={post.id} className={`p-4 rounded-lg border ${post.status === 'complete' ? 'bg-panel-light border-border opacity-60' : 'bg-panel border-border-subtle hover:border-brand-primary/50'} transition-all`}>
                                        <h4 className="font-semibold text-text-primary mb-1">{post.topic}</h4>
                                        <p className="text-xs text-text-secondary mb-3">{post.reasoning || "Discovered by AI Agent based on trends."}</p>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-text-tertiary">{new Date(post.suggestedTime).toLocaleDateString()}</span>
                                            <button 
                                                onClick={() => onGenerateAndScore(post.topic, 'agency_agent', { value: { agentPostId: post.id, topic: post.topic } }, site)}
                                                disabled={post.status === 'complete'}
                                                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${post.status === 'complete' ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-brand-primary text-white hover:bg-brand-primary-hover'}`}
                                            >
                                                {post.status === 'complete' ? 'Generated' : 'Approve & Generate'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 'refresh_url':
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">Existing Article URL</label>
                            <div className="flex gap-2">
                                <input 
                                    type="url" 
                                    value={refreshUrl} 
                                    onChange={e => setRefreshUrl(e.target.value)} 
                                    placeholder="https://mysite.com/old-post" 
                                    className="input-base flex-1"
                                />
                                <button 
                                    onClick={() => onRefreshArticle(refreshUrl, site)}
                                    disabled={!refreshUrl}
                                    className="btn btn-primary"
                                >
                                    Refresh Article
                                </button>
                            </div>
                            <p className="text-xs text-text-secondary mt-2">
                                The AI will analyze the existing content, keep the URL slug, but rewrite the content to be fresher, more SEO-optimized, and include a new image.
                            </p>
                        </div>
                    </div>
                );
            default:
                return <div>Unknown source</div>;
        }
    };
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 h-[calc(100vh-200px)]">
            {isSourcesManagerOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsSourcesManagerOpen(false)}>
                    <div className="bg-panel rounded-xl shadow-2xl w-full max-w-2xl border border-border animate-modal-pop max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <ContentSourcesManager site={site} onSiteUpdate={onSiteUpdate} onClose={() => setIsSourcesManagerOpen(false)} />
                    </div>
                </div>
            )}

            <div className="md:col-span-1 h-full overflow-y-auto">
                <div className="p-4 bg-panel/50 rounded-2xl border border-border h-full">
                    <h3 className="text-lg font-bold text-main mb-4">Content Sources</h3>
                    <div className="space-y-2">
                        {sourceTypes.map(type => (
                            <button 
                                key={type.id} 
                                onClick={() => setManualGenerationSource(type.id as any)} 
                                className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${manualGenerationSource === type.id ? 'bg-brand-primary text-white shadow-lg' : 'text-text-secondary hover:bg-panel-light hover:text-main'}`}
                            >
                                <type.icon className={`h-5 w-5 flex-shrink-0 ${manualGenerationSource === type.id ? 'text-white' : type.color}`} />
                                <span className="font-semibold text-sm">{type.label}</span>
                            </button>
                        ))}
                    </div>
                    
                    <div className="mt-8 p-4 bg-panel-light/50 rounded-xl border border-border-subtle">
                        <div className="flex items-center gap-2 text-brand-primary mb-2">
                            <LightbulbIcon className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Pro Tip</span>
                        </div>
                        <p className="text-xs text-text-secondary leading-relaxed">
                            {manualGenerationSource === 'keyword' && "Add keywords in bulk. The AI handles one at a time."}
                            {manualGenerationSource === 'rss' && "Great for news jacking or curating industry trends."}
                            {manualGenerationSource === 'video' && "Repurpose YouTube videos into full blog posts."}
                            {manualGenerationSource === 'google_sheet' && "Perfect for managing large editorial calendars."}
                            {manualGenerationSource === 'agency_agent' && "Let the AI find the trends for you."}
                            {manualGenerationSource === 'refresh_url' && "Revive old content with fresh SEO and images."}
                        </p>
                    </div>
                </div>
            </div>
            
            <div className="md:col-span-2 h-full overflow-y-auto">
                <div className="bg-panel/50 p-6 rounded-2xl border border-border min-h-full">
                    <h2 className="text-2xl font-bold text-main mb-6 flex items-center gap-3">
                        {sourceTypes.find(s => s.id === manualGenerationSource)?.icon({ className: "h-6 w-6 text-brand-primary" })}
                        {sourceTypes.find(s => s.id === manualGenerationSource)?.label}
                    </h2>
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};
