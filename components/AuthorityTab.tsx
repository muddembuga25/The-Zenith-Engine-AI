
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { Site, ApiKeys, PostHistoryItem, MonitoredBacklink } from '../types';
import { findProspectBlogs, generateBlogComment } from '../services/aiService';
import { ChevronDownIcon, LinkIcon, TrashIcon, CheckCircleIcon, XCircleIcon, ClockIcon, ExclamationTriangleIcon, LightbulbIcon, ArrowPathIcon, XIcon } from './Icons';

interface AuthorityTabProps {
    site: Site;
    onSiteUpdate: (field: keyof Site, value: any) => void;
    logApiUsage: (provider: keyof ApiKeys, cost: number) => void;
    setError: (error: string | null) => void;
}

const CORS_PROXY_URL = 'https://cors-anywhere.herokuapp.com/';

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

const planPillClasses: Record<string, string> = {
    creator: 'bg-cyan-400/10 text-cyan-300 border border-cyan-400/60 shadow-[0_0_8px_theme(colors.cyan.400/30)]',
    pro: 'bg-purple-400/10 text-purple-300 border border-purple-400/60 shadow-[0_0_8px_theme(colors.purple.400/30)]',
    agency: 'bg-yellow-400/10 text-yellow-300 border border-yellow-400/60 shadow-[0_0_8px_theme(colors.yellow.400/30)]',
};

const TabGuide: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => {
    const [isVisible, setIsVisible] = useState(true);
    if (!isVisible) return null;
    return (
        <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/30 mb-8 flex items-start gap-4 animate-fade-in">
            <LightbulbIcon className="h-6 w-6 text-blue-300 flex-shrink-0 mt-1" />
            <div className="flex-1">
                <h3 className="font-bold text-main">{title}</h3>
                <div className="text-sm text-blue-200/80 mt-1">
                    {children}
                </div>
            </div>
            <button onClick={() => setIsVisible(false)} className="p-1.5 text-blue-200/60 hover:text-main rounded-full">
                <XIcon className="h-5 w-5" />
            </button>
        </div>
    );
};

const CommentingPanel: React.FC<AuthorityTabProps> = ({ site, logApiUsage, setError }) => {
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
    const [prospects, setProspects] = useState<Prospect[]>([]);
    const [prospectStates, setProspectStates] = useState<Record<string, ProspectState>>({});
    const [isFindingProspects, setIsFindingProspects] = useState(false);

    const publishedPosts = useMemo(() => site.history.filter(p => p.type === 'Keyword' || p.type === 'RSS' || p.type === 'Video' || p.type === 'Google Sheet').sort((a,b) => b.date - a.date), [site.history]);
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
                {isFindingProspects ? <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> : <LightbulbIcon className="h-5 w-5" />}
                {isFindingProspects ? 'Finding Prospects...' : '2. Find Prospect Blogs'}
            </button>

            {prospects.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-border-subtle">
                    <h3 className="text-md font-semibold text-main">3. Generate Comments & Engage</h3>
                    {prospects.map(p => {
                        const state = prospectStates[p.url];
                        return (
                        <div key={p.url} className="bg-panel p-4 rounded-lg border border-border-subtle">
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1 min-w-0">
                                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-text-primary hover:text-blue-400 hover:underline truncate block">{p.title}</a>
                                    <p className="text-xs text-text-secondary mt-1">{p.description}</p>
                                </div>
                                {state.status === 'new' && <button onClick={() => handleGenerateComment(p.url)} className="btn btn-secondary text-sm flex-shrink-0">Generate Comment</button>}
                                {state.status === 'commented' && <span className="text-sm font-semibold text-green-400 flex-shrink-0">Commented</span>}
                            </div>
                            {state.status === 'generating' && <p className="text-sm text-blue-300 mt-2">Generating comment...</p>}
                            {state.status === 'error' && <p className="text-sm text-red-400 mt-2">Error: {state.errorMessage}</p>}
                            {state.status === 'generated' && state.comment && (
                                <div className="mt-3 space-y-3 pt-3 border-t border-border-subtle">
                                    <textarea value={state.comment} onChange={e => setProspectStates(prev => ({...prev, [p.url]: {...prev[p.url], comment: e.target.value}}))} className="input-base w-full p-2 text-sm" rows={4} />
                                    <div className="flex gap-2">
                                        <button onClick={() => handleGenerateComment(p.url)} className="btn btn-secondary text-xs px-2 py-1">Regenerate</button>
                                        <button onClick={() => navigator.clipboard.writeText(state.comment || '')} className="btn btn-secondary text-xs px-2 py-1">Copy</button>
                                        <button onClick={() => setProspectStates(prev => ({...prev, [p.url]: {...prev[p.url], status: 'commented'}}))} className="ml-auto btn btn-primary text-xs px-2 py-1">Mark as Commented</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )})}
                </div>
            )}
        </div>
    );
};

const MonitoringPanel: React.FC<AuthorityTabProps> = ({ site, onSiteUpdate, setError }) => {
    const [newBacklink, setNewBacklink] = useState({ backlinkUrl: '', targetUrl: '' });
    const [checkingStatuses, setCheckingStatuses] = useState<Record<string, boolean>>({});

    const handleAddBacklink = () => {
        if (!newBacklink.backlinkUrl.trim() || !newBacklink.targetUrl.trim()) {
            setError("Both Backlink URL and Your Target URL are required.");
            return;
        }
        const newMonitored: MonitoredBacklink = {
            id: crypto.randomUUID(),
            backlinkUrl: newBacklink.backlinkUrl,
            targetUrl: newBacklink.targetUrl,
            status: 'monitoring',
            anchorText: null,
            lastChecked: Date.now(),
        };
        onSiteUpdate('monitoredBacklinks', [...site.monitoredBacklinks, newMonitored]);
        setNewBacklink({ backlinkUrl: '', targetUrl: '' });
    };

    const handleCheckBacklink = useCallback(async (backlinkId: string) => {
        const linkToCheck = site.monitoredBacklinks.find(l => l.id === backlinkId);
        if (!linkToCheck) return;

        setCheckingStatuses(prev => ({ ...prev, [backlinkId]: true }));
        setError(null);

        try {
            const response = await fetch(`${CORS_PROXY_URL}${linkToCheck.backlinkUrl}`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
            if (!response.ok) throw new Error(`Failed to fetch page. Status: ${response.status}`);
            
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const links = Array.from(doc.querySelectorAll('a'));
            
            const foundLink = links.find(a => {
                try {
                    return new URL(a.href).href === new URL(linkToCheck.targetUrl).href;
                } catch { return false; }
            });
            
            const updatedBacklinks = site.monitoredBacklinks.map(l => {
                if (l.id === backlinkId) {
                    if (foundLink) {
                        return { ...l, status: 'active' as const, anchorText: foundLink.textContent?.trim() || 'No Text', lastChecked: Date.now(), statusMessage: undefined };
                    } else {
                        return { ...l, status: l.status === 'active' ? 'inactive' as const : 'not_found' as const, anchorText: null, lastChecked: Date.now(), statusMessage: 'Link not found on page.' };
                    }
                }
                return l;
            });
            onSiteUpdate('monitoredBacklinks', updatedBacklinks);

        } catch (e: any) {
            setError(`Could not check backlink: ${e.message}. This is often a CORS issue.`);
             const updatedBacklinks = site.monitoredBacklinks.map(l => l.id === backlinkId ? { ...l, status: 'error' as const, statusMessage: e.message, lastChecked: Date.now() } : l );
            onSiteUpdate('monitoredBacklinks', updatedBacklinks);
        } finally {
            setCheckingStatuses(prev => ({ ...prev, [backlinkId]: false }));
        }
    }, [site.monitoredBacklinks, onSiteUpdate, setError]);

    const statusInfo: Record<MonitoredBacklink['status'], { color: string, icon: React.FC<any>, label: string }> = {
        monitoring: { color: 'text-gray-400', icon: ClockIcon, label: 'Pending Check' },
        active: { color: 'text-green-400', icon: CheckCircleIcon, label: 'Active' },
        inactive: { color: 'text-yellow-400', icon: ExclamationTriangleIcon, label: 'Inactive' },
        not_found: { color: 'text-red-400', icon: XCircleIcon, label: 'Not Found' },
        error: { color: 'text-red-400', icon: ExclamationTriangleIcon, label: 'Error' },
    };

    return (
        <div className="space-y-6">
            <div className="bg-panel p-6 rounded-lg border border-border-subtle space-y-4">
                <h3 className="text-lg font-bold text-main">Add New Backlink to Monitor</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">Backlink URL</label>
                        <input type="url" value={newBacklink.backlinkUrl} onChange={e => setNewBacklink(p => ({...p, backlinkUrl: e.target.value}))} placeholder="Page where your link should be" className="input-base px-3 py-2" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">Your Target URL</label>
                        <input type="url" value={newBacklink.targetUrl} onChange={e => setNewBacklink(p => ({...p, targetUrl: e.target.value}))} placeholder="Your page that should be linked to" className="input-base px-3 py-2" />
                    </div>
                </div>
                <button onClick={handleAddBacklink} className="w-full btn btn-primary mt-2">+ Add Link to Monitor</button>
            </div>
            
            <div className="space-y-3">
                {site.monitoredBacklinks.map(link => {
                    const info = statusInfo[link.status];
                    const Icon = info.icon;
                    return (
                        <div key={link.id} className="bg-panel p-3 rounded-lg border border-border-subtle">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-text-secondary truncate">ON: <a href={link.backlinkUrl} className="text-blue-400 hover:underline">{link.backlinkUrl}</a></p>
                                    <p className="text-sm text-text-secondary truncate">TO: <a href={link.targetUrl} className="text-blue-400 hover:underline">{link.targetUrl}</a></p>
                                </div>
                                <div className="flex items-center gap-4 w-full sm:w-auto">
                                    <div className={`flex items-center gap-2 text-sm font-semibold ${info.color}`}><Icon className="h-5 w-5" /> {info.label}</div>
                                    <button onClick={() => handleCheckBacklink(link.id)} disabled={checkingStatuses[link.id]} className="btn btn-secondary p-2 disabled:opacity-50">
                                        {checkingStatuses[link.id] ? <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle opacity="25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path opacity="75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> : <ArrowPathIcon className="h-5 w-5" />}
                                    </button>
                                    <button onClick={() => onSiteUpdate('monitoredBacklinks', site.monitoredBacklinks.filter(l => l.id !== link.id))} className="btn bg-red-900/40 hover:bg-red-800/60 text-red-300 p-2"><TrashIcon className="h-5 w-5" /></button>
                                </div>
                            </div>
                            {link.anchorText && <p className="text-xs text-text-secondary mt-2 pt-2 border-t border-border-subtle">Anchor: "{link.anchorText}"</p>}
                            {link.statusMessage && <p className="text-xs text-yellow-400 mt-2">{link.statusMessage}</p>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const AuthorityTab: React.FC<AuthorityTabProps> = (props) => {
    const [activeSubTab, setActiveSubTab] = useState('commenting');
    
    // Scroll to top when sub-tab changes
    useEffect(() => {
        document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [activeSubTab]);

    const subTabs = [
        { id: 'commenting', label: 'Blog Commenting', icon: LightbulbIcon, plan: 'pro' as const },
        { id: 'monitoring', label: 'Backlink Monitoring', icon: LinkIcon, plan: 'pro' as const },
    ];
    
    return (
        <div className="w-full max-w-7xl mx-auto">
             <TabGuide title="Build Your Site's Authority">
                <p>Use these tools to build credibility. The <strong>Blog Commenting</strong> tool helps you find relevant blogs and generate thoughtful comments. The <strong>Backlink Monitoring</strong> tool helps you track whether your important backlinks are still active.</p>
            </TabGuide>
            <div className="bg-panel/50 p-6 rounded-2xl border border-border mb-8">
                <h2 className="text-2xl font-bold text-main">Authority Suite</h2>
                <p className="text-text-secondary mt-1">Build your site's credibility by finding outreach opportunities and monitoring your backlink profile.</p>
            </div>
            
            <div className="mb-8">
                <nav className="bg-panel p-1.5 rounded-xl inline-flex items-center gap-1">
                    {subTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveSubTab(tab.id)}
                            className={`${
                                activeSubTab === tab.id
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-text-secondary hover:bg-panel-light'
                            } flex items-center gap-2 whitespace-nowrap py-2 px-4 rounded-lg font-medium text-sm transition-all`}
                            aria-current={activeSubTab === tab.id ? 'page' : undefined}
                        >
                            <tab.icon className="h-5 w-5" />
                            {tab.label}
                            {tab.plan && (
                                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold capitalize ${planPillClasses[tab.plan]}`}>
                                    {tab.plan}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
            </div>
            
            <div key={activeSubTab} className="animate-fade-in">
                {activeSubTab === 'commenting' && <CommentingPanel {...props} />}
                {activeSubTab === 'monitoring' && <MonitoringPanel {...props} />}
            </div>
            
            <div className="mt-8 p-6 bg-panel/50 rounded-2xl border border-dashed border-border text-center">
                <h3 className="font-bold text-lg text-text-primary">More Authority Tools Coming Soon</h3>
                <p className="text-sm text-text-secondary mt-1">Features like Social Commenting Assistants and AI-powered Email Outreach are on the roadmap for Pro and Agency plans.</p>
            </div>
        </div>
    );
};
