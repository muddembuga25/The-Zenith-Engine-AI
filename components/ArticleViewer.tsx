
import React, { useState, useEffect, useRef } from 'react';
import type { Site, BlogPost, SeoScoreResult } from '../types';
import { AppStatus } from '../types';
import { WordPressIcon, PenIcon, XIcon, CheckCircleIcon, SparklesIcon, ChevronDownIcon } from './Icons';
import { HtmlRenderer } from './HtmlRenderer';
import { SEOScore } from './SEOScore';
import { DiffViewer } from './DiffViewer';


interface ArticleViewerProps {
    site: Site;
    blogPost: BlogPost;
    seoScore: SeoScoreResult | null;
    status: AppStatus;
    statusMessage: string;
    onPublish: () => void;
    onCancel: () => void;
    onUpdate: (updatedPost: BlogPost) => void;
    originalArticleForDiff: string | null;
    refreshedArticleForDiff: BlogPost | null;
}

const EditableField: React.FC<{ label: string; children: React.ReactNode; }> = ({ label, children }) => (
    <div>
        <label className="block text-sm font-medium text-text-primary mb-1">{label}</label>
        {children}
    </div>
);

// Multi-select component for categories
const MultiSelectCategories: React.FC<{
    available: { id: number; name: string }[];
    selected: string[];
    onChange: (selected: string[]) => void;
}> = ({ available, selected, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleToggle = (categoryName: string) => {
        const isSelected = selected.includes(categoryName);
        if (isSelected) {
            onChange(selected.filter(name => name !== categoryName));
        } else {
            onChange([...selected, categoryName]);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="input-base w-full text-left px-3 py-2 flex justify-between items-center"
            >
                <span className="truncate text-sm">
                    {selected.length > 0 ? selected.join(', ') : 'Select categories...'}
                </span>
                <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-10 mt-1 w-full bg-panel rounded-md shadow-lg border border-border max-h-60 overflow-y-auto">
                    {available.length > 0 ? available.map(category => (
                        <label
                            key={category.id}
                            className="flex items-center px-4 py-2 text-sm text-text-primary hover:bg-panel-light cursor-pointer"
                        >
                            <input
                                type="checkbox"
                                checked={selected.includes(category.name)}
                                onChange={() => handleToggle(category.name)}
                                className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-brand-primary focus:ring-brand-primary"
                            />
                            <span className="ml-3">{category.name}</span>
                        </label>
                    )) : (
                        <div className="px-4 py-2 text-sm text-text-secondary">No categories found. Fetch them in Settings.</div>
                    )}
                </div>
            )}
        </div>
    );
};


export const ArticleViewer: React.FC<ArticleViewerProps> = ({ site, blogPost, seoScore, status, statusMessage, onPublish, onCancel, onUpdate, originalArticleForDiff, refreshedArticleForDiff }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedPost, setEditedPost] = useState<BlogPost>(blogPost);
    const [viewMode, setViewMode] = useState<'diff' | 'preview'>(originalArticleForDiff ? 'diff' : 'preview');

    useEffect(() => {
        setEditedPost(blogPost);
        setViewMode(originalArticleForDiff ? 'diff' : 'preview');
    }, [blogPost, originalArticleForDiff]);

    const handleFieldChange = (field: keyof BlogPost, value: string) => {
        setEditedPost(prev => ({ ...prev, [field]: value }));
    };

    const handleArrayFieldChange = (field: 'categories' | 'tags', value: string) => {
        const arrayValue = value.split(',').map(item => item.trim()).filter(Boolean);
        setEditedPost(prev => ({ ...prev, [field]: arrayValue }));
    };

    const handleSaveChanges = () => {
        onUpdate(editedPost);
        setIsEditing(false);
    };

    const handleDiscardChanges = () => {
        setEditedPost(blogPost); // Reset to original prop
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="w-full max-w-7xl mx-auto animate-fade-in">
                <header className="p-4 md:p-0 mb-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold text-main">Editing Mode</h1>
                        <p className="text-brand-primary mt-1">Make your changes and save to see the updated preview and SEO score.</p>
                    </div>
                     <div className="flex space-x-4">
                        <button onClick={handleDiscardChanges} className="btn btn-secondary flex items-center gap-2"><XIcon className="h-5 w-5"/> Discard Changes</button>
                        <button onClick={handleSaveChanges} className="btn btn-primary flex items-center gap-2"><CheckCircleIcon className="h-5 w-5"/> Save & Preview</button>
                    </div>
                </header>
                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <main className="lg:col-span-8 space-y-6">
                        <div className="bg-panel/50 p-6 rounded-2xl border border-border">
                            <EditableField label="Post Title (H1)">
                                <input type="text" value={editedPost.title} onChange={e => handleFieldChange('title', e.target.value)} className="input-base px-3 py-2 text-lg font-bold" />
                            </EditableField>
                        </div>
                        <div className="bg-panel/50 p-6 rounded-2xl border border-border">
                             <EditableField label="Content (HTML)">
                                <textarea value={editedPost.content} onChange={e => handleFieldChange('content', e.target.value)} className="input-base w-full p-4 text-sm leading-relaxed font-mono" rows={25} style={{ minHeight: '500px' }} />
                            </EditableField>
                        </div>
                    </main>
                    <aside className="lg:col-span-4 h-fit lg:sticky top-6 space-y-6">
                        <div className="bg-panel/50 p-6 rounded-2xl border border-border space-y-4">
                            <h3 className="text-lg font-bold text-brand-primary">Post Details & SEO</h3>
                            <EditableField label="Slug"><input type="text" value={editedPost.slug} onChange={e => handleFieldChange('slug', e.target.value)} className="input-base px-3 py-2 text-sm" /></EditableField>
                            <EditableField label="Excerpt"><textarea value={editedPost.excerpt} onChange={e => handleFieldChange('excerpt', e.target.value)} className="input-base px-3 py-2 text-sm" rows={3} /></EditableField>
                            <EditableField label="SEO Title"><input type="text" value={editedPost.seoTitle} onChange={e => handleFieldChange('seoTitle', e.target.value)} className="input-base px-3 py-2 text-sm" /></EditableField>
                            <EditableField label="Meta Description"><textarea value={editedPost.metaDescription} onChange={e => handleFieldChange('metaDescription', e.target.value)} className="input-base px-3 py-2 text-sm" rows={4} /></EditableField>
                        </div>
                        <div className="bg-panel/50 p-6 rounded-2xl border border-border space-y-4">
                             <h3 className="text-lg font-bold text-brand-primary">Image & Taxonomies</h3>
                            <EditableField label="Image Alt Text"><input type="text" value={editedPost.imageAltText} onChange={e => handleFieldChange('imageAltText', e.target.value)} className="input-base px-3 py-2 text-sm" /></EditableField>
                            <EditableField label="Image Caption"><input type="text" value={editedPost.imageCaption} onChange={e => handleFieldChange('imageCaption', e.target.value)} className="input-base px-3 py-2 text-sm" /></EditableField>
                            <EditableField label="Image Description"><input type="text" value={editedPost.imageDescription} onChange={e => handleFieldChange('imageDescription', e.target.value)} className="input-base px-3 py-2 text-sm" /></EditableField>
                            <EditableField label={site.isStrictCategoryMatching ? "Categories" : "Categories (comma-separated)"}>
                                {site.isStrictCategoryMatching ? (
                                    <MultiSelectCategories
                                        available={site.availableCategories || []}
                                        selected={editedPost.categories}
                                        onChange={(newCategories) => {
                                            setEditedPost(prev => ({ ...prev, categories: newCategories }));
                                        }}
                                    />
                                ) : (
                                    <input type="text" value={editedPost.categories.join(', ')} onChange={e => handleArrayFieldChange('categories', e.target.value)} className="input-base px-3 py-2 text-sm" />
                                )}
                            </EditableField>
                            <EditableField label="Tags (comma-separated)"><input type="text" value={editedPost.tags.join(', ')} onChange={e => handleArrayFieldChange('tags', e.target.value)} className="input-base px-3 py-2 text-sm" /></EditableField>
                        </div>
                    </aside>
                 </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto">
            <header className="p-4 md:p-0 mb-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                    <h1 className="text-2xl md:text-3xl font-extrabold text-main truncate" title={blogPost.title}>{blogPost.title}</h1>
                    <p className="text-brand-primary mt-1">{originalArticleForDiff ? "Your refreshed article is ready for review." : "Your SEO-optimized article is ready."}</p>
                </div>
                <div className="flex space-x-2 sm:space-x-4 w-full sm:w-auto flex-shrink-0">
                    <button onClick={onCancel} className="flex-1 sm:flex-none btn btn-secondary"> Cancel </button>
                    <button onClick={() => setIsEditing(true)} className="flex-1 sm:flex-none btn btn-secondary flex items-center justify-center gap-2"> <PenIcon title="Edit Post" className="h-5 w-5" /> Edit </button>
                    <button onClick={onPublish} disabled={status === AppStatus.PUBLISHING} className={`flex-1 sm:flex-none btn btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait ${status !== AppStatus.PUBLISHING && 'animate-subtle-glow'}`}>
                        <WordPressIcon title="Publish to WordPress" />
                        {status === AppStatus.PUBLISHING ? statusMessage : 'Publish'}
                    </button>
                </div>
            </header>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <main className="lg:col-span-8 order-2 lg:order-1 bg-panel/50 border border-border rounded-2xl shadow-2xl overflow-hidden">
                    <img src={blogPost.imageUrl} alt={blogPost.imageAltText} className="w-full aspect-video object-cover" />
                     {originalArticleForDiff && refreshedArticleForDiff && (
                        <div className="p-4 border-b border-border-subtle">
                            <div className="flex justify-center bg-panel rounded-lg p-1">
                                <button onClick={() => setViewMode('diff')} className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors w-1/2 ${viewMode === 'diff' ? 'bg-brand-primary text-white shadow-md' : 'text-text-secondary hover:bg-panel-light'}`}>Diff View</button>
                                <button onClick={() => setViewMode('preview')} className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors w-1/2 ${viewMode === 'preview' ? 'bg-brand-primary text-white shadow-md' : 'text-text-secondary hover:bg-panel-light'}`}>Final Preview</button>
                            </div>
                        </div>
                     )}

                    <div className="p-4 md:p-8">
                        {viewMode === 'diff' && originalArticleForDiff && refreshedArticleForDiff ? (
                            <DiffViewer originalHtml={originalArticleForDiff} refreshedHtml={refreshedArticleForDiff.content} />
                        ) : (
                            <HtmlRenderer content={blogPost.content} />
                        )}
                    </div>
                </main>
                <aside className="lg:col-span-4 order-1 lg:order-2 h-fit lg:sticky top-6 space-y-6">
                    <div className="bg-panel/50 p-4 md:p-6 rounded-2xl border border-border shadow-2xl">
                        {seoScore && <SEOScore score={seoScore.score} checklist={seoScore.checklist} />}
                        {blogPost.wasSeoAutoCorrected && (
                            <div className="mt-4 flex items-center justify-center gap-2 p-2 bg-green-900/30 border border-green-500/30 rounded-lg text-xs font-semibold text-green-300 animate-fade-in">
                                <SparklesIcon className="h-4 w-4" />
                                <span>AI SEO Auto-Corrected</span>
                            </div>
                        )}
                    </div>
                    <div className="bg-panel/50 p-4 md:p-6 rounded-2xl border border-border shadow-2xl space-y-4">
                         <div> <h3 className="text-lg font-bold mb-2 text-brand-primary">Post Details</h3> <p className="text-sm text-text-secondary break-all"><strong className="text-text-primary">Slug:</strong> /{blogPost.slug}</p> <p className="text-sm text-text-secondary mt-2"><strong className="text-text-primary">Excerpt:</strong> {blogPost.excerpt}</p> </div>
                         <div> <h3 className="text-lg font-bold mb-2 text-brand-primary">SEO Metadata</h3> <p className="text-sm text-text-secondary"><strong className="text-text-primary">Focus Keyword:</strong> {blogPost.focusKeyword}</p> <p className="text-sm text-text-secondary mt-2"><strong className="text-text-primary">SEO Title:</strong> {blogPost.seoTitle}</p> <p className="text-sm text-text-secondary mt-2"><strong className="text-text-primary">Meta Description:</strong> {blogPost.metaDescription}</p> </div>
                         <div> <h3 className="text-lg font-bold mb-2 text-brand-primary">Taxonomies</h3>
                            <div className="flex flex-wrap gap-2">{blogPost.categories.map((c) => (<span key={c} className="bg-brand-primary/20 text-brand-primary text-xs font-medium px-2.5 py-1 rounded-full">{c}</span>))}</div>
                            <div className="flex flex-wrap gap-2 mt-2">{blogPost.tags.map((t) => (<span key={t} className="bg-gray-700/50 text-text-secondary text-xs font-medium px-2.5 py-1 rounded-full">{t}</span>))}</div>
                         </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};
