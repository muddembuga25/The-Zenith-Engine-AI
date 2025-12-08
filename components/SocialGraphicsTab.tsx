
import React, { useState, useCallback, useEffect } from 'react';
import type { Site, ApiKeys, PostHistoryItem } from '../types';
import { AiProvider } from '../types';
import { AVAILABLE_MODELS } from '../types';
import { generateSocialGraphicAndCaption } from '../services/aiService';
import { PhotoIcon, XIconSocial, InstagramIcon, PinterestIcon, ArchiveBoxIcon } from './Icons';

interface SocialGraphicsTabProps {
    site: Site;
    onSiteUpdate: (field: keyof Site, value: any) => void;
    logApiUsage: (provider: keyof ApiKeys, cost: number) => void;
    setError: (error: string | null) => void;
}

const aspectRatios: { value: '1:1' | '9:16' | '16:9'; label: string; icon?: React.FC<any> }[] = [
    { value: '1:1', label: 'Square (FB/IG)', icon: InstagramIcon },
    { value: '9:16', label: 'Story (IG/Pin)', icon: PinterestIcon },
    { value: '16:9', label: 'Wide (X/LI)', icon: XIconSocial },
];

interface GenerationResult {
    imageUrl: string;
    caption: string;
}

export const SocialGraphicsTab: React.FC<SocialGraphicsTabProps> = ({ site, onSiteUpdate, logApiUsage, setError }) => {
    const [prompt, setPrompt] = useState<string>('');
    const [aspectRatio, setAspectRatio] = useState<'1:1' | '9:16' | '16:9'>('1:1');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [result, setResult] = useState<GenerationResult | null>(null);
    const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
    const [baseImageId, setBaseImageId] = useState<string>('');

    // Local state for model selection
    const [imageProvider, setImageProvider] = useState<AiProvider>(site.modelConfig.imageProvider);
    const [imageModel, setImageModel] = useState<string>(site.modelConfig.imageModel);

    // Sync local state if global site settings change
    useEffect(() => {
        const globalProvider = site.modelConfig.imageProvider;
        const globalModel = site.modelConfig.imageModel;
        
        setImageProvider(globalProvider);
    
        const fetchedProviderModels = site.fetchedModels?.[globalProvider]?.image;
        const hardcodedProviderModels = AVAILABLE_MODELS[globalProvider as keyof typeof AVAILABLE_MODELS]?.image;
        
        const availableModels = [...new Set([...(fetchedProviderModels || []), ...(hardcodedProviderModels || [])])];
        
        if (!availableModels.includes(globalModel)) {
            setImageModel(availableModels[0] || '');
        } else {
            setImageModel(globalModel);
        }
    }, [site.modelConfig, site.fetchedModels]);
    
    const imageProviders = Object.keys(AiProvider).filter(p => 
        (site.fetchedModels?.[p as AiProvider]?.image?.length || 0) > 0 || 
        (AVAILABLE_MODELS[p as keyof typeof AVAILABLE_MODELS]?.image?.length || 0) > 0
    );
    const imageModels = site.fetchedModels?.[imageProvider]?.image || AVAILABLE_MODELS[imageProvider as keyof typeof AVAILABLE_MODELS]?.image || [];
    
    const handleProviderChange = (provider: AiProvider) => {
        setImageProvider(provider);
        const newModels = site.fetchedModels?.[provider]?.image || AVAILABLE_MODELS[provider as keyof typeof AVAILABLE_MODELS]?.image;
        setImageModel(newModels?.[0] || '');
    };

    const handleGenerate = useCallback(async () => {
        if (!prompt.trim()) {
            setError("Please enter a prompt for the graphic.");
            return;
        }
        setIsLoading(true);
        setResult(null);
        setError(null);

        try {
            const overrides = { imageProvider, imageModel };
            const { base64Image, caption, imageCost, imageProvider: usedProvider, captionCost, captionProvider } = await generateSocialGraphicAndCaption(prompt, aspectRatio, site, selectedCharacterId || null, overrides, baseImageId || undefined);
            
            logApiUsage(usedProvider, imageCost);
            logApiUsage(captionProvider, captionCost);

            setResult({ imageUrl: base64Image, caption });
        } catch (error: any) {
            setError(error.message || "An unknown error occurred during graphic generation.");
        } finally {
            setIsLoading(false);
        }
    }, [prompt, aspectRatio, site, logApiUsage, setError, selectedCharacterId, imageProvider, imageModel, baseImageId]);

    const handleSaveToHistory = useCallback(() => {
        if (!result) return;
        
        const newHistoryItem: PostHistoryItem = {
            id: crypto.randomUUID(),
            topic: `Social Graphic: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`,
            url: '#',
            date: Date.now(),
            type: 'Social Graphic',
            socialGraphics: { custom: { imageUrl: result.imageUrl, caption: result.caption } }
        };

        onSiteUpdate('history', [newHistoryItem, ...(site.history || [])]);
        setResult(null);
        setPrompt('');
    }, [result, prompt, site, onSiteUpdate]);

    return (
        <div className="w-full max-w-5xl mx-auto space-y-8">
             <div className="bg-panel/50 p-6 rounded-2xl border border-border">
                <h2 className="text-2xl font-bold text-main">Social Graphics Generator</h2>
                <p className="text-text-secondary mt-1">Create engaging, branded images for your social media channels on-demand.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">Prompt</label>
                        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., An abstract image representing AI and creativity, vibrant colors..." className="input-base w-full p-3 text-sm" rows={4} disabled={isLoading} />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">Aspect Ratio</label>
                        <div className="grid grid-cols-3 gap-3">
                            {aspectRatios.map(ar => (
                                <button key={ar.value} onClick={() => setAspectRatio(ar.value)} disabled={isLoading} className={`p-3 rounded-lg border-2 flex flex-col items-center justify-center gap-2 transition-colors ${aspectRatio === ar.value ? 'border-brand-primary bg-brand-primary/20' : 'border-border bg-panel hover:border-gray-600'}`}>
                                    {ar.icon && <ar.icon className="h-5 w-5" />}
                                    <span className="text-xs font-semibold">{ar.label}</span>
                                </button>
                            ))}
                        </div>
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
                    
                    {(site.isIntelligentGalleryEnabled && site.imageGallery && site.imageGallery.length > 0) && (
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">Base Image (Optional)</label>
                            <select value={baseImageId} onChange={e => setBaseImageId(e.target.value)} className="input-base w-full" disabled={isLoading}>
                                <option value="">Generate New</option>
                                {site.imageGallery.map(img => <option key={img.id} value={img.id}>{img.altText}</option>)}
                            </select>
                            <p className="text-xs text-text-secondary mt-1">Select an image from your gallery to edit instead of generating from scratch.</p>
                        </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-1">Provider</label>
                            <select value={imageProvider} onChange={e => handleProviderChange(e.target.value as AiProvider)} className="input-base w-full text-sm" disabled={isLoading}>
                                {imageProviders.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-text-primary mb-1">Model</label>
                            <input list="graphic-image-models" value={imageModel} onChange={e => setImageModel(e.target.value)} className="input-base w-full text-sm" disabled={isLoading} />
                            <datalist id="graphic-image-models">
                                {imageModels.map(m => <option key={m} value={m} />)}
                            </datalist>
                        </div>
                    </div>

                    <button onClick={handleGenerate} disabled={isLoading || !prompt.trim()} className="w-full btn btn-primary text-lg flex items-center justify-center gap-3 disabled:opacity-50">
                        {isLoading ? (
                            <><svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Generating...</>
                        ) : (
                            <><PhotoIcon className="h-6 w-6" /> Generate Graphic</>
                        )}
                    </button>
                </div>
                
                <div className="bg-panel/50 p-4 rounded-2xl border border-border min-h-[300px]">
                    <h3 className="text-lg font-bold text-brand-primary">Result</h3>
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full"><p className="text-text-secondary">Generating graphic & caption...</p></div>
                    ) : result ? (
                        <div className="w-full space-y-4 mt-4 animate-fade-in">
                            <img src={`data:image/jpeg;base64,${result.imageUrl}`} alt="Generated social graphic" className="w-full rounded-lg border border-border" />
                            <div>
                                <label className="text-sm font-medium text-text-primary">Generated Caption</label>
                                <textarea readOnly value={result.caption} className="input-base w-full p-2 text-sm bg-panel mt-1" rows={5} />
                            </div>
                            <button onClick={handleSaveToHistory} className="w-full btn btn-secondary flex items-center justify-center gap-2"><ArchiveBoxIcon className="h-5 w-5" /> Save to History</button>
                        </div>
                    ) : (
                         <div className="text-center text-text-secondary p-8 h-full flex flex-col items-center justify-center">
                            <PhotoIcon className="h-10 w-10 text-gray-600" />
                            <p className="mt-3 text-sm">Your generated graphic will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
