
import React, { useState } from 'react';
import type { PostHistoryItem, Site } from '../types';
import { XIconSocial, FacebookIcon, LinkedInIcon, InstagramIcon, PinterestIcon, PhotoIcon, YouTubeIcon, TikTokIcon, VideoCameraIcon, KeyIcon, MailIcon, ChartBarIcon, ShareIcon, ClarityIcon, DeadClickIcon, RageClickIcon, ScrollDepthIcon } from './Icons';
import { HtmlRenderer } from './HtmlRenderer';

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
        return <div className="text-center py-12 text-text-secondary">No analytics data available for this post. Connect Google Analytics or Clarity to see performance.</div>
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {post.analytics && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard title="GA Pageviews" value={formatNumber(post.analytics.pageviews)} />
                        <StatCard title="Visitors" value={formatNumber(post.analytics.visitors)} />
                        <StatCard title="Engagement" value={`${post.analytics.engagement}s`} />
                        <StatCard title="Conversions" value={formatNumber(post.analytics.conversions)} />
                    </div>
                    
                     <div className="bg-panel p-6 rounded-lg border border-border-subtle">
                        <h4 className="font-semibold text-text-primary mb-4">Performance Summary</h4>
                        <p className="text-sm text-text-secondary">
                            This post has generated <strong>{post.analytics.pageviews}</strong> pageviews from <strong>{post.analytics.visitors}</strong> unique visitors.
                            The average engagement time is <strong>{post.analytics.engagement}s</strong>.
                        </p>
                    </div>
                </>
            )}
            
            {post.clarityMetrics && (
                <div className="bg-panel p-6 rounded-lg border border-border-subtle">
                    <h4 className="font-semibold text-text-primary mb-4">Behavior Analytics (Clarity)</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard title="Dead Clicks" value={formatNumber(post.clarityMetrics.deadClicks)} />
                        <StatCard title="Rage Clicks" value={formatNumber(post.clarityMetrics.rageClicks)} />
                        <StatCard title="Scroll Depth" value={`${post.clarityMetrics.scrollDepth}%`} />
                        <StatCard title="Pageviews" value={formatNumber(post.clarityMetrics.pageviews)} />
                    </div>
                </div>
            )}
        </div>
    );
}

export const HistoryDetailViewer: React.FC<{ post: PostHistoryItem, site: Site }> = ({ post, site }) => {
    if (post.type === 'Email Campaign') {
        return (
            <div className="space-y-6">
                <h3 className="text-2xl font-bold text-main mb-2 truncate" title={post.topic}>{post.topic}</h3>
                <div className="p-6 bg-panel rounded-xl border border-border">
                    <h4 className="font-bold text-white mb-2">Campaign Details</h4>
                    <p className="text-sm text-text-secondary">Subject: {post.emailCampaigns?.subject}</p>
                    <div className="mt-4 p-4 bg-panel-light rounded-lg border border-border-subtle max-h-96 overflow-y-auto">
                        <HtmlRenderer content={post.emailCampaigns?.body || ''} />
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div>
            <h3 className="text-2xl font-bold text-main mb-2 truncate" title={post.topic}>{post.topic}</h3>
            <PostPerformanceViewer post={post} />
        </div>
    );
};
