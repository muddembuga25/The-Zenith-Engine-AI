
import React, { useState, useEffect } from 'react';
import type { Site, SocialMediaPost, SocialMediaSettings } from '../types';
import { CheckCircleIcon, XIconSocial, FacebookIcon, LinkedInIcon, InstagramIcon, PinterestIcon } from './Icons';

interface PublishSuccessViewerProps {
    publishedPostUrl: string | null;
    socialPosts: Record<string, SocialMediaPost> | null;
    site: Site;
    onReset: () => void;
    onConnect: (platform: keyof SocialMediaSettings, accountId: string) => void;
    isConnectingSocial: string | null;
}

const socialPlatforms = [
    { id: 'twitter', name: 'X (Twitter)', icon: XIconSocial, colorClass: 'text-text-primary' },
    { id: 'facebook', name: 'Facebook', icon: FacebookIcon, colorClass: 'text-text-primary' },
    { id: 'linkedin', name: 'LinkedIn', icon: LinkedInIcon, colorClass: 'text-text-primary' },
    { id: 'instagram', name: 'Instagram', icon: InstagramIcon, colorClass: 'text-text-primary' },
    { id: 'pinterest', name: 'Pinterest', icon: PinterestIcon, colorClass: 'text-text-primary' },
];

export const PublishSuccessViewer: React.FC<PublishSuccessViewerProps> = ({ publishedPostUrl, socialPosts, site, onReset, onConnect, isConnectingSocial }) => {
    const availablePlatforms = socialPosts ? Object.keys(socialPosts) : [];
    const [activePlatform, setActivePlatform] = useState<string | null>(null);

    useEffect(() => {
        if (availablePlatforms.length > 0) {
            const firstPlatform = socialPlatforms.find(p => availablePlatforms.includes(p.id));
            setActivePlatform(firstPlatform ? firstPlatform.id : availablePlatforms[0]);
        }
    }, [socialPosts]);

    const currentPost = activePlatform ? socialPosts?.[activePlatform] : null;

    return (
        <div className="text-center bg-panel/50 p-6 md:p-8 rounded-2xl shadow-2xl w-full max-w-4xl border border-border animate-fade-in-up">
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-brand-primary/10 border-2 border-brand-primary/20">
                <CheckCircleIcon className="h-10 w-10 text-brand-primary" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-main mt-6">Published Successfully!</h2>
            <p className="text-text-secondary mt-2">Your new article is now live.</p>

            {publishedPostUrl && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <a href={publishedPostUrl} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto btn btn-primary flex-grow sm:flex-grow-0">
                        View Live Post
                    </a>
                    <button onClick={onReset} className="w-full sm:w-auto btn btn-secondary">
                        Generate Another
                    </button>
                </div>
            )}
            
             {socialPosts && availablePlatforms.length > 0 && (
                <div className="mt-8 pt-8 border-t border-border-subtle text-left">
                    <h3 className="text-xl font-bold text-main text-center">Generated Social Posts</h3>
                    <p className="text-text-secondary text-sm text-center mt-1">Here are some posts you can use to promote your new article.</p>
                    
                    <div className="mt-6">
                         <div className="border-b border-border">
                            <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
                                {socialPlatforms.map(p => availablePlatforms.includes(p.id) && (
                                    <button key={p.id} onClick={() => setActivePlatform(p.id)} className={`${ activePlatform === p.id ? 'border-brand-primary text-brand-primary' : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-500' } flex items-center gap-2 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}>
                                        <p.icon className={`h-5 w-5 ${activePlatform !== p.id ? p.colorClass : ''}`} /> {p.name}
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </div>
                    
                    {currentPost && (
                        <div className="mt-4 animate-fade-in">
                            <textarea readOnly value={currentPost.content} className="input-base w-full p-4 text-sm leading-relaxed" rows={6} />
                            <div className="mt-3 flex flex-wrap gap-2">
                                {currentPost.hashtags.map(tag => (
                                    <span key={tag} className="bg-brand-primary/10 text-brand-primary text-xs font-medium px-2.5 py-1 rounded-full">{tag}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
