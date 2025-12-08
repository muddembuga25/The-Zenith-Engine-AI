
import React, { useState, useMemo } from 'react';
import type { Site, RssSource, VideoSource, GoogleSheetSource } from '../types';
import { XIcon, RssIcon, VideoCameraIcon, GoogleIcon, TrashIcon, PenIcon, LinkIcon, DocumentTextIcon, YouTubeIcon, CheckCircleIcon, SparklesIcon, ArrowRightIcon } from './Icons';

interface ContentSourcesManagerProps {
    site: Site;
    onSiteUpdate: (field: keyof Site, value: any) => void;
    onClose: () => void;
}

type SourceType = 'rss' | 'video' | 'google_sheet';
// Helper type to unify source handling
type AnySource = (RssSource | VideoSource | GoogleSheetSource) & { sourceType: SourceType };

const sourceTypes: Record<SourceType, { label: string; icon: React.FC<any>; color: string }> = {
    rss: { label: 'RSS Feed', icon: RssIcon, color: 'text-orange-400' },
    video: { label: 'Video Source', icon: VideoCameraIcon, color: 'text-red-500' },
    google_sheet: { label: 'Google Sheet', icon: GoogleIcon, color: 'text-blue-500' },
};

export const ContentSourcesManager: React.FC<ContentSourcesManagerProps> = ({ site, onSiteUpdate, onClose }) => {
    const [view, setView] = useState<'list' | 'add' | 'edit'>('list');
    const [filterType, setFilterType] = useState<SourceType | 'all'>('all');
    
    // Form State
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [detectedType, setDetectedType] = useState<SourceType>('rss');
    const [videoType, setVideoType] = useState<'channel' | 'video'>('channel');
    const [editingId, setEditingId] = useState<string | null>(null);

    // Flatten all sources into a single list for display
    const allSources = useMemo(() => {
        const rss = (site.rssSources || []).map(s => ({ ...s, sourceType: 'rss' as SourceType }));
        const video = (site.videoSources || []).map(s => ({ ...s, sourceType: 'video' as SourceType }));
        const sheets = (site.googleSheetSources || []).map(s => ({ ...s, sourceType: 'google_sheet' as SourceType }));
        return [...rss, ...video, ...sheets].sort((a, b) => a.name.localeCompare(b.name));
    }, [site.rssSources, site.videoSources, site.googleSheetSources]);

    const filteredSources = useMemo(() => {
        if (filterType === 'all') return allSources;
        return allSources.filter(s => s.sourceType === filterType);
    }, [allSources, filterType]);

    // Smart Detection Logic
    const handleUrlChange = (val: string) => {
        setUrl(val);
        // Only auto-detect if adding new, or if user hasn't manually locked a type (simplified here to always detect on change)
        const lower = val.toLowerCase();
        let type: SourceType = 'rss';
        
        if (lower.includes('docs.google.com/spreadsheets')) {
            type = 'google_sheet';
        } else if (lower.includes('youtube.com') || lower.includes('youtu.be') || lower.includes('vimeo.com') || lower.includes('tiktok.com')) {
            type = 'video';
        }
        
        setDetectedType(type);
        
        // Auto-fill name if empty and possible (optional polish)
    };

    const handleEdit = (source: AnySource) => {
        setName(source.name);
        setUrl(source.url);
        setDetectedType(source.sourceType);
        setEditingId(source.id);
        if (source.sourceType === 'video') {
            setVideoType((source as VideoSource).type || 'channel');
        }
        setView('edit');
    };

    const handleDelete = (id: string, type: SourceType) => {
        if (!window.confirm("Delete this source?")) return;
        
        if (type === 'rss') {
            onSiteUpdate('rssSources', site.rssSources.filter(s => s.id !== id));
        } else if (type === 'video') {
            onSiteUpdate('videoSources', site.videoSources.filter(s => s.id !== id));
        } else if (type === 'google_sheet') {
            onSiteUpdate('googleSheetSources', site.googleSheetSources.filter(s => s.id !== id));
        }
    };

    const handleSave = () => {
        if (!name.trim() || !url.trim()) return;

        const newId = editingId || crypto.randomUUID();
        
        // Prepare object based on type
        if (detectedType === 'rss') {
            const newSource: RssSource = {
                id: newId,
                name,
                url,
                processedRssGuids: editingId ? (site.rssSources.find(s => s.id === newId)?.processedRssGuids || []) : []
            };
            const others = site.rssSources.filter(s => s.id !== newId);
            onSiteUpdate('rssSources', [...others, newSource]);
        } else if (detectedType === 'video') {
            const newSource: VideoSource = {
                id: newId,
                name,
                url,
                type: videoType,
                processedVideoGuids: editingId ? (site.videoSources.find(s => s.id === newId)?.processedVideoGuids || []) : []
            };
            const others = site.videoSources.filter(s => s.id !== newId);
            onSiteUpdate('videoSources', [...others, newSource]);
        } else if (detectedType === 'google_sheet') {
            const newSource: GoogleSheetSource = {
                id: newId,
                name,
                url,
                processedGoogleSheetRows: editingId ? (site.googleSheetSources.find(s => s.id === newId)?.processedGoogleSheetRows || []) : []
            };
            const others = site.googleSheetSources.filter(s => s.id !== newId);
            onSiteUpdate('googleSheetSources', [...others, newSource]);
        }

        // If editing and type changed, remove from old list (complex edge case, assume delete-then-add logic or handled by ID uniqueness across lists if applicable, but here we just append to new list. To be safe, if ID exists in a DIFFERENT list, we should remove it. For simplicity, we assume ID is unique enough or user knows they are changing type). 
        // Strict cleanup:
        if (editingId) {
            // Remove from ALL lists first to ensure clean move
            if (detectedType !== 'rss') onSiteUpdate('rssSources', site.rssSources.filter(s => s.id !== newId));
            if (detectedType !== 'video') onSiteUpdate('videoSources', site.videoSources.filter(s => s.id !== newId));
            if (detectedType !== 'google_sheet') onSiteUpdate('googleSheetSources', site.googleSheetSources.filter(s => s.id !== newId));
        }

        resetForm();
    };

    const resetForm = () => {
        setName('');
        setUrl('');
        setDetectedType('rss');
        setVideoType('channel');
        setEditingId(null);
        setView('list');
    };

    const renderList = () => (
        <>
            <div className="flex gap-2 overflow-x-auto pb-2 mb-2 border-b border-border-subtle">
                <button onClick={() => setFilterType('all')} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterType === 'all' ? 'bg-white text-black' : 'bg-panel-light text-text-secondary hover:text-white'}`}>All</button>
                {Object.entries(sourceTypes).map(([key, meta]) => (
                    <button key={key} onClick={() => setFilterType(key as SourceType)} className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors ${filterType === key ? 'bg-brand-primary text-white' : 'bg-panel-light text-text-secondary hover:text-white'}`}>
                        <meta.icon className="h-3 w-3" /> {meta.label}
                    </button>
                ))}
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {filteredSources.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-border-subtle rounded-xl">
                        <SparklesIcon className="mx-auto h-8 w-8 text-text-tertiary mb-3" />
                        <p className="text-text-secondary text-sm">No sources found.</p>
                        <button onClick={() => setView('add')} className="mt-3 text-brand-primary text-sm font-medium hover:underline">Add your first source</button>
                    </div>
                ) : (
                    filteredSources.map(source => {
                        const meta = sourceTypes[source.sourceType];
                        return (
                            <div key={source.id} className="bg-panel-light p-3 rounded-xl border border-border-subtle hover:border-brand-primary/30 transition-all flex items-center justify-between group">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className={`p-1.5 rounded-md bg-panel border border-border ${meta.color.replace('text-', 'bg-').replace('400', '900/20').replace('500', '900/20')}`}>
                                            <meta.icon className={`h-4 w-4 ${meta.color}`} />
                                        </div>
                                        <span className="font-semibold text-text-primary truncate">{source.name}</span>
                                        {source.sourceType === 'video' && (
                                            <span className="text-[10px] uppercase tracking-wider bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">{(source as VideoSource).type}</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-text-secondary truncate pl-9">{source.url}</p>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(source)} className="p-1.5 text-text-secondary hover:text-white hover:bg-gray-700 rounded-lg"><PenIcon className="h-4 w-4" /></button>
                                    <button onClick={() => handleDelete(source.id, source.sourceType)} className="p-1.5 text-text-secondary hover:text-red-400 hover:bg-gray-700 rounded-lg"><TrashIcon className="h-4 w-4" /></button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            
            <div className="pt-4 mt-2 border-t border-border-subtle">
                <button onClick={() => setView('add')} className="btn btn-primary w-full flex items-center justify-center gap-2 py-3 shadow-lg shadow-brand-primary/20">
                    <SparklesIcon className="h-5 w-5" /> Add New Source
                </button>
            </div>
        </>
    );

    const renderForm = () => {
        const meta = sourceTypes[detectedType];
        return (
            <div className="space-y-6 animate-fade-in">
                <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Source URL</label>
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <LinkIcon className="h-5 w-5 text-text-tertiary" />
                        </div>
                        <input 
                            type="url" 
                            value={url} 
                            onChange={e => handleUrlChange(e.target.value)} 
                            className="input-base pl-10 py-3" 
                            placeholder="https://..." 
                            autoFocus
                        />
                    </div>
                    <p className="text-xs text-text-secondary mt-2 flex items-center gap-1.5">
                        <SparklesIcon className="h-3 w-3 text-brand-primary" />
                        Detected: <span className="font-medium text-white">{meta.label}</span>
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Source Name</label>
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <DocumentTextIcon className="h-5 w-5 text-text-tertiary" />
                        </div>
                        <input 
                            type="text" 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            className="input-base pl-10 py-3" 
                            placeholder="e.g. Official Blog" 
                        />
                    </div>
                </div>

                <div className="p-4 bg-panel-light rounded-xl border border-border-subtle">
                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Configuration</label>
                    
                    {/* Type Override Selector */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        {Object.entries(sourceTypes).map(([key, m]) => (
                            <button 
                                key={key}
                                onClick={() => setDetectedType(key as SourceType)}
                                className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${detectedType === key ? 'bg-brand-primary/10 border-brand-primary text-brand-primary' : 'bg-panel border-border-subtle text-text-secondary hover:border-gray-600'}`}
                            >
                                <m.icon className="h-5 w-5 mb-1" />
                                <span className="text-[10px] font-medium">{m.label}</span>
                            </button>
                        ))}
                    </div>

                    {detectedType === 'video' && (
                        <div className="flex bg-panel rounded-lg p-1 border border-border-subtle">
                            <button onClick={() => setVideoType('channel')} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${videoType === 'channel' ? 'bg-gray-700 text-white shadow-sm' : 'text-text-secondary hover:text-white'}`}>Channel</button>
                            <button onClick={() => setVideoType('video')} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${videoType === 'video' ? 'bg-gray-700 text-white shadow-sm' : 'text-text-secondary hover:text-white'}`}>Single Video</button>
                        </div>
                    )}
                    
                    {detectedType === 'google_sheet' && (
                        <p className="text-xs text-yellow-500 mt-2">Ensure the sheet is accessible to the connected Google account.</p>
                    )}
                </div>

                <div className="flex gap-3 pt-4">
                    <button onClick={resetForm} className="flex-1 btn btn-secondary py-3">Cancel</button>
                    <button onClick={handleSave} disabled={!name || !url} className="flex-1 btn btn-primary py-3 flex items-center justify-center gap-2">
                        {view === 'add' ? 'Add Source' : 'Save Changes'} <ArrowRightIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-panel">
            <header className="p-6 border-b border-border flex justify-between items-center bg-panel-solid">
                <div>
                    <h2 className="font-bold text-white text-xl">Content Sources</h2>
                    <p className="text-xs text-text-secondary mt-1">Manage where the AI gets inspiration.</p>
                </div>
                <button onClick={onClose} className="p-2 text-text-secondary hover:text-white rounded-full transition-colors bg-panel-light hover:bg-gray-700"><XIcon className="h-5 w-5"/></button>
            </header>
            <div className="flex-1 overflow-y-auto p-6">
                {view === 'list' ? renderList() : renderForm()}
            </div>
        </div>
    );
};
