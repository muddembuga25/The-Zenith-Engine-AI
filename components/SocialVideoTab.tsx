
import React, { useState, useCallback, useEffect } from 'react';
import type { Site, ApiKeys, PostHistoryItem, SocialMediaAccount, WhatsAppAccount, TelegramAccount } from '../types';
import { AiProvider } from '../types';
import { AVAILABLE_MODELS } from '../types';
import * as socialMediaService from '../services/socialMediaService';
import { generateSocialVideoAndCaption } from '../services/aiService';
import { VideoCameraIcon, ArchiveBoxIcon, CheckCircleIcon, XIcon, ShareIcon, KeyIcon, TrashIcon, ArrowUpTrayIcon } from './Icons';

interface SocialVideoTabProps {
    site: Site;
    onSiteUpdate: (field: keyof Site, value: any) => void;
    logApiUsage: (provider: keyof ApiKeys, cost: number) => void;
    setError: (error: string | null) => void;
}

interface GenerationResult {
    videoUrl: string;
    caption: string;
    mcpId: string;
}

export const SocialVideoTab: React.FC<SocialVideoTabProps> = ({ site, onSiteUpdate, logApiUsage, setError }) => {
    const [prompt, setPrompt] = useState<string>('');
    const [image, setImage] = useState<{ data: string; mimeType: string } | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [result, setResult] = useState<GenerationResult | null>(null);
    const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
    const [isPublishing, setIsPublishing] = useState(false);
    const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
    const [hasApiKey, setHasApiKey] = useState<boolean>(false);

    useEffect(() => {
        const checkKey = async () => {
            if ((window as any).aistudio) {
                const hasKey = await (window as any).aistudio.hasSelectedApiKey();
                setHasApiKey(hasKey);
            } else {
                // If not in AI Studio environment, assume keys are handled via env vars or manual input
                setHasApiKey(true);
            }
        };
        checkKey();
    }, []);

    const handleSelectKey = async () => {
        if ((window as any).aistudio) {
            await (window as any).aistudio.openSelectKey();
            // Race condition mitigation as per guidelines: assume successful
            setHasApiKey(true);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const gallerySelect = document.getElementById('gallery-video-image-select') as HTMLSelectElement;
        if (gallerySelect) gallerySelect.value = '';

        const file = e.target.files?.[0];
        if (!file) {
            setImage(null);
            return;
        }
        if (file.size > 4 * 1024 * 1024) { // Veo limit is 4MB
            setError("Image must be under 4MB.");
            return;
        }
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
            const dataUrl = loadEvent.target?.result as string;
            setImage({
                data: dataUrl.split(',')[1],
                mimeType: file.type
            });
        };
        reader.readAsDataURL(file);
    };
    
    const handleGalleryImageSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const fileInput = document.getElementById('video-image-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
    
        const selectedId = e.target.value;
        if (!selectedId) {
            setImage(null);
            return;
        }
    
        const galleryImage = site.imageGallery?.find(img => img.id === selectedId);
        if (galleryImage) {
            setImage({
                data: galleryImage.imageUrl.split(',')[1],
                mimeType: galleryImage.imageUrl.match(/data:(.*);/)?.[1] || 'image/jpeg',
            });
        }
    };

    const handleGenerate = useCallback(async () => {
        if (!hasApiKey && (window as any).aistudio) {
            setError("Please select an API Key first.");
            return;
        }

        if (!prompt.trim()) {
            setError("Please enter a prompt for the video.");
            return;
        }
        setIsLoading(true);
        setResult(null);
        setError(null);

        try {
            const { videoUrl, caption, mcpId, videoCost, videoProvider, captionCost, captionProvider } = await generateSocialVideoAndCaption(
                prompt,
                site,
                selectedCharacterId || null,
                setLoadingMessage,
                image ? { imageBytes: image.data, mimeType: image.mimeType } : null
            );
            
            logApiUsage(videoProvider, videoCost);
            logApiUsage(captionProvider, captionCost);

            setResult({ videoUrl, caption, mcpId });
        } catch (error: any) {
            const errorMessage = error.message || "An unknown error occurred during video generation.";
            if (errorMessage.includes("Requested entity was not found") && (window as any).aistudio) {
                setHasApiKey(false);
                setError("API Key error. Please re-select your API key.");
                await (window as any).aistudio.openSelectKey();
            } else {
                setError(errorMessage);
            }
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    }, [prompt, site, logApiUsage, setError, selectedCharacterId, image, hasApiKey]);

    const handleSaveToHistory = useCallback(() => {
        if (!result) return;
        
        const newHistoryItem: PostHistoryItem = {
            id: crypto.randomUUID(),
            topic: `Social Video: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`,
            url: '#',
            date: Date.now(),
            type: 'Social Video',
            socialVideos: { custom: { videoUrl: result.videoUrl, caption: result.caption, mcpId: result.mcpId } }
        };

        onSiteUpdate('history', [newHistoryItem, ...(site.history || [])]);
        setResult(null);
        setPrompt('');
    }, [result, prompt, site, onSiteUpdate]);
    
    const handlePublish = async () => {
        if (!result || selectedAccounts.length === 0) return;
        setIsPublishing(true);
        setError(null);

        const postContent = { content: result.caption, hashtags: [] };
        const allAccounts = Object.values(site.socialMediaSettings).flatMap(accounts => Array.isArray(accounts) ? accounts : []) as (SocialMediaAccount | WhatsAppAccount | TelegramAccount)[];

        for (const accountId of selectedAccounts) {
            const [platformId, id] = accountId.split(':');
            const account = allAccounts.find(acc => acc.id === id);

            if (account) {
                try {
                    await socialMediaService.postToSocialMedia(platformId as any, account, postContent, { type: 'video', data: result.videoUrl });
                } catch (e: any) {
                    setError(`Failed to publish to ${account.name}: ${e.message}`);
                }
            }
        }
        setIsPublishing(false);
        setIsPublishModalOpen(false);
        setSelectedAccounts([]);
        setResult(null);
        setPrompt('');
    };
    
    const toggleAccountSelection = (accountId: string) => {
        setSelectedAccounts(prev => prev.includes(accountId) ? prev.filter(id => id !== accountId) : [...prev, accountId]);
    };

    const connectedAccounts = Object.entries(site.socialMediaSettings)
        .flatMap(([platform, accounts]) => {
            if (Array.isArray(accounts)) {
                return accounts.filter(acc => acc.isConnected).map(acc => ({ ...acc, platform }));
            }
            return [];
        });

    return (
        <div className="w-full max-w-5xl mx-auto space-y-8">
             <div className="bg-panel/50 p-6 rounded-2xl border border-border">
                <h2 className="text-2xl font-bold text-main">Social Video Generator</h2>
                <p className="text-text-secondary mt-1">Produce a high-quality, final video product. Our advanced automation uses AI storyboarding and continuous scene generation to create a professionally edited video, ready for social media and YouTube.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">Prompt</label>
                        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., A fast-paced montage of AI development..." className="input-base w-full p-3 text-sm" rows={4} disabled={isLoading} />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">Reference Image (Optional)</label>
                        <p className="text-xs text-text-secondary mb-2">Provide an image to influence the video's style or starting frame.</p>
                        <div className="flex gap-4 items-center">
                            <label htmlFor="video-image-upload" className={`flex-1 btn btn-secondary text-sm flex items-center justify-center gap-2 cursor-pointer ${isLoading ? 'opacity-50' : ''}`}>
                                <ArrowUpTrayIcon className="h-5 w-5" /> Upload
                                <input id="video-image-upload" type="file" accept="image/png, image/jpeg, image/webp" onChange={handleImageUpload} className="sr-only" disabled={isLoading} />
                            </label>
                            {(site.imageGallery && site.imageGallery.length > 0) && (
                                <select id="gallery-video-image-select" onChange={handleGalleryImageSelect} className="input-base text-sm flex-1" defaultValue="" disabled={isLoading}>
                                    <option value="">Or select from gallery...</option>
                                    {site.imageGallery.map(img => <option key={img.id} value={img.id}>{img.altText}</option>)}
                                </select>
                            )}
                        </div>
                         {image && <p className="text-xs text-green-400 mt-2">Image selected for reference.</p>}
                    </div>
                    
                    {site.characterReferences && site.characterReferences.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">Character Persona (Optional)</label>
                            <select value={selectedCharacterId} onChange={e => setSelectedCharacterId(e.target.value)} className="input-base w-full" disabled={isLoading}>
                                <option value="">None</option>
                                {site.characterReferences.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}

                    {!hasApiKey ? (
                        <div className="p-4 bg-yellow-900/20 border border-yellow-500/50 rounded-lg">
                            <p className="text-yellow-200 text-sm mb-3">You must select a paid API Key to use Veo video generation.</p>
                            <button onClick={handleSelectKey} className="w-full btn btn-primary flex items-center justify-center gap-2">
                                <KeyIcon className="h-5 w-5" /> Select API Key
                            </button>
                        </div>
                    ) : (
                        <button onClick={handleGenerate} disabled={isLoading || !prompt.trim()} className="w-full btn btn-primary text-lg flex items-center justify-center gap-3 disabled:opacity-50">
                            {isLoading ? 'Generating...' : <><VideoCameraIcon className="h-6 w-6" /> Generate Video</>}
                        </button>
                    )}
                </div>
                
                <div className="bg-panel/50 p-4 rounded-2xl border border-border min-h-[300px]">
                    <h3 className="text-lg font-bold text-brand-primary">Result</h3>
                    {isLoading ? (
                         <div className="flex flex-col items-center justify-center h-full text-center">
                            <svg className="animate-spin h-8 w-8 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <p className="text-text-primary mt-3 font-semibold">{loadingMessage || "Generating video..."}</p>
                            <p className="text-xs text-text-secondary mt-1">This can take a few minutes.</p>
                        </div>
                    ) : result ? (
                        <div className="w-full space-y-4 mt-4 animate-fade-in">
                            <video controls src={`${result.videoUrl}&key=${process.env.API_KEY}`} className="w-full rounded-lg border border-border bg-black" />
                            <div>
                                <label className="text-sm font-medium text-text-primary">Generated Caption</label>
                                <textarea readOnly value={result.caption} className="input-base w-full p-2 text-sm bg-panel mt-1" rows={5} />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-text-primary">Protected Content ID</label>
                                <div className="relative mt-1">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><KeyIcon className="h-5 w-5 text-gray-400"/></div>
                                    <input type="text" readOnly value={result.mcpId} className="input-base w-full pl-10 pr-3 py-2 text-sm font-mono bg-panel" />
                                </div>
                            </div>
                             <div className="flex gap-3 pt-4 border-t border-border-subtle">
                                <button onClick={handleSaveToHistory} className="flex-1 btn btn-secondary flex items-center justify-center gap-2"><ArchiveBoxIcon className="h-5 w-5" /> Save</button>
                                <button onClick={() => setIsPublishModalOpen(true)} disabled={connectedAccounts.length === 0} className="flex-1 btn btn-primary flex items-center justify-center gap-2 disabled:opacity-50"><ShareIcon className="h-5 w-5" /> Publish</button>
                            </div>
                        </div>
                    ) : (
                         <div className="text-center text-text-secondary p-8 h-full flex flex-col items-center justify-center">
                            <VideoCameraIcon className="h-10 w-10 text-gray-600" />
                            <p className="mt-3 text-sm">Your generated video will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
            {isPublishModalOpen && result && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsPublishModalOpen(false)}>
                    <div className="bg-panel rounded-xl shadow-2xl w-full max-w-lg border border-border animate-modal-pop" onClick={e => e.stopPropagation()}>
                        <header className="p-4 border-b border-border-subtle flex justify-between items-center">
                            <h2 className="font-bold text-main text-lg">Publish Social Video</h2>
                            <button onClick={() => setIsPublishModalOpen(false)} className="p-2 text-gray-500 hover:text-white rounded-full"><XIcon className="h-6 w-6"/></button>
                        </header>
                        <div className="p-6">
                            <p className="text-sm text-text-secondary mb-4">Select the accounts you want to publish this video to.</p>
                            <div className="space-y-3 max-h-60 overflow-y-auto">
                                {connectedAccounts.map(account => (
                                    <label key={`${account.platform}:${account.id}`} className="flex items-center p-3 bg-panel-light rounded-lg border border-border-subtle cursor-pointer hover:bg-gray-700/50">
                                        <input type="checkbox" checked={selectedAccounts.includes(`${account.platform}:${account.id}`)} onChange={() => toggleAccountSelection(`${account.platform}:${account.id}`)} className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-brand-primary focus:ring-brand-primary"/>
                                        <span className="ml-3 text-sm font-medium text-white">{account.name} ({account.platform})</span>
                                    </label>
                                ))}
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button onClick={() => setIsPublishModalOpen(false)} className="btn btn-secondary">Cancel</button>
                                <button onClick={handlePublish} disabled={isPublishing || selectedAccounts.length === 0} className="btn btn-primary disabled:opacity-50">
                                    {isPublishing ? 'Publishing...' : `Publish to ${selectedAccounts.length} Account(s)`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
