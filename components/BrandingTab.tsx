
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { Site, ApiKeys, CharacterReference, ImageGalleryItem, MonthlyCalendarEntry, SpecificDayEntry, OrdinalDayEntry, OrdinalWeek } from '../types';
import * as aiService from '../services/aiService';
import * as wordpressService from '../services/wordpressService';
import { UserIcon, LinkIcon, PhotoIcon, DocumentTextIcon, ArrowUpTrayIcon, XIcon, TrashIcon, PenIcon, WordPressIcon, CalendarDaysIcon, LightbulbIcon, ExclamationTriangleIcon } from './Icons';
import { NextStepGuide } from './NextStepGuide';

interface BrandingTabProps {
    site: Site;
    onSiteUpdate: (field: keyof Site, value: any) => void;
    onMultipleSiteUpdates: (updates: Partial<Site>) => void;
    logApiUsage: (provider: keyof ApiKeys, cost: number) => void;
    setError: (error: string | null) => void;
    setActiveTab: (tab: string, subTab?: string | null) => void;
}

const TabGuide: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => {
    const [isVisible, setIsVisible] = useState(true);
    if (!isVisible) return null;
    return (
        <div className="bg-panel p-5 rounded-xl border-l-4 border-brand-primary shadow-sm mb-8 flex items-start gap-4 animate-fade-in relative overflow-hidden border-y border-r border-border-subtle">
            <div className="absolute -right-6 -top-6 opacity-[0.03] pointer-events-none">
                <LightbulbIcon className="h-32 w-32 text-brand-primary" />
            </div>
            <div className="p-2 bg-brand-primary/10 rounded-full flex-shrink-0 relative z-10">
                <LightbulbIcon className="h-5 w-5 text-brand-primary" />
            </div>
            <div className="flex-1 pt-0.5 relative z-10">
                <h3 className="font-bold text-main text-lg">{title}</h3>
                <div className="text-sm text-text-secondary mt-1 leading-relaxed">
                    {children}
                </div>
            </div>
            <button 
                onClick={() => setIsVisible(false)} 
                className="p-1.5 text-text-tertiary hover:text-main rounded-full relative z-10 transition-colors hover:bg-bg-surface-highlight"
            >
                <XIcon className="h-5 w-5" />
            </button>
        </div>
    );
};

// Panel component for consistent UI
const Panel: React.FC<{ title: string; description: string; icon: React.FC<any>; children: React.ReactNode }> = ({ title, description, icon: Icon, children }) => (
    <div className="bg-panel/50 p-6 rounded-2xl border border-border">
        <div className="flex items-start gap-4 mb-6">
            <div className="p-3 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex-shrink-0">
                <Icon className="h-6 w-6 text-brand-primary" />
            </div>
            <div>
                <h3 className="text-xl font-bold text-main">{title}</h3>
                <p className="text-sm text-text-secondary mt-1">{description}</p>
            </div>
        </div>
        {children}
    </div>
);


const CharacterPersonasPanel: React.FC<{
    characters: CharacterReference[];
    onUpdate: (characters: CharacterReference[]) => void;
    setError: (error: string | null) => void;
}> = React.memo(({ characters, onUpdate, setError }) => {
    const [editingCharacter, setEditingCharacter] = useState<Partial<CharacterReference> | null>(null);

    const handleAddNew = () => setEditingCharacter({});
    const handleEdit = (character: CharacterReference) => setEditingCharacter(character);
    const handleCancel = () => setEditingCharacter(null);

    const handleDelete = (id: string) => {
        if (window.confirm("Are you sure you want to delete this character? This cannot be undone.")) {
            onUpdate(characters.filter(c => c.id !== id));
        }
    };

    const handleSave = () => {
        if (!editingCharacter || !editingCharacter.name?.trim() || !editingCharacter.visualPrompt?.trim()) {
            setError("Character Name and Visual Description Prompt are required.");
            return;
        }

        if (editingCharacter.id) {
            onUpdate(characters.map(c => c.id === editingCharacter.id ? editingCharacter as CharacterReference : c));
        } else {
            const newCharacter: CharacterReference = {
                id: crypto.randomUUID(),
                name: editingCharacter.name.trim(),
                personality: editingCharacter.personality?.trim() || '',
                visualPrompt: editingCharacter.visualPrompt.trim(),
                referenceImageUrl: editingCharacter.referenceImageUrl,
            };
            onUpdate([...characters, newCharacter]);
        }
        setEditingCharacter(null);
    };

    const handleFieldChange = (field: keyof Omit<CharacterReference, 'id'>, value: string) => {
        setEditingCharacter(prev => ({ ...prev, [field]: value }));
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            setError("Reference image must be under 2MB.");
            return;
        }
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
            handleFieldChange('referenceImageUrl', loadEvent.target?.result as string);
        };
        reader.readAsDataURL(file);
    };
    
    if (editingCharacter) {
        return (
            <div className="mt-4 p-4 bg-panel rounded-lg border border-brand-primary/20 animate-fade-in space-y-4">
                <h4 className="font-semibold text-lg text-main">{editingCharacter.id ? `Editing "${editingCharacter.name}"` : "Add New Character"}</h4>
                <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Character Name</label>
                    <input type="text" value={editingCharacter.name || ''} onChange={e => handleFieldChange('name', e.target.value)} placeholder='e.g., "Professor Bot"' className="input-base px-3 py-2" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Personality & Traits</label>
                    <textarea value={editingCharacter.personality || ''} onChange={e => handleFieldChange('personality', e.target.value)} placeholder="e.g., Witty, curious, and slightly sarcastic..." className="input-base px-3 py-2" rows={3} />
                    <p className="text-xs text-text-secondary mt-1">Used by the text model to generate captions in character.</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Visual Description Prompt</label>
                    <textarea value={editingCharacter.visualPrompt || ''} onChange={e => handleFieldChange('visualPrompt', e.target.value)} placeholder="e.g., A friendly retro robot, brushed aluminum, single glowing blue eye..." className="input-base px-3 py-2" rows={4} />
                    <p className="text-xs text-text-secondary mt-1">The character's visual DNA. Be specific for consistency.</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Visual Reference Image (Optional)</label>
                    <div className="flex items-center gap-4">
                        {editingCharacter.referenceImageUrl ? (
                            <div className="flex items-center gap-2">
                                <img src={editingCharacter.referenceImageUrl} alt="Reference" className="h-16 w-16 object-contain bg-black/20 rounded-md p-1 border border-border" />
                                <button onClick={() => handleFieldChange('referenceImageUrl', '')} className="btn btn-secondary text-xs p-2"><TrashIcon className="h-4 w-4" /></button>
                            </div>
                        ) : (
                             <label htmlFor="char-image-upload" className="flex-grow btn btn-secondary text-sm flex items-center justify-center gap-2 cursor-pointer">
                                <ArrowUpTrayIcon className="h-5 w-5" /> Upload Image
                                <input id="char-image-upload" type="file" accept="image/png, image/jpeg, image/webp" onChange={handleImageUpload} className="sr-only" />
                            </label>
                        )}
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
                    <button onClick={handleCancel} className="btn btn-secondary">Cancel</button>
                    <button onClick={handleSave} className="btn btn-primary">Save Character</button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {characters.map(char => (
                <div key={char.id} className="bg-panel p-3 rounded-lg flex items-center justify-between gap-3 border border-border-subtle">
                    <div className="flex items-center gap-3">
                        {char.referenceImageUrl ? (
                             <img src={char.referenceImageUrl} alt={char.name} className="h-10 w-10 object-cover rounded-md bg-black/20" />
                        ) : (
                            <div className="h-10 w-10 rounded-md bg-panel-light flex items-center justify-center">
                                <UserIcon className="h-6 w-6 text-gray-500" />
                            </div>
                        )}
                        <span className="font-semibold text-main">{char.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleEdit(char)} className="btn btn-secondary text-sm p-2"><PenIcon className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(char.id)} className="btn bg-red-900/40 hover:bg-red-800/60 text-red-300 text-sm p-2"><TrashIcon className="h-4 w-4" /></button>
                    </div>
                </div>
            ))}
            {characters.length === 0 && (
                <p className="text-center text-sm text-text-secondary py-4">No characters defined yet.</p>
            )}
            <button onClick={handleAddNew} className="w-full btn btn-secondary mt-3">+ Add New Character</button>
        </div>
    );
});


const ImageGalleryPanel: React.FC<BrandingTabProps> = ({ site, onSiteUpdate, logApiUsage, setError }) => {
    const [isTagging, setIsTagging] = useState(false);
    const [imageToDelete, setImageToDelete] = useState<ImageGalleryItem | null>(null);
    const gallery = site.imageGallery || [];

    const handleImageFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsTagging(true);
        setError(null);
        let totalCost = 0;

        const filePromises = Array.from(files).map((file: File) => {
            return new Promise<{ file: File, dataUrl: string }>((resolve, reject) => {
                if (file.size > 4 * 1024 * 1024) { // 4MB limit
                    reject(new Error(`File "${file.name}" is too large (> 4MB).`));
                    return;
                }
                const reader = new FileReader();
                reader.onload = (event) => resolve({ file, dataUrl: event.target?.result as string });
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        });

        try {
            const loadedFiles = await Promise.all(filePromises);
            const newGalleryItems: ImageGalleryItem[] = [];

            for (const { file, dataUrl } of loadedFiles) {
                const base64Image = dataUrl.split(',')[1];
                const { altText, tags, cost, provider } = await aiService.generateImageMetadata(base64Image, file.type, site);
                totalCost += cost;
                
                newGalleryItems.push({
                    id: crypto.randomUUID(),
                    imageUrl: dataUrl,
                    altText,
                    tags,
                });
            }

            logApiUsage('google', totalCost);
            onSiteUpdate('imageGallery', [...gallery, ...newGalleryItems]);

        } catch (error: any) {
            setError(error.message || "An error occurred while processing images.");
        } finally {
            setIsTagging(false);
        }
    };

    const handleDeleteRequest = (image: ImageGalleryItem) => {
        setImageToDelete(image);
    };

    const handleConfirmDelete = () => {
        if (!imageToDelete) return;
        onSiteUpdate('imageGallery', gallery.filter(img => img.id !== imageToDelete.id));
        setImageToDelete(null);
    };
    
    return (
        <Panel title="Intelligent Image Gallery" description="Build a library of on-brand images. The AI will analyze, tag, and intelligently select and edit from this gallery to include in your content." icon={PhotoIcon}>
            {imageToDelete && (
                 <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-panel rounded-lg shadow-2xl w-full max-w-md p-6 border border-red-500/50 animate-modal-pop">
                        <div className="flex items-start gap-4">
                            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-900/50 sm:mx-0 sm:h-10 sm:w-10"><ExclamationTriangleIcon className="h-6 w-6 text-red-400" /></div>
                            <div className="mt-0 text-left flex-1">
                                <h3 className="text-lg font-bold text-main">Delete Image?</h3>
                                <div className="mt-2">
                                    <p className="text-sm text-text-secondary">Are you sure you want to delete this image from your gallery? This action cannot be undone.</p>
                                    <div className="mt-4 flex justify-center">
                                      <img src={imageToDelete.imageUrl} alt={imageToDelete.altText} className="rounded-lg max-h-40 border border-border"/>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
                            <button type="button" onClick={handleConfirmDelete} className="w-full btn bg-red-600 hover:bg-red-700 text-white sm:w-auto">Delete</button>
                            <button type="button" onClick={() => setImageToDelete(null)} className="mt-3 w-full btn btn-secondary sm:mt-0 sm:w-auto">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex items-center justify-between mb-6">
                <p className="text-sm font-medium text-text-primary">Enable Intelligent Gallery</p>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={site.isIntelligentGalleryEnabled ?? false} 
                        onChange={e => onSiteUpdate('isIntelligentGalleryEnabled', e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-600/50 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                </label>
            </div>
            
            <div>
                <label htmlFor="gallery-upload" className={`w-full btn btn-primary text-sm flex items-center justify-center gap-2 cursor-pointer ${isTagging ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {isTagging ? (
                        <><svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Generating Metadata...</>
                    ) : (
                        <><ArrowUpTrayIcon className="h-5 w-5" /> Upload & Analyze Images</>
                    )}
                    <input id="gallery-upload" type="file" multiple disabled={isTagging} className="sr-only" onChange={handleImageFiles} accept="image/png, image/jpeg, image/webp" />
                </label>
            </div>

            <div className="mt-6">
                {gallery.length === 0 && !isTagging ? (
                    <div className="text-center text-text-secondary py-8 border-2 border-dashed border-border rounded-lg">
                        <PhotoIcon className="h-10 w-10 mx-auto text-gray-600" />
                        <p className="mt-2 text-sm">Your image gallery is empty.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {gallery.map(image => (
                            <div key={image.id} className="group relative bg-panel rounded-lg border border-border-subtle overflow-hidden">
                                <img src={image.imageUrl} alt={image.altText} className="aspect-square w-full object-cover" />
                                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                                    <p className="text-xs font-semibold text-white truncate">{image.altText}</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {image.tags.slice(0, 3).map(tag => (
                                            <span key={tag} className="text-[10px] bg-brand-primary/20 text-brand-primary px-1.5 py-0.5 rounded-full">{tag}</span>
                                        ))}
                                    </div>
                                </div>
                                <button onClick={() => handleDeleteRequest(image)} className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-red-600/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">
                                    <TrashIcon className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Panel>
    );
};


const ContentCalendarPanel: React.FC<BrandingTabProps> = ({ site, onSiteUpdate }) => {
    const calendar = site.contentCalendar || { weekly: Array(7).fill(''), monthly: [] };
    
    useEffect(() => {
        if (site.contentCalendar?.monthly) {
            let needsUpdate = false;
            const migratedMonthly = site.contentCalendar.monthly.map(entry => {
                if (!('id' in entry) || !('type' in entry)) {
                    needsUpdate = true;
                    return {
                        id: crypto.randomUUID(),
                        type: 'specific_day',
                        day: (entry as any).day || 1,
                        topic: (entry as any).topic,
                    } as SpecificDayEntry;
                }
                return entry;
            });

            if (needsUpdate) {
                onSiteUpdate('contentCalendar', { ...site.contentCalendar, monthly: migratedMonthly });
            }
        }
    }, [site.contentCalendar, onSiteUpdate]);


    const handleWeeklyChange = (dayIndex: number, topic: string) => {
        const newWeekly = [...(calendar.weekly || Array(7).fill(''))];
        newWeekly[dayIndex] = topic;
        onSiteUpdate('contentCalendar', { ...calendar, weekly: newWeekly });
    };

    const handleAddMonthly = () => {
        const newEntry: SpecificDayEntry = { id: crypto.randomUUID(), type: 'specific_day', day: 1, topic: '' };
        const newMonthly = [...(calendar.monthly || []), newEntry];
        onSiteUpdate('contentCalendar', { ...calendar, monthly: newMonthly });
    };

    const handleMonthlyChange = (id: string, field: string, value: any) => {
        const newMonthly = (calendar.monthly || []).map((entry): MonthlyCalendarEntry => {
            if (entry.id !== id) return entry;

            if (field === 'type') {
                if (value === 'specific_day') {
                    return { id, type: 'specific_day', day: 1, topic: entry.topic };
                } else {
                    return { id, type: 'ordinal_day', week: 'first', dayOfWeek: 0, topic: entry.topic };
                }
            }
            
            return { ...entry, [field]: value } as MonthlyCalendarEntry;
        });
        onSiteUpdate('contentCalendar', { ...calendar, monthly: newMonthly });
    };


    const handleRemoveMonthly = (id: string) => {
        const newMonthly = (calendar.monthly || []).filter(entry => entry.id !== id);
        onSiteUpdate('contentCalendar', { ...calendar, monthly: newMonthly });
    };

    const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const ordinalWeeks: { value: OrdinalWeek; label: string }[] = [
        { value: 'first', label: 'First' }, { value: 'second', label: 'Second' },
        { value: 'third', label: 'Third' }, { value: 'fourth', label: 'Fourth' }, { value: 'last', label: 'Last' }
    ];

    return (
        <Panel title="Content Calendar" description="Define recurring content themes to guide the AI's generation process." icon={CalendarDaysIcon}>
            <div className="flex items-center justify-between mb-6">
                 <p className="text-sm font-medium text-text-primary">Enable Content Calendar</p>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={site.isContentCalendarEnabled ?? false} onChange={e => onSiteUpdate('isContentCalendarEnabled', e.target.checked)} />
                    <div className="w-11 h-6 bg-gray-600/50 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                </label>
            </div>
            {(site.isContentCalendarEnabled ?? false) && (
                <div className="animate-fade-in space-y-6">
                    {/* Weekly Themes */}
                    <div>
                        <h4 className="font-semibold text-main mb-3">Weekly Themes</h4>
                        <div className="space-y-3">
                            {weekDays.map((day, index) => (
                                <div key={index} className="grid grid-cols-3 gap-3 items-center">
                                    <label className="text-sm font-medium text-text-primary col-span-1">{day}</label>
                                    <input
                                        type="text"
                                        value={(calendar.weekly || [])[index] || ''}
                                        onChange={(e) => handleWeeklyChange(index, e.target.value)}
                                        placeholder={`e.g., Tech Tip ${day}`}
                                        className="input-base px-3 py-2 text-sm col-span-2"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Monthly Themes */}
                    <div>
                        <h4 className="font-semibold text-main mb-3">Monthly Rules</h4>
                        <div className="space-y-4">
                            {(calendar.monthly || []).map((entry) => (
                                <div key={entry.id} className="p-4 bg-panel rounded-lg border border-border-subtle space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <select value={entry.type} onChange={(e) => handleMonthlyChange(entry.id, 'type', e.target.value)} className="input-base text-sm">
                                            <option value="specific_day">Specific Day</option>
                                            <option value="ordinal_day">Ordinal Day</option>
                                        </select>

                                        {entry.type === 'specific_day' && (
                                            <div className="flex items-center gap-2">
                                                 <span className="text-sm text-text-secondary">Day</span>
                                                 <input
                                                     type="number" min="1" max="31"
                                                     value={(entry as SpecificDayEntry).day}
                                                     onChange={(e) => handleMonthlyChange(entry.id, 'day', parseInt(e.target.value, 10) || 1)}
                                                     className="input-base w-full text-sm"
                                                 />
                                            </div>
                                        )}
                                        {entry.type === 'ordinal_day' && (
                                            <div className="flex items-center gap-2">
                                                <select value={(entry as OrdinalDayEntry).week} onChange={e => handleMonthlyChange(entry.id, 'week', e.target.value)} className="input-base text-sm flex-1">
                                                    {ordinalWeeks.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                                                </select>
                                                <select value={(entry as OrdinalDayEntry).dayOfWeek} onChange={e => handleMonthlyChange(entry.id, 'dayOfWeek', parseInt(e.target.value))} className="input-base text-sm flex-1">
                                                    {weekDays.map((d, i) => <option key={i} value={i}>{d}</option>)}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                         <input
                                             type="text"
                                             value={entry.topic}
                                             onChange={(e) => handleMonthlyChange(entry.id, 'topic', e.target.value)}
                                             placeholder="Enter theme/topic..."
                                             className="input-base flex-grow text-sm"
                                         />
                                        <button onClick={() => handleRemoveMonthly(entry.id)} className="btn bg-red-900/40 hover:bg-red-800/60 text-red-300 p-2"><TrashIcon className="h-4 w-4" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={handleAddMonthly} className="w-full btn btn-secondary text-sm mt-4">+ Add Monthly Rule</button>
                    </div>
                </div>
            )}
        </Panel>
    );
};


// Main BrandingTab component
export const BrandingTab: React.FC<BrandingTabProps> = (props) => {
    const { site, onSiteUpdate, onMultipleSiteUpdates, setError, setActiveTab } = props;
    const [isFetchingBranding, setIsFetchingBranding] = useState(false);

    const hasKeywords = useMemo(() => site.keywordList.split('\n').some(k => k.trim() && !k.trim().startsWith('[DONE]')), [site.keywordList]);

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, logoType: 'light' | 'dark') => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 1 * 1024 * 1024) { // 1MB limit for logos
            setError("Logo image must be under 1MB.");
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            const field = logoType === 'light' ? 'brandLogoLight' : 'brandLogoDark';
            onSiteUpdate(field, event.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleFetchBranding = async () => {
        if (!site.wordpressUrl) {
            setError("Please enter your WordPress URL in the Settings tab first.");
            return;
        }
        setIsFetchingBranding(true);
        setError(null);
        try {
            const { brandColors, brandFonts } = await wordpressService.fetchBrandingFromWordPress({
                url: site.wordpressUrl,
            });
            const updates: Partial<Site> = {};
            if (brandColors) updates.brandColors = brandColors;
            if (brandFonts) updates.brandFonts = brandFonts;
            onMultipleSiteUpdates(updates);
        } catch (e: any) {
            setError(e.message || "Failed to fetch branding from site.");
        } finally {
            setIsFetchingBranding(false);
        }
    };
    
    return (
        <div className="w-full max-w-4xl mx-auto space-y-8">
            <TabGuide title="Define Your Brand's DNA">
                <p>This is the most important step for high-quality, consistent AI content. Fill out your <strong>Brand Guideline</strong> with your voice, tone, and audience. Upload logos, define colors, and create <strong>Character Personas</strong> for the AI to use.</p>
            </TabGuide>
            <div className="bg-panel/50 p-6 rounded-2xl border border-border">
                <h2 className="text-2xl font-bold text-main">Branding & Context</h2>
                <p className="text-text-secondary mt-1">Provide the AI with your brand's DNA to ensure every piece of content is perfectly aligned.</p>
            </div>
            
            <Panel title="Brand Guideline" description="This is the AI's soul. Define your voice, tone, audience, and mission. This is sent with every AI task." icon={DocumentTextIcon}>
                <textarea
                    value={site.brandGuideline}
                    onChange={(e) => onSiteUpdate('brandGuideline', e.target.value)}
                    placeholder="e.g., Brand Voice: Witty, authoritative, and helpful. Target Audience: Tech-savvy marketing professionals..."
                    className="input-base w-full p-4 text-sm leading-relaxed"
                    rows={15}
                />
            </Panel>
            
            <Panel title="Visual Identity" description="Upload logos and define colors/fonts for consistent branding." icon={PhotoIcon}>
                 <div className="space-y-6">
                    {/* Dual Logo Uploaders */}
                    <div>
                        <h4 className="font-semibold text-main mb-2">Brand Logo</h4>
                        <div className="grid grid-cols-2 gap-4">
                            {(['light', 'dark'] as const).map(type => {
                                const logo = type === 'light' ? site.brandLogoLight : site.brandLogoDark;
                                const field = type === 'light' ? 'brandLogoLight' : 'brandLogoDark';
                                return (
                                    <div key={type}>
                                        <label className="text-xs text-text-secondary block mb-1.5">{type === 'light' ? 'Light Logo (for dark bg)' : 'Dark Logo (for light bg)'}</label>
                                        {logo ? (
                                            <div className="relative group">
                                                <div className={`aspect-video rounded-lg border border-border flex items-center justify-center p-2 ${type === 'light' ? 'bg-gray-800' : 'bg-gray-200'}`}>
                                                    <img src={logo} alt={`${type} logo preview`} className="max-h-full max-w-full object-contain" />
                                                </div>
                                                <button onClick={() => onSiteUpdate(field, '')} className="absolute top-1.5 right-1.5 p-1 rounded-full bg-red-600/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">
                                                    <XIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <label htmlFor={`${type}-logo-upload`} className="aspect-video bg-panel rounded-lg border-2 border-dashed border-border hover:border-brand-primary transition-colors flex flex-col items-center justify-center cursor-pointer">
                                                <ArrowUpTrayIcon className="h-6 w-6 text-text-secondary" />
                                                <span className="text-xs text-text-secondary mt-1">Upload Logo</span>
                                                <input id={`${type}-logo-upload`} type="file" accept="image/png, image/jpeg, image/svg+xml" onChange={(e) => handleLogoUpload(e, type)} className="sr-only" />
                                            </label>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    
                    <div className="pt-6 border-t border-border-subtle">
                         <button onClick={handleFetchBranding} disabled={isFetchingBranding} className="w-full btn btn-secondary flex items-center justify-center gap-2 mb-4">
                            <WordPressIcon className="h-5 w-5" /> {isFetchingBranding ? 'Fetching...' : 'Fetch from WordPress'}
                        </button>
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-1">Brand Colors</label>
                            <input type="text" value={site.brandColors || ''} onChange={(e) => onSiteUpdate('brandColors', e.target.value)} placeholder="e.g., #FF5733, #33FFB5" className="input-base w-full px-3 py-2 text-sm" />
                            <p className="text-xs text-text-secondary mt-1">Comma-separated hex codes.</p>
                        </div>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-text-primary mb-1">Brand Fonts</label>
                            <input type="text" value={site.brandFonts || ''} onChange={(e) => onSiteUpdate('brandFonts', e.target.value)} placeholder="e.g., Poppins, Lato" className="input-base w-full px-3 py-2 text-sm" />
                            <p className="text-xs text-text-secondary mt-1">Comma-separated font family names.</p>
                        </div>
                    </div>
                </div>
            </Panel>
            
            <Panel title="Character Personas" description="Create 'digital actors' with consistent personalities and visual styles for your social media content." icon={UserIcon}>
                <CharacterPersonasPanel characters={site.characterReferences || []} onUpdate={(c) => onSiteUpdate('characterReferences', c)} setError={setError} />
            </Panel>

            <ImageGalleryPanel {...props} />

            <ContentCalendarPanel {...props} />

            {hasKeywords && !site.isAutomationEnabled && (
                 <NextStepGuide
                    label="Set Up Automation"
                    description="You have content ideas ready to go. Head over to the Automation tab to set up a schedule and let the AI generate content for you automatically."
                    onClick={() => props.setActiveTab('automation')}
                />
            )}
        </div>
    );
};
