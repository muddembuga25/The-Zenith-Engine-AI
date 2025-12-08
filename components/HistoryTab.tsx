
import React, { useState } from 'react';
import type { PostHistoryItem, Site } from '../types';
import { ShareIcon, PhotoIcon, VideoCameraIcon, MailIcon, ArrowPathIcon, ClarityIcon, DeadClickIcon, RageClickIcon, ScrollDepthIcon } from './Icons';

interface HistoryTabProps {
    site: Site;
    history: PostHistoryItem[];
    onViewDetails: (item: PostHistoryItem) => void;
    onRefreshAnalytics: () => Promise<void>;
    onRefreshClarityData: () => Promise<void>;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ site, history, onViewDetails, onRefreshAnalytics, onRefreshClarityData }) => {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isRefreshingClarity, setIsRefreshingClarity] = useState(false);
    const publishedPosts = [...history].sort((a, b) => b.date - a.date);
    
    // Unified mono-brand style for all types
    const baseTypeStyle = 'bg-brand-primary/10 text-brand-primary border-brand-primary/20';

    const formatNumber = (num: number): string => {
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'k';
        }
        return num.toString();
    };
    
    const handleRefresh = async () => {
        setIsRefreshing(true);
        await onRefreshAnalytics();
        setIsRefreshing(false);
    };

    const handleClarityRefresh = async () => {
        setIsRefreshingClarity(true);
        await onRefreshClarityData();
        setIsRefreshingClarity(false);
    };

    return (
        <div className="max-w-5xl mx-auto">
             <div className="bg-panel/50 p-6 rounded-2xl border border-border mb-8">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-main">Published History</h2>
                        <p className="text-text-secondary mt-1">Browse all the blog posts, social graphics, and videos that have been generated for this site.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleRefresh} disabled={isRefreshing} className="btn btn-secondary flex items-center gap-2 disabled:opacity-50">
                            {isRefreshing ? <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> : <ArrowPathIcon className="h-5 w-5" />}
                            {isRefreshing ? 'Refreshing...' : 'Refresh GA'}
                        </button>
                         {site.clarityProjectId && (
                            <button onClick={handleClarityRefresh} disabled={isRefreshingClarity} className="btn btn-secondary flex items-center gap-2 disabled:opacity-50">
                                {isRefreshingClarity ? <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> : <ClarityIcon className="h-5 w-5 text-brand-primary" />}
                                {isRefreshingClarity ? 'Refreshing...' : 'Refresh Clarity'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
            {publishedPosts.length === 0 ? (
                <p className="text-text-secondary text-center py-8">No content has been generated for this site yet.</p>
            ) : (
                <div className="space-y-4 max-h-[70vh] overflow-y-auto -mr-2 pr-2">
                    {publishedPosts.map((item, index) => {
                        const hasDetails = (item.type === 'Social Graphic' && item.socialGraphics && Object.keys(item.socialGraphics).length > 0) ||
                                         (item.type === 'Social Video' && item.socialVideos && Object.keys(item.socialVideos).length > 0) ||
                                         (item.type === 'Email Campaign' && item.emailCampaigns) ||
                                         (item.socialMediaPosts && Object.keys(item.socialMediaPosts).length > 0) ||
                                         (item.analytics) || (item.clarityMetrics);
                        const thumbnailGraphic = item.type === 'Social Graphic' && item.socialGraphics ? (Object.values(item.socialGraphics) as { imageUrl: string; caption: string; }[])[0] : null;

                        return (
                            <div key={item.id} className="bg-panel p-4 rounded-lg flex items-start sm:items-center justify-between gap-4 border border-border-subtle animate-fade-in-up" style={{ animationDelay: `${index * 60}ms`, opacity: 0, animationFillMode: 'forwards' }}>
                                {thumbnailGraphic && (
                                     <img src={thumbnailGraphic.imageUrl.startsWith('data:') ? thumbnailGraphic.imageUrl : `data:image/jpeg;base64,${thumbnailGraphic.imageUrl}`} alt="Social graphic thumbnail" className="w-16 h-16 rounded-md object-cover bg-panel-light flex-shrink-0" />
                                )}
                                {item.type === 'Social Video' && (
                                    <div className="w-16 h-16 rounded-md bg-panel-light flex-shrink-0 flex items-center justify-center">
                                        <VideoCameraIcon className="h-8 w-8 text-brand-primary" />
                                    </div>
                                )}
                                {item.type === 'Email Campaign' && (
                                    <div className="w-16 h-16 rounded-md bg-panel-light flex-shrink-0 flex items-center justify-center">
                                        <MailIcon className="h-8 w-8 text-brand-primary" />
                                    </div>
                                )}
                                <div className='flex-1 min-w-0'>
                                    <p className="font-semibold text-main truncate" title={item.topic}>{item.topic}</p>
                                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5">
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${baseTypeStyle}`}>{item.type}</span>
                                        <p className="text-sm text-text-secondary">Generated on: {new Date(item.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                    </div>
                                     {item.clarityMetrics && (
                                        <div className="flex items-center gap-4 mt-2 text-xs text-text-secondary">
                                            <span className="flex items-center gap-1.5" title={`${item.clarityMetrics.deadClicks} Dead Clicks`}>
                                                <DeadClickIcon className="h-4 w-4 text-brand-primary" />
                                                <span>{item.clarityMetrics.deadClicks}</span>
                                            </span>
                                            <span className="flex items-center gap-1.5" title={`${item.clarityMetrics.rageClicks} Rage Clicks`}>
                                                <RageClickIcon className="h-4 w-4 text-brand-primary" />
                                                <span>{item.clarityMetrics.rageClicks}</span>
                                            </span>
                                            <span className="flex items-center gap-1.5" title={`${item.clarityMetrics.scrollDepth}% Scroll Depth`}>
                                                <ScrollDepthIcon className="h-4 w-4 text-brand-primary" />
                                                <span>{item.clarityMetrics.scrollDepth}%</span>
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="hidden md:flex items-center gap-6 text-sm text-text-secondary flex-shrink-0 mx-4">
                                    {item.analytics ? (
                                        <>
                                            <div className="flex items-center gap-1.5" title={`${item.analytics.pageviews} Pageviews`}>
                                                <span role="img" aria-label="Pageviews">👁️</span>
                                                <span className="font-semibold w-10 text-left">{formatNumber(item.analytics.pageviews)}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5" title={`${item.analytics.conversions} Conversions`}>
                                                <span role="img" aria-label="Conversions">🎯</span>
                                                <span className="font-semibold w-10 text-left">{formatNumber(item.analytics.conversions)}</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-xs italic text-gray-500">No analytics data</div>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 w-full sm:w-auto flex-shrink-0">
                                    <button onClick={() => onViewDetails(item)} disabled={!hasDetails} className="w-full sm:w-auto text-center btn btn-secondary text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                        {item.type === 'Social Graphic' ? <PhotoIcon className="h-4 w-4" /> : item.type === 'Social Video' ? <VideoCameraIcon className="h-4 w-4" /> : item.type === 'Email Campaign' ? <MailIcon className="h-4 w-4" /> : <ShareIcon className="h-4 w-4" />}
                                        View Details
                                    </button>
                                    {item.type !== 'Social Graphic' && item.type !== 'Social Video' && item.type !== 'Email Campaign' && (
                                    <>
                                        {site.clarityProjectId && (
                                            <a href={`https://clarity.microsoft.com/projects/${site.clarityProjectId}/recordings/filters?pageUrl=contains&pageUrlFilter=${encodeURIComponent(item.url)}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary p-2.5" title="View in Microsoft Clarity">
                                                <ClarityIcon className="h-4 w-4 text-brand-primary" />
                                            </a>
                                        )}
                                        <a href={item.url} target="_blank" rel="noopener noreferrer" className={`btn btn-secondary text-sm ${item.url === '#' && 'pointer-events-none opacity-50'}`}>
                                            View Post
                                        </a>
                                    </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
