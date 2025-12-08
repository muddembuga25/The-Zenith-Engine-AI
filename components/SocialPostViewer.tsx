
import React, { useState, useEffect, useRef } from 'react';
import type { PostHistoryItem, Site } from '../types';
import { XIconSocial, FacebookIcon, LinkedInIcon, InstagramIcon, PinterestIcon, PhotoIcon, YouTubeIcon, TikTokIcon, VideoCameraIcon, KeyIcon, MailIcon, ChartBarIcon, ShareIcon, ClarityIcon, DeadClickIcon, RageClickIcon, ScrollDepthIcon } from './Icons';
import { HtmlRenderer } from './HtmlRenderer';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const platformDetails: Record<string, { name: string, icon: React.FC<any> }> = {
    twitter: { name: 'X (Twitter)', icon: XIconSocial },
    facebook: { name: 'Facebook', icon: FacebookIcon },
    linkedin: { name: 'LinkedIn', icon: LinkedInIcon },
    instagram: { name: 'Instagram', icon: InstagramIcon },
    pinterest: { name: 'Pinterest', icon: PinterestIcon },
    youtube: { name: 'YouTube', icon: YouTubeIcon },
    tiktok: { name: 'TikTok', icon: TikTokIcon },
    custom: { name: 'Custom', icon: PhotoIcon }
};

const formatNumber = (num: number): string => {
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
};

const StatCard: React.FC<{ title: string; value: string; }> = ({ title, value }) => (
    <div className="bg-panel p-4 rounded-lg border border-border-subtle">
        <p className="text-xs font-medium text-text-secondary">{title}</p>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
    </div>
);

const PostPerformanceViewer: React.FC<{ post: PostHistoryItem }> = ({ post }) => {
    if (!post.analytics) {
        return <div className="text-center py-12 text-text-secondary">No analytics data available for this post.</div>
    }

    // Strict Brand Palette (#1d9bf0)
    const COLORS = ['#1d9bf0', '#4dabf5', '#7dc0f8', '#aed5fb'];

    // Generate more realistic chart data based on the actual analytics
    const trendData = Array.from({ length: 30 }, (_, i) => {
        const base = (post.analytics!.pageviews / 30) * (i / 15 + 0.5);
        const noise = base * (Math.random() * 0.4 - 0.2);
        return {
            name: `Day ${i + 1}`,
            Pageviews: Math.max(0, Math.round(base + noise)),
        };
    });

    const trafficData = [
        { name: 'Organic', value: Math.floor(post.analytics.visitors * 0.6) },
        { name: 'Social', value: Math.floor(post.analytics.visitors * 0.2) },
        { name: 'Direct', value: Math.floor(post.analytics.visitors * 0.15) },
        { name: 'Referral', value: post.analytics.visitors - (Math.floor(post.analytics.visitors * 0.6) + Math.floor(post.analytics.visitors * 0.2) + Math.floor(post.analytics.visitors * 0.15))},
    ];

    const topQueries = [
        "what is " + post.topic.toLowerCase(),
        post.topic.toLowerCase() + " examples",
        "how to use " + post.topic.toLowerCase(),
        "best " + post.topic.toLowerCase() + " 2024",
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Pageviews" value={formatNumber(post.analytics.pageviews)} />
                <StatCard title="Visitors" value={formatNumber(post.analytics.visitors)} />
                <StatCard title="Engagement" value={`${post.analytics.engagement}s`} />
                <StatCard title="Conversions" value={formatNumber(post.analytics.conversions)} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-panel p-4 rounded-lg border border-border-subtle">
                    <h4 className="font-semibold text-text-primary mb-4">Traffic Trend (Last 30 Days)</h4>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={trendData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis dataKey="name" stroke="var(--color-text-secondary)" tick={{ fontSize: 10 }} />
                            <YAxis stroke="var(--color-text-secondary)" tick={{ fontSize: 10 }} />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--color-panel-light)', border: '1px solid var(--color-border)' }} />
                            <Line type="monotone" dataKey="Pageviews" stroke="#1d9bf0" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="lg:col-span-2 bg-panel p-4 rounded-lg border border-border-subtle">
                     <h4 className="font-semibold text-text-primary mb-4">Traffic Sources</h4>
                     <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie data={trafficData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => { const RADIAN = Math.PI / 180; const radius = innerRadius + (outerRadius - innerRadius) * 0.5; const x = cx + radius * Math.cos(-midAngle * RADIAN); const y = cy + radius * Math.sin(-midAngle * RADIAN); return (<text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}> {`${(percent * 100).toFixed(0)}%`} </text>);}}>
                                {trafficData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: 'var(--color-panel-light)', border: '1px solid var(--color-border)' }} />
                            <Legend wrapperStyle={{ fontSize: "12px" }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div>
                <h4 className="font-semibold text-text-primary mb-3">Top Search Queries</h4>
                <ul className="space-y-2">
                    {topQueries.map(query => (
                        <li key={query} className="text-sm text-text-secondary p-3 bg-panel rounded-md border border-border-subtle">{query}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

const ClarityPerformanceViewer: React.FC<{ metrics: NonNullable<PostHistoryItem['clarityMetrics']> }> = ({ metrics }) => {
    return (
        <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Clarity Pageviews" value={formatNumber(metrics.pageviews)} />
                <StatCard title="Dead Clicks" value={formatNumber(metrics.deadClicks)} />
                <StatCard title="Rage Clicks" value={formatNumber(metrics.rageClicks)} />
                <StatCard title="Avg. Scroll Depth" value={`${metrics.scrollDepth}%`} />
            </div>
             <div className="p-4 bg-panel rounded-lg border border-border-subtle">
                <h4 className="font-semibold text-text-primary mb-3">Metric Definitions</h4>
                <ul className="space-y-2 text-sm text-text-secondary">
                    <li className="flex items-start gap-2"><DeadClickIcon className="h-4 w-4 mt-0.5 flex-shrink-0 text-yellow-400"/><span><strong>Dead Clicks:</strong> Clicks or taps on a page that have no effect.</span></li>
                    <li className="flex items-start gap-2"><RageClickIcon className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-400"/><span><strong>Rage Clicks:</strong> Rapid clicks or taps in a small area, signaling user frustration.</span></li>
                    <li className="flex items-start gap-2"><ScrollDepthIcon className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-400"/><span><strong>Scroll Depth:</strong> The percentage of the page height a user has scrolled.</span></li>
                </ul>
            </div>
        </div>
    );
};

export const HistoryDetailViewer: React.FC<{ post: PostHistoryItem, site: Site }> = ({ post, site }) => {
    
    if (post.type === 'Email Campaign' || post.type === 'Social Graphic' || post.type === 'Social Video') {
        // ... (existing logic for these types, no changes)
        if (post.type === 'Email Campaign') {
        if (!post.emailCampaigns) {
            return <div><h3 id="history-detail-title" className="text-lg font-bold text-white mb-2">Email Campaign Details</h3><p className="text-text-secondary">No campaign data found for this entry.</p></div>
        }
        return (
            <div>
                 <h3 id="history-detail-title" className="text-2xl font-bold text-white mb-2 truncate" title={post.topic}>{post.topic}</h3>
                 <div className="mt-4 space-y-4">
                    <div>
                        <label className="text-sm font-semibold text-text-primary">Subject Line</label>
                        <input readOnly value={post.emailCampaigns.subject} className="input-base w-full p-3 text-sm bg-panel mt-2" />
                    </div>
                     <div>
                        <label className="text-sm font-semibold text-text-primary">Email Body Preview</label>
                        <div className="mt-2 p-4 border border-border rounded-lg bg-panel">
                            <HtmlRenderer content={post.emailCampaigns.body} />
                        </div>
                    </div>
                 </div>
            </div>
        );
    }
    
    if (post.type === 'Social Graphic') {
        const availablePlatforms = post.socialGraphics ? Object.keys(post.socialGraphics) : [];
        const [activePlatform, setActivePlatform] = useState(availablePlatforms[0] || null);

        if (!activePlatform || !post.socialGraphics) {
            return <div><h3 id="history-detail-title" className="text-lg font-bold text-white mb-2">Social Graphic Details</h3><p className="text-text-secondary">No graphics found for this entry.</p></div>
        }
        
        const currentGraphic = post.socialGraphics[activePlatform];

        return (
            <div>
                <h3 id="history-detail-title" className="text-2xl font-bold text-white mb-2 truncate" title={post.topic}>{post.topic}</h3>
                <div className="my-6">
                    <div className="border-b border-border">
                        <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
                            {availablePlatforms.map(platformKey => {
                                const platform = platformDetails[platformKey] || { name: platformKey.charAt(0).toUpperCase() + platformKey.slice(1), icon: PhotoIcon };
                                const Icon = platform.icon;
                                return (
                                <button key={platformKey} onClick={() => setActivePlatform(platformKey)} className={`${ activePlatform === platformKey ? 'border-brand-primary text-brand-primary' : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-500' } flex items-center gap-2 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}>
                                    <Icon className="h-5 w-5" /> {platform.name}
                                </button>
                                )}
                            )}
                        </nav>
                    </div>
                </div>

                {currentGraphic && (
                <div className="mt-4 space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        <div>
                            <img src={`data:image/jpeg;base64,${currentGraphic.imageUrl}`} alt={`Generated graphic for ${post.topic} on ${activePlatform}`} className="w-full rounded-lg border border-border shadow-lg" />
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-text-primary">Generated Caption</label>
                            <textarea readOnly value={currentGraphic.caption} className="input-base w-full p-3 text-sm leading-relaxed bg-panel mt-2" rows={10} />
                        </div>
                    </div>
                </div>
                )}
            </div>
        );
    }
    
    if (post.type === 'Social Video') {
        const availablePlatforms = post.socialVideos ? Object.keys(post.socialVideos) : [];
        const [activePlatform, setActivePlatform] = useState(availablePlatforms[0] || null);
    
        if (!activePlatform || !post.socialVideos) {
            return <div><h3 id="history-detail-title" className="text-lg font-bold text-white mb-2">Social Video Details</h3><p className="text-text-secondary">No videos found for this entry.</p></div>;
    }
    
    const currentVideo = post.socialVideos[activePlatform];

    return (
        <div>
            <h3 id="history-detail-title" className="text-2xl font-bold text-white mb-2 truncate" title={post.topic}>{post.topic}</h3>
            <div className="my-6">
                <div className="border-b border-border">
                    <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
                        {availablePlatforms.map(platformKey => {
                            const platform = platformDetails[platformKey] || { name: platformKey.charAt(0).toUpperCase() + platformKey.slice(1), icon: VideoCameraIcon };
                            const Icon = platform.icon;
                            return (
                                <button key={platformKey} onClick={() => setActivePlatform(platformKey)} className={`${ activePlatform === platformKey ? 'border-brand-primary text-brand-primary' : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-500' } flex items-center gap-2 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}>
                                    <Icon className="h-5 w-5" /> {platform.name}
                                </button>
                            );
                        })}
                    </nav>
                </div>
            </div>

            {currentVideo && (
                <div className="mt-4 space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        <div>
                            <video controls src={currentVideo.videoUrl} className="w-full rounded-lg border border-border shadow-lg bg-black" />
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-semibold text-text-primary">Generated Caption</label>
                                <textarea readOnly value={currentVideo.caption} className="input-base w-full p-3 text-sm leading-relaxed bg-panel mt-2" rows={8} />
                            </div>
                            {currentVideo.mcpId && (
                                <div>
                                    <label className="text-sm font-semibold text-text-primary">Protected Content ID</label>
                                     <div className="relative mt-2">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><KeyIcon className="h-5 w-5 text-gray-400"/></div>
                                        <input type="text" readOnly value={currentVideo.mcpId} className="input-base w-full pl-10 pr-3 py-2 text-sm font-mono bg-panel" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
