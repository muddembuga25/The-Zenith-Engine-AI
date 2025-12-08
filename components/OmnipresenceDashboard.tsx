import React from 'react';
import type { Site, PostHistoryItem, ApiKeys } from '../types';
import { BroadcastIcon } from './Icons';
import { CampaignViewer } from './CampaignViewer';

interface OmnipresenceDashboardProps {
  site: Site;
  onSiteUpdate: (field: keyof Site, value: any) => void;
  viewingCampaignItem: PostHistoryItem | null;
  onSetViewingCampaignItem: (item: PostHistoryItem | null) => void;
  logApiUsage: (provider: keyof ApiKeys, cost: number) => void;
  setError: (error: string | null) => void;
}

export const OmnipresenceDashboard: React.FC<OmnipresenceDashboardProps> = ({ site, onSiteUpdate, viewingCampaignItem, onSetViewingCampaignItem, logApiUsage, setError }) => {

    if (viewingCampaignItem) {
        return (
            <CampaignViewer
                post={viewingCampaignItem}
                site={site}
                onUpdatePost={(updatedPost) => {
                    const newHistory = site.history.map(h => h.id === updatedPost.id ? updatedPost : h);
                    onSiteUpdate('history', newHistory);
                    onSetViewingCampaignItem(updatedPost); // Keep the viewer updated with the latest post object
                }}
                onBack={() => onSetViewingCampaignItem(null)}
                logApiUsage={logApiUsage}
                setError={setError}
            />
        );
    }

    const publishedPosts = [...site.history]
        .filter(p => p.type === 'Keyword' || p.type === 'RSS' || p.type === 'Video' || p.type === 'Google Sheet' || p.type === 'Article Refresh')
        .sort((a, b) => b.date - a.date);

    return (
        <div className="max-w-5xl mx-auto">
            <div className="bg-panel/50 p-6 rounded-2xl border border-border mb-8">
                <h2 className="text-2xl font-bold text-white">Omnipresence Engine</h2>
                <p className="text-text-secondary mt-1">Amplify your published content. Select a blog post to generate a multi-platform distribution campaign.</p>
            </div>

            {publishedPosts.length === 0 ? (
                 <p className="text-text-secondary text-center py-8">No published blog posts found to create campaigns from.</p>
            ) : (
                <div className="space-y-4">
                    {publishedPosts.map(post => (
                        <div key={post.id} className="bg-panel p-4 rounded-lg flex items-center justify-between gap-4 border border-border-subtle">
                             <div className='flex-1 min-w-0'>
                                <p className="font-semibold text-text-primary truncate">{post.topic}</p>
                                <p className="text-sm text-text-secondary">Published on: {new Date(post.date).toLocaleDateString()}</p>
                            </div>
                            <button
                                onClick={() => onSetViewingCampaignItem(post)}
                                className="btn btn-primary flex items-center gap-2"
                            >
                                <BroadcastIcon className="h-5 w-5" />
                                {post.distributionCampaign ? 'View Campaign' : 'Create Campaign'}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
