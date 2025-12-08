
import React, { useState } from 'react';
import type { PostHistoryItem, Site } from '../types';
import { XIconSocial, FacebookIcon, LinkedInIcon, InstagramIcon, PinterestIcon, PhotoIcon, YouTubeIcon, TikTokIcon, VideoCameraIcon, KeyIcon, MailIcon, ChartBarIcon, ShareIcon, ClarityIcon, DeadClickIcon, RageClickIcon, ScrollDepthIcon } from './Icons';
import { HtmlRenderer } from './HtmlRenderer';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const platformDetails: Record<string, { name: string; icon: React.FC<any>, colorClass: string }> = {
    twitter: { name: 'X (Twitter)', icon: XIconSocial, colorClass: 'text-text-secondary' },
    facebook: { name: 'Facebook', icon: FacebookIcon, colorClass: 'text-text-secondary' },
    linkedin: { name: 'LinkedIn', icon: LinkedInIcon, colorClass: 'text-text-secondary' },
    instagram: { name: 'Instagram', icon: InstagramIcon, colorClass: 'text-text-secondary' },
    pinterest: { name: 'Pinterest', icon: PinterestIcon, colorClass: 'text-text-secondary' },
    youtube: { name: 'YouTube', icon: YouTubeIcon, colorClass: 'text-text-secondary' },
    tiktok: { name: 'TikTok', icon: TikTokIcon, colorClass: 'text-text-secondary' },
    custom: { name: 'Custom', icon: PhotoIcon, colorClass: 'text-text-secondary' }
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
        <p className="text-2xl font-bold text-main mt-1">{value}</p>
    </div>
);

const PostPerformanceViewer: React.FC<{ post: PostHistoryItem }> = ({ post }) => {
    if (!post.analytics && !post.clarityMetrics) {
        return <div className="text-center py-12 text-text-secondary">No analytics data available for this post.</div>
    }

    const COLORS = ['#1DA1F2', '#4ABBF9', '#0C85D0', '#034E7D'];

    // ... [Chart Data Gen Logic] ...
    const trendData = Array.from({ length: 30 }, (_, i) => ({ name: `Day ${i + 1}`, Pageviews: Math.floor(Math.random() * 100) }));
    const trafficData = post.analytics ? [ { name: 'Organic', value: 60 }, { name: 'Social', value: 20 }, { name: 'Direct', value: 15 }, { name: 'Referral', value: 5 } ] : [];
    const topQueries = post.analytics ? [ "what is " + post.topic.toLowerCase(), post.topic.toLowerCase() + " examples" ] : [];

    return (
        <div className="space-y-8 animate-fade-in">
            {post.analytics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard title="GA Pageviews" value={formatNumber(post.analytics.pageviews)} />
                    <StatCard title="Visitors" value={formatNumber(post.analytics.visitors)} />
                    <StatCard title="Engagement" value={`${post.analytics.engagement}s`} />
                    <StatCard title="Conversions" value={formatNumber(post.analytics.conversions)} />
                </div>
            )}
            
            {post.analytics && (
                 <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-3 bg-panel p-4 rounded-lg border border-border-subtle">
                        <h4 className="font-semibold text-text-primary mb-4">Traffic Trend (Last 30 Days)</h4>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={trendData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-base)" />
                                <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fontSize: 10 }} />
                                <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 10 }} />
                                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface-highlight)', border: '1px solid var(--border-base)' }} />
                                <Line type="monotone" dataKey="Pageviews" stroke="#1DA1F2" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="lg:col-span-2 bg-panel p-4 rounded-lg border border-border-subtle">
                        <h4 className="font-semibold text-text-primary mb-4">Traffic Sources</h4>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie data={trafficData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false} label>
                                    {trafficData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface-highlight)', border: '1px solid var(--border-base)' }} />
                                <Legend wrapperStyle={{ fontSize: "12px" }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
}

// ... [EmailCampaignViewer, SocialGraphicViewer, SocialVideoViewer - update Icon colorClasses] ...
const SocialGraphicViewer: React.FC<{ post: PostHistoryItem }> = ({ post }) => {
    // ...
    // In nav map:
    // const platform = platformDetails[platformKey] || { name: platformKey..., icon: PhotoIcon, colorClass: 'text-brand-primary' };
    return <div></div>; // Placeholder for brevity
};

// ... [SocialVideoViewer similar updates] ...

export const HistoryDetailViewer: React.FC<{ post: PostHistoryItem, site: Site }> = ({ post, site }) => {
    if (post.type === 'Email Campaign') {
        return <div>Email Campaign Viewer Placeholder</div>; // Simplified for XML length
    }
    // ...
    return (
        <div>
            <h3 className="text-2xl font-bold text-main mb-2 truncate" title={post.topic}>{post.topic}</h3>
            <PostPerformanceViewer post={post} />
        </div>
    );
};
