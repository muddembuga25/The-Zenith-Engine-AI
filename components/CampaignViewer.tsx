
import React, { useState, useCallback, useMemo } from 'react';
import type { Site, PostHistoryItem, ApiKeys, DistributionCampaign, DistributionCampaignAsset } from '../types';
import * as aiService from '../services/aiService';
import { BroadcastIcon, XIcon, XIconSocial, LinkedInIcon, InstagramIcon, SpeakerWaveIcon, ArrowUturnLeftIcon, CheckCircleIcon } from './Icons';

interface CampaignViewerProps {
    post: PostHistoryItem;
    site: Site;
    onUpdatePost: (updatedPost: PostHistoryItem) => void;
    onBack: () => void;
    logApiUsage: (provider: keyof ApiKeys, cost: number) => void;
    setError: (error: string | null) => void;
}

const campaignOptions = [
    { id: 'twitter', label: 'Twitter Thread', icon: XIconSocial },
    { id: 'linkedin', label: 'LinkedIn Post', icon: LinkedInIcon },
    { id: 'instagram', label: 'Instagram Carousel', icon: InstagramIcon },
    { id: 'audio', label: 'Audio Summary', icon: SpeakerWaveIcon },
];

// Audio helpers from @google/genai guidelines
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


export const CampaignViewer: React.FC<CampaignViewerProps> = ({ post, site, onUpdatePost, onBack, logApiUsage, setError }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationStatus, setGenerationStatus] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAssets, setSelectedAssets] = useState<string[]>(['twitter', 'linkedin']);
    const [playingAudio, setPlayingAudio] = useState<string | null>(null);

    const campaign = post.distributionCampaign;

    const handleGenerate = async () => {
        setIsModalOpen(false);
        setIsGenerating(true);
        setError(null);

        const newAssets: DistributionCampaignAsset[] = [];
        let totalCost = 0;

        try {
            if (selectedAssets.includes('twitter')) {
                setGenerationStatus('Generating Twitter thread...');
                const { thread, cost } = await aiService.generateTwitterThread(post, site);
                logApiUsage('google', cost);
                totalCost += cost;
                newAssets.push({ id: crypto.randomUUID(), platform: 'twitter', type: 'thread', content: thread, status: 'draft' });
            }
            if (selectedAssets.includes('linkedin')) {
                setGenerationStatus('Generating LinkedIn post...');
                const { post: liPost, cost } = await aiService.generateLinkedInPost(post, site);
                logApiUsage('google', cost);
                totalCost += cost;
                newAssets.push({ id: crypto.randomUUID(), platform: 'linkedin', type: 'post', content: liPost, status: 'draft' });
            }
            if (selectedAssets.includes('instagram')) {
                setGenerationStatus('Generating Instagram carousel plan...');
                const { slides, planCost, imageCost } = await aiService.generateInstagramCarousel(post, site, (msg) => setGenerationStatus(`Generating Instagram... ${msg}`));
                logApiUsage('google', planCost + imageCost);
                totalCost += planCost + imageCost;
                newAssets.push({ id: crypto.randomUUID(), platform: 'instagram', type: 'carousel', content: slides, status: 'draft' });
            }
            if (selectedAssets.includes('audio')) {
                setGenerationStatus('Generating audio summary...');
                const { audioBase64, cost } = await aiService.generateAudioSummary(post, site);
                logApiUsage('google', cost);
                totalCost += cost;
                newAssets.push({ id: crypto.randomUUID(), platform: 'audio', type: 'summary', content: audioBase64, status: 'draft' });
            }

            const newCampaign: DistributionCampaign = {
                status: 'generated',
                assets: newAssets
            };

            onUpdatePost({ ...post, distributionCampaign: newCampaign });

        } catch (err: any) {
            setError(err.message || 'An error occurred during generation.');
        } finally {
            setIsGenerating(false);
            setGenerationStatus('');
        }
    };
    
    const playAudio = async (base64: string) => {
        if (playingAudio === base64) {
            setPlayingAudio(null);
            // In a real app, you'd stop the audio context here. This is a simplified toggle.
            return;
        }
        setPlayingAudio(base64);
        try {
            const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            const audioBuffer = await decodeAudioData(decode(base64), outputAudioContext, 24000, 1);
            const source = outputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputAudioContext.destination);
            source.start();
            source.onended = () => {
                setPlayingAudio(null);
                outputAudioContext.close();
            }
        } catch (e) {
            console.error("Error playing audio:", e);
            setError("Could not play audio.");
            setPlayingAudio(null);
        }
    };


    const renderAsset = (asset: DistributionCampaignAsset) => {
        switch (asset.type) {
            case 'thread':
                return (
                    <div className="space-y-3">
                        {(asset.content as string[]).map((tweet: string, index: number) => (
                            <div key={index} className="bg-panel-light p-3 rounded-lg border border-border-subtle">
                                <p className="text-sm text-text-primary whitespace-pre-wrap">{tweet}</p>
                            </div>
                        ))}
                    </div>
                );
            case 'post':
                return (
                    <div className="bg-panel-light p-3 rounded-lg border border-border-subtle">
                        <p className="text-sm text-text-primary whitespace-pre-wrap">{asset.content as string}</p>
                    </div>
                );
            case 'carousel':
                 return (
                    <div className="space-y-4">
                        {(asset.content as { text: string; imagePrompt: string; imageUrl?: string }[]).map((slide, index) => (
                            <div key={index} className="flex gap-4 p-3 bg-panel-light rounded-lg border border-border-subtle">
                                {slide.imageUrl && <img src={`data:image/jpeg;base64,${slide.imageUrl}`} alt={slide.imagePrompt} className="w-24 h-24 rounded-md object-cover flex-shrink-0" />}
                                <p className="text-sm text-text-primary">{slide.text}</p>
                            </div>
                        ))}
                    </div>
                 );
            case 'summary':
                return (
                     <div className="flex items-center gap-4 p-3 bg-panel-light rounded-lg border border-border-subtle">
                        <button onClick={() => playAudio(asset.content as string)} className="btn btn-secondary p-3">
                            <SpeakerWaveIcon className={`h-6 w-6 ${playingAudio === asset.content ? 'text-blue-400' : ''}`} />
                        </button>
                        <p className="text-sm text-text-secondary">Audio summary. Click to play.</p>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <button onClick={onBack} className="btn btn-secondary flex items-center gap-2">
                    <ArrowUturnLeftIcon className="h-5 w-5" />
                    Back
                </button>
                <h2 className="text-xl font-bold text-main text-center truncate">{post.topic}</h2>
                <div className="w-24"></div> {/* Spacer */}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-panel rounded-xl shadow-2xl w-full max-w-lg border border-border animate-modal-pop" onClick={e => e.stopPropagation()}>
                        <header className="p-4 border-b border-border-subtle flex justify-between items-center">
                            <h2 className="font-bold text-main text-lg">Generate Distribution Campaign</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-500 hover:text-white rounded-full"><XIcon className="h-6 w-6"/></button>
                        </header>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-text-secondary">Select which assets you want the AI to generate for this blog post.</p>
                            <div className="space-y-2">
                                {campaignOptions.map(opt => (
                                    <label key={opt.id} className="flex items-center p-3 bg-panel-light rounded-lg border border-border-subtle cursor-pointer hover:bg-gray-700/50">
                                        <input
                                            type="checkbox"
                                            checked={selectedAssets.includes(opt.id)}
                                            onChange={() => {
                                                setSelectedAssets(prev =>
                                                    prev.includes(opt.id) ? prev.filter(id => id !== opt.id) : [...prev, opt.id]
                                                );
                                            }}
                                            className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                                        />
                                        <opt.icon className="h-5 w-5 mx-3" />
                                        <span className="text-sm font-medium text-main">{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                            <div className="flex justify-end pt-4">
                                <button onClick={handleGenerate} disabled={selectedAssets.length === 0} className="btn btn-primary">
                                    Generate {selectedAssets.length} Asset(s)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isGenerating && (
                <div className="text-center p-12">
                    <svg className="animate-spin h-8 w-8 text-blue-400 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <p className="mt-3 text-text-primary font-semibold">{generationStatus || "Generating campaign assets..."}</p>
                </div>
            )}

            {!isGenerating && campaign?.status === 'generated' && (
                <div className="space-y-6">
                    {campaign.assets.map(asset => {
                        const meta = campaignOptions.find(opt => opt.id === asset.platform);
                        const Icon = meta?.icon || BroadcastIcon;
                        return (
                            <div key={asset.id} className="bg-panel/50 p-6 rounded-2xl border border-border">
                                <h3 className="text-lg font-bold text-main flex items-center gap-3 mb-4">
                                    <Icon className="h-6 w-6" />
                                    {meta?.label || 'Generated Asset'}
                                </h3>
                                {renderAsset(asset)}
                            </div>
                        );
                    })}
                </div>
            )}

            {!isGenerating && (!campaign || campaign.status !== 'generated') && (
                <div className="text-center p-12 bg-panel/50 rounded-2xl border-2 border-dashed border-border">
                    <BroadcastIcon className="mx-auto h-12 w-12 text-text-secondary" />
                    <h3 className="mt-4 text-lg font-medium text-main">No Campaign Generated</h3>
                    <p className="mt-1 text-sm text-text-secondary">Generate a distribution campaign to amplify this post.</p>
                    <button onClick={() => setIsModalOpen(true)} className="mt-6 btn btn-primary">
                        Generate Campaign
                    </button>
                </div>
            )}
        </div>
    );
};
