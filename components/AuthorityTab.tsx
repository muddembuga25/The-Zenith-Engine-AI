
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { Site, ApiKeys, PostHistoryItem, MonitoredBacklink } from '../types';
import { findProspectBlogs, generateBlogComment } from '../services/aiService';
import { ChevronDownIcon, LinkIcon, TrashIcon, CheckCircleIcon, XCircleIcon, ClockIcon, ExclamationTriangleIcon, LightbulbIcon, ArrowPathIcon, XIcon, UserIcon } from './Icons';

interface AuthorityTabProps {
    site: Site;
    onSiteUpdate: (field: keyof Site, value: any) => void;
    logApiUsage: (provider: keyof ApiKeys, cost: number) => void;
    setError: (error: string | null) => void;
}

const TabGuide: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => {
    const [isVisible, setIsVisible] = useState(true);
    if (!isVisible) return null;
    return (
        <div className="bg-brand-primary/10 p-4 rounded-lg border border-brand-primary/30 mb-8 flex items-start gap-4 animate-fade-in">
            <LightbulbIcon className="h-6 w-6 text-brand-primary flex-shrink-0 mt-1" />
            <div className="flex-1">
                <h3 className="font-bold text-main">{title}</h3>
                <div className="text-sm text-brand-primary mt-1">
                    {children}
                </div>
            </div>
            <button onClick={() => setIsVisible(false)} className="p-1.5 text-brand-primary hover:text-main rounded-full">
                <XIcon className="h-5 w-5" />
            </button>
        </div>
    );
};

interface Prospect {
    title: string;
    url: string;
    description: string;
}

interface ProspectState {
    status: 'new' | 'generating' | 'generated' | 'commented' | 'error';
    comment?: string;
    errorMessage?: string;
}

const CommentingPanel: React.FC<AuthorityTabProps> = ({ site, logApiUsage, setError }) => {
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
    const [prospects, setProspects] = useState<Prospect[]>([]);
    const [prospectStates, setProspectStates] = useState<Record<string, ProspectState>>({});
    const [isFindingProspects, setIsFindingProspects] = useState(false);

    const publishedPosts = useMemo(() => site.history.filter(p => ['Keyword', 'RSS', 'Video', 'Google Sheet'].includes(p.type)).sort((a,b) => b.date - a.date), [site.history]);
    const selectedPost = useMemo(() => publishedPosts.find(p => p.id === selectedPostId), [publishedPosts, selectedPostId]);

    const handleFindProspects = useCallback(async () => {
        if (!selectedPost) {
            setError("Please select one of your published posts to provide context.");
            return;
        }
        setIsFindingProspects(true);
        setProspects([]);
        setProspectStates({});
        setError(null);
        try {
            const { prospects: foundProspects, cost } = await findProspectBlogs(selectedPost.topic, site);
            logApiUsage('google', cost);
            setProspects(foundProspects);
            const initialStates: Record<string, ProspectState> = {};
            foundProspects.forEach(p => { initialStates[p.url] = { status: 'new' }; });
            setProspectStates(initialStates);
        } catch (error: any) {
            setError(error.message || "An unknown error occurred while finding prospects.");
        } finally {
            setIsFindingProspects(false);
        }
    }, [selectedPost, site, logApiUsage, setError]);

    const handleGenerateComment = useCallback(async (prospectUrl: string) => {
        if (!selectedPost) return;
        setProspectStates(prev => ({ ...prev, [prospectUrl]: { status: 'generating' } }));
        setError(null);
        try {
            const { comment, cost } = await generateBlogComment(prospectUrl, selectedPost.topic, site.brandGuideline, site.authorName, site);
            logApiUsage('google', cost);
            setProspectStates(prev => ({ ...prev, [prospectUrl]: { status: 'generated', comment } }));
        } catch (error: any) {
            setError(error.message || "Failed to generate comment.");
            setProspectStates(prev => ({ ...prev, [prospectUrl]: { status: 'error', errorMessage: error.message } }));
        }
    }, [selectedPost, site, logApiUsage, setError]);

    return (
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-text-primary mb-2">1. Select Your Post for Context</label>
                <select value={selectedPostId || ''} onChange={e => setSelectedPostId(e.target.value)} className="input-base w-full py-2 px-3">
                    <option value="" disabled>Select a published post...</option>
                    {publishedPosts.map(p => <option key={p.id} value={p.id}>{p.topic}</option>)}
                </select>
            </div>
            <button onClick={handleFindProspects} disabled={!selectedPostId || isFindingProspects} className="w-full btn btn-primary flex items-center justify-center gap-2 disabled:opacity-50">
                {isFindingProspects ? <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <LightbulbIcon className="h-5 w-5" />}
                Find Blog Prospects
            </button>

            {prospects.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-border-subtle">
                    <h3 className="font-semibold text-main">2. Generate & Post Comments</h3>
                    {prospects.map((prospect, idx) => {
                        const state = prospectStates[prospect.url] || { status: 'new' };
                        return (
                            <div key={idx} className="p-4 bg-panel rounded-lg border border-border-subtle hover:border-brand-primary/30 transition-colors">
                                <h4 className="font-bold text-text-primary">{prospect.title}</h4>
                                <p className="text-sm text-text-secondary mt-1 mb-2">{prospect.description}</p>
                                <a href={prospect.url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-primary hover:underline flex items-center gap-1 mb-3">
                                    <LinkIcon className="h-3 w-3" /> Visit Blog
                                </a>
                                
                                {state.status === 'new' && (
                                    <button onClick={() => handleGenerateComment(prospect.url)} className="btn btn-secondary text-xs w-full">Generate Comment</button>
                                )}
                                {state.status === 'generating' && (
                                    <div className="flex items-center gap-2 text-xs text-brand-primary"><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Writing comment...</div>
                                )}
                                {state.status === 'generated' && (
                                    <div className="bg-panel-light p-3 rounded border border-brand-primary/20">
                                        <p className="text-sm text-text-primary italic">"{state.comment}"</p>
                                        <div className="flex gap-2 mt-3">
                                            <button 
                                                onClick={() => {
                                                    navigator.clipboard.writeText(state.comment || '');
                                                    setProspectStates(prev => ({ ...prev, [prospect.url]: { ...state, status: 'commented' } }));
                                                }} 
                                                className="btn btn-primary text-xs flex-1"
                                            >
                                                Copy & Mark Posted
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {state.status === 'commented' && (
                                    <div className="flex items-center gap-2 text-xs text-green-400 bg-green-900/20 p-2 rounded"><CheckCircleIcon className="h-4 w-4"/> Comment Posted</div>
                                )}
                                {state.status === 'error' && (
                                    <div className="flex items-center gap-2 text-xs text-red-400 bg-red-900/20 p-2 rounded"><ExclamationTriangleIcon className="h-4 w-4"/> {state.errorMessage}</div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

const BacklinkMonitorPanel: React.FC<{ site: Site; onSiteUpdate: (field: keyof Site, value: any) => void; setError: (err: string|null) => void; }> = ({ site, onSiteUpdate, setError }) => {
    const [newBacklinkUrl, setNewBacklinkUrl] = useState('');
    const [targetUrl, setTargetUrl] = useState('');
    
    const handleAddBacklink = () => {
        if (!newBacklinkUrl || !targetUrl) {
            setError("Both Backlink URL and Target URL are required.");
            return;
        }
        const newBacklink: MonitoredBacklink = {
            id: crypto.randomUUID(),
            backlinkUrl: newBacklinkUrl,
            targetUrl: targetUrl,
            status: 'active',
            anchorText: null,
            lastChecked: Date.now()
        };
        onSiteUpdate('monitoredBacklinks', [newBacklink, ...(site.monitoredBacklinks || [])]);
        setNewBacklinkUrl('');
        setTargetUrl('');
    };

    const handleCheckStatus = (id: string) => {
        // Simulating a check
        const updated = site.monitoredBacklinks.map(b => {
            if (b.id === id) {
                // Randomly assign status for demo
                const statuses: MonitoredBacklink['status'][] = ['active', 'not_found', 'error'];
                const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
                return { ...b, status: randomStatus, lastChecked: Date.now() };
            }
            return b;
        });
        onSiteUpdate('monitoredBacklinks', updated);
    };

    const handleRemove = (id: string) => {
        if(window.confirm("Remove this monitored backlink?")) {
            onSiteUpdate('monitoredBacklinks', site.monitoredBacklinks.filter(b => b.id !== id));
        }
    };

    const getStatusBadge = (status: MonitoredBacklink['status']) => {
        switch(status) {
            case 'active': return <span className="text-green-400 bg-green-900/20 px-2 py-0.5 rounded text-xs">Active</span>;
            case 'not_found': return <span className="text-red-400 bg-red-900/20 px-2 py-0.5 rounded text-xs">Not Found</span>;
            case 'monitoring': return <span className="text-yellow-400 bg-yellow-900/20 px-2 py-0.5 rounded text-xs">Checking...</span>;
            default: return <span className="text-gray-400 bg-gray-800 px-2 py-0.5 rounded text-xs">Unknown</span>;
        }
    }

    return (
        <div className="space-y-6">
            <div className="p-4 bg-panel rounded-lg border border-border-subtle">
                <h4 className="font-semibold text-main mb-3">Add Backlink to Monitor</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <input type="url" value={newBacklinkUrl} onChange={e => setNewBacklinkUrl(e.target.value)} placeholder="URL where backlink exists" className="input-base w-full text-sm" />
                    <input type="url" value={targetUrl} onChange={e => setTargetUrl(e.target.value)} placeholder="Your site URL (Target)" className="input-base w-full text-sm" />
                </div>
                <button onClick={handleAddBacklink} className="btn btn-secondary text-sm w-full">Track Backlink</button>
            </div>

            <div className="space-y-3">
                {(site.monitoredBacklinks || []).map(link => (
                    <div key={link.id} className="flex items-center justify-between p-3 bg-panel rounded-lg border border-border-subtle">
                        <div className="min-w-0 flex-1 mr-4">
                            <div className="flex items-center gap-2 mb-1">
                                {getStatusBadge(link.status)}
                                <span className="text-xs text-text-secondary">Checked: {new Date(link.lastChecked).toLocaleDateString()}</span>
                            </div>
                            <a href={link.backlinkUrl} target="_blank" rel="noopener noreferrer" className="block text-sm font-medium text-text-primary truncate hover:text-brand-primary">{link.backlinkUrl}</a>
                            <p className="text-xs text-text-secondary truncate">Target: {link.targetUrl}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleCheckStatus(link.id)} className="p-1.5 text-text-secondary hover:text-brand-primary hover:bg-panel-light rounded" title="Check Status"><ArrowPathIcon className="h-4 w-4" /></button>
                            <button onClick={() => handleRemove(link.id)} className="p-1.5 text-text-secondary hover:text-red-400 hover:bg-panel-light rounded" title="Remove"><TrashIcon className="h-4 w-4" /></button>
                        </div>
                    </div>
                ))}
                {(site.monitoredBacklinks || []).length === 0 && <p className="text-text-secondary text-center text-sm py-4">No backlinks monitored yet.</p>}
            </div>
        </div>
    );
};

export const AuthorityTab: React.FC<AuthorityTabProps> = ({ site, onSiteUpdate, logApiUsage, setError }) => {
    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <TabGuide title="Build Authority & Trust">
                <p>Use AI to engage with your community and monitor your off-page SEO efforts. Find relevant blogs to comment on and track your backlinks.</p>
            </TabGuide>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-panel/50 p-6 rounded-2xl border border-border">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary"><UserIcon className="h-6 w-6"/></div>
                        <div>
                            <h3 className="text-xl font-bold text-main">AI Commenting Assistant</h3>
                            <p className="text-sm text-text-secondary">Build relationships by commenting on relevant blogs.</p>
                        </div>
                    </div>
                    <CommentingPanel site={site} onSiteUpdate={onSiteUpdate} logApiUsage={logApiUsage} setError={setError} />
                </div>

                <div className="bg-panel/50 p-6 rounded-2xl border border-border">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary"><LinkIcon className="h-6 w-6"/></div>
                        <div>
                            <h3 className="text-xl font-bold text-main">Backlink Monitor</h3>
                            <p className="text-sm text-text-secondary">Track the status of your earned backlinks.</p>
                        </div>
                    </div>
                    <BacklinkMonitorPanel site={site} onSiteUpdate={onSiteUpdate} setError={setError} />
                </div>
            </div>
        </div>
    );
};
