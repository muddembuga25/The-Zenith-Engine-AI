
import React, { useMemo, useState, useEffect } from 'react';
import type { Site, ApiKeys, RssItem, User, PostHistoryItem } from '../types';
import { useToast } from '../hooks/useToast';
import { PenIcon, DocumentTextIcon, PhotoIcon, ClockIcon, ArchiveBoxIcon, WordPressIcon, SparklesIcon, ChartPieIcon, TrendingUpIcon, VideoCameraIcon, MailIcon, ShareIcon, ArrowPathIcon, LightbulbIcon, XIcon, BrainCircuitIcon, ArrowRightIcon } from './Icons';
import { GettingStartedGuide } from './GettingStartedGuide';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface DashboardTabProps {
    site: Site;
    sites: Site[];
    setActiveTab: (tab: string, subTab?: string | null) => void;
    onGenerate: (topicToTrack: string, generationSource: 'keyword' | 'rss' | 'video' | 'google_sheet' | 'agency_agent', sourceDetails: RssItem | string | any, site: Site) => Promise<void>;
    onReviewDraft: (draftId: string) => void;
    currentUser: User;
}

// Monochrome Blue Palette for Brand Identity
const COLORS = ['#1DA1F2', '#0C85D0', '#0769A6', '#034E7D', '#78D5FF', '#A6E4FF'];

const typeToIconMap: Record<PostHistoryItem['type'], React.FC<any>> = {
    'Keyword': DocumentTextIcon,
    'RSS': DocumentTextIcon,
    'Video': DocumentTextIcon,
    'Google Sheet': DocumentTextIcon,
    'Social Graphic': PhotoIcon,
    'Social Video': VideoCameraIcon,
    'Email Campaign': MailIcon,
    'Article Refresh': ArrowPathIcon,
    'Agency Agent': BrainCircuitIcon,
    'Creator Studio': BrainCircuitIcon,
};

const TabGuide: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(false), 60000);
        return () => clearTimeout(timer);
    }, []);

    if (!isVisible) return null;
    return (
        <div className="bg-brand-primary/5 p-5 rounded-2xl border border-brand-primary/20 mb-8 flex items-start gap-4 animate-fade-in shadow-glow">
            <div className="p-2 bg-brand-primary/10 rounded-full text-brand-primary">
                <LightbulbIcon className="h-6 w-6" />
            </div>
            <div className="flex-1 pt-1">
                <h3 className="font-bold text-white text-lg">{title}</h3>
                <div className="text-sm text-text-secondary mt-1 leading-relaxed">
                    {children}
                </div>
            </div>
            <button onClick={() => setIsVisible(false)} className="p-1.5 text-text-tertiary hover:text-white rounded-full transition-colors">
                <XIcon className="h-5 w-5" />
            </button>
        </div>
    );
};

export const DashboardTab: React.FC<DashboardTabProps> = ({ site, sites, setActiveTab, onGenerate, onReviewDraft, currentUser }) => {
    const [hasSkippedGuide, setHasSkippedGuide] = useState(false);
    const toast = useToast();
    const nextKeyword = useMemo(() => site.keywordList.split('\n').find(k => k.trim() && !k.trim().startsWith('[DONE]'))?.trim() || null, [site.keywordList]);
    const recentHistory = useMemo(() => site.history.sort((a,b) => b.date - a.date).slice(0, 5), [site.history]);
    
    // Simple wrapper to match type signature
    const handleGenerate = () => {
        if (nextKeyword) {
            onGenerate(nextKeyword, 'keyword', nextKeyword, site);
        } else {
            toast.addToast("No keywords found. Add some in Content Hub.", 'error');
        }
    };

    const showGettingStarted = useMemo(() => { return site.history.length === 0 && sites.length > 0 && !hasSkippedGuide; }, [site.history, sites.length, hasSkippedGuide]);
    
    const contentMixData = useMemo(() => {
        if (!site.history || site.history.length === 0) return [];
        const counts = site.history.reduce((acc, item) => {
            const type = item.type || 'Unknown';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [site.history]);
    
    const topPosts = useMemo(() => { return site.history.filter(post => post.analytics && post.analytics.pageviews > 0).sort((a, b) => b.analytics!.pageviews - a.analytics!.pageviews).slice(0, 5); }, [site.history]);
    const wpIsConfigured = site.wordpressUrl && site.wordpressUsername && site.applicationPassword;
    const hasKeywords = !!nextKeyword;

    const renderNextStep = () => {
        if (!wpIsConfigured) {
            return (
                <div className="premium-panel p-6 bg-gradient-to-br from-panel to-bg-surface-highlight border-l-4 border-l-brand-primary">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-brand-primary/10 rounded-xl text-brand-primary shadow-glow">
                            <WordPressIcon className="h-8 w-8" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-white">Connect WordPress</h3>
                            <p className="text-sm text-text-secondary mt-1 mb-4">Enable direct publishing to your site.</p>
                            <button onClick={() => setActiveTab('settings')} className="btn btn-primary text-sm px-4 py-2">Go to Settings</button>
                        </div>
                    </div>
                </div>
            );
        }
        if (!hasKeywords) {
            return (
                <div className="premium-panel p-6 bg-gradient-to-br from-panel to-bg-surface-highlight border-l-4 border-l-brand-primary">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-brand-primary/10 rounded-xl text-brand-primary shadow-glow">
                            <DocumentTextIcon className="h-8 w-8" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-white">Add Keywords</h3>
                            <p className="text-sm text-text-secondary mt-1 mb-4">Your content engine needs topics to write about.</p>
                            <button onClick={() => setActiveTab('content', 'blog')} className="btn btn-primary text-sm px-4 py-2">Add Content Ideas</button>
                        </div>
                    </div>
                </div>
            );
        }
        return (
            <div className="premium-panel p-6 bg-gradient-to-br from-panel to-bg-surface-highlight border-l-4 border-l-green-500">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-green-500/10 rounded-xl text-green-400 shadow-glow">
                        <SparklesIcon className="h-8 w-8" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-white">Ready to Optimize</h3>
                        <p className="text-sm text-text-secondary mt-1 mb-4">Topic: <span className="text-white font-medium">"{nextKeyword}"</span></p>
                        <button onClick={handleGenerate} className="btn btn-primary text-sm px-4 py-2">Start Optimization</button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full max-w-7xl mx-auto space-y-8">
            <TabGuide title="Mission Control">
              <p>Get a bird's-eye view of your content operations. Monitor performance, execute quick actions, and see what's next in your pipeline.</p>
            </TabGuide>
            
            {showGettingStarted ? (
                <GettingStartedGuide site={site} setActiveTab={setActiveTab} onGenerate={onGenerate} onSkipAll={() => setHasSkippedGuide(true)} setError={(msg) => toast.addToast(msg || '', 'error')} />
            ) : (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Column */}
                        <div className="lg:col-span-2 space-y-8">
                            {renderNextStep()}
                            
                             {/* Quick Actions */}
                            <div className="premium-panel p-6">
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <SparklesIcon className="h-5 w-5 text-brand-primary"/> Quick Actions
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <button onClick={() => setActiveTab('content', 'graphics')} className="group p-4 bg-bg-surface-highlight border border-border rounded-xl text-left flex items-start gap-4 transition-all hover:border-brand-primary hover:shadow-glow">
                                        <div className="p-3 bg-panel rounded-lg border border-border group-hover:bg-brand-primary group-hover:text-white text-text-secondary transition-colors">
                                            <PhotoIcon className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white group-hover:text-brand-primary transition-colors">Create Graphic</h4>
                                            <p className="text-xs text-text-secondary mt-1">Generate social media image.</p>
                                        </div>
                                    </button>
                                     <button onClick={() => setActiveTab('automation')} className="group p-4 bg-bg-surface-highlight border border-border rounded-xl text-left flex items-start gap-4 transition-all hover:border-brand-primary hover:shadow-glow">
                                        <div className="p-3 bg-panel rounded-lg border border-border group-hover:bg-brand-primary group-hover:text-white text-text-secondary transition-colors">
                                            <ClockIcon className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white group-hover:text-brand-primary transition-colors">Configure Auto</h4>
                                            <p className="text-xs text-text-secondary mt-1">Manage schedules & triggers.</p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Recent Activity */}
                            <div className="premium-panel p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold text-white">Recent Activity</h3>
                                    <button onClick={() => setActiveTab('content', 'history')} className="text-xs text-brand-primary hover:text-white transition-colors font-medium">View All</button>
                                </div>
                                <div className="space-y-1">
                                    {recentHistory.length === 0 ? (
                                        <p className="text-text-secondary text-sm italic py-4">No recent activity.</p>
                                    ) : (
                                        recentHistory.map((item, idx) => {
                                            const Icon = typeToIconMap[item.type] || DocumentTextIcon;
                                            return (
                                                <div key={item.id} className="group flex items-center justify-between p-3 rounded-lg hover:bg-bg-surface-highlight transition-colors border-b border-border/50 last:border-0">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="p-2 rounded-md bg-panel border border-border text-text-secondary group-hover:text-brand-primary group-hover:border-brand-primary/30 transition-colors">
                                                            <Icon className="h-4 w-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-white truncate group-hover:text-brand-primary transition-colors">{item.topic}</p>
                                                            <p className="text-xs text-text-secondary">{new Date(item.date).toLocaleDateString()} • {item.type}</p>
                                                        </div>
                                                    </div>
                                                    {item.url && item.url !== '#' && (
                                                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-2 text-text-secondary hover:text-white transition-colors">
                                                            <ArrowRightIcon className="h-4 w-4" />
                                                        </a>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Sidebar Column */}
                        <div className="lg:col-span-1 space-y-8">
                            {/* Top Content */}
                            <div className="premium-panel p-6">
                                <h3 className="text-xl font-bold text-white mb-6">Top Performing</h3>
                                <div className="space-y-4">
                                    {topPosts.length === 0 ? (
                                        <p className="text-text-secondary text-sm">No analytics data yet.</p>
                                    ) : (
                                        topPosts.map((post, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <span className="text-lg font-bold text-brand-primary/50 font-mono">0{i+1}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-white truncate" title={post.topic}>{post.topic}</p>
                                                    <p className="text-xs text-text-secondary">{post.analytics?.pageviews} views</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="premium-panel p-6">
                                <h3 className="text-xl font-bold text-white mb-4">Content Mix</h3>
                                <div style={{ width: '100%', height: 200 }}>
                                    {contentMixData.length > 0 ? (
                                        <ResponsiveContainer>
                                            <PieChart>
                                                <Pie 
                                                    data={contentMixData} 
                                                    dataKey="value" 
                                                    nameKey="name" 
                                                    cx="50%" 
                                                    cy="50%" 
                                                    innerRadius={50} 
                                                    outerRadius={70} 
                                                    paddingAngle={5}
                                                    stroke="none"
                                                >
                                                    {contentMixData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                                </Pie>
                                                <Tooltip 
                                                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '0.5rem', color: '#fff', fontSize: '12px' }} 
                                                    itemStyle={{ color: '#fff' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : <div className="h-full flex items-center justify-center text-text-secondary text-sm">No data available</div>}
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                                    {contentMixData.map((entry, index) => (
                                        <div key={entry.name} className="flex items-center gap-1.5 text-xs text-text-secondary">
                                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                                            {entry.name}
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
