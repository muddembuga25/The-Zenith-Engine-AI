
import React, { useState } from 'react';
import type { Site, RssItem } from '../types';
import { WordPressIcon, PenIcon, SparklesIcon, CheckCircleIcon, LightbulbIcon } from './Icons';

interface GettingStartedGuideProps {
    site: Site;
    setActiveTab: (tab: string, subTab?: string | null) => void;
    onGenerate: (topicToTrack: string, generationSource: 'keyword' | 'rss' | 'video' | 'google_sheet', sourceDetails: RssItem | string, site: Site) => Promise<void>;
    setError: (error: string | null) => void;
    onSkipAll: () => void;
}

const GuideStep: React.FC<{
    icon: React.FC<any>;
    title: string;
    description: string;
    isCompleted: boolean;
    isCurrent: boolean;
    isLast: boolean;
    ctaLabel?: string;
    onCtaClick?: () => void;
    onSkipStep?: () => void;
    onSkipAll?: () => void;
}> = ({ icon: Icon, title, description, isCompleted, isCurrent, isLast, ctaLabel, onCtaClick, onSkipStep, onSkipAll }) => {
    const iconContainerClasses = isCompleted
        ? 'bg-green-600/20 border-green-500/30'
        : isCurrent
        ? 'bg-blue-600/20 border-blue-500/30 ring-4 ring-blue-600/20'
        : 'bg-panel-light border-border';

    const iconClasses = isCompleted
        ? 'text-green-400'
        : isCurrent
        ? 'text-blue-300'
        : 'text-text-secondary';
    
    const contentClasses = isCurrent || isCompleted
        ? 'opacity-100'
        : 'opacity-50';

    return (
        <div className="relative pl-16 pb-12">
            {/* Vertical Line */}
            {!isLast && (
                <div className={`absolute left-6 top-6 -bottom-6 w-0.5 ${isCompleted ? 'bg-green-500/50' : 'bg-border'}`} aria-hidden="true" />
            )}

            {/* Icon */}
            <div className={`absolute left-0 top-0 h-12 w-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${iconContainerClasses}`}>
                {isCompleted ? <CheckCircleIcon className="h-7 w-7 text-green-400" /> : <Icon className={`h-6 w-6 ${iconClasses}`} />}
            </div>

            {/* Content */}
            <div className={`transition-opacity duration-300 ${contentClasses}`}>
                <h3 className={`font-bold text-lg ${isCompleted ? 'text-text-tertiary line-through' : 'text-main'}`}>{title}</h3>
                <p className={`text-sm mt-1 ${isCompleted ? 'text-gray-500' : 'text-text-secondary'}`}>{description}</p>
                {isCurrent && (
                    <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        {ctaLabel && onCtaClick && (
                            <button onClick={onCtaClick} className="btn btn-primary animate-subtle-glow">
                                {ctaLabel}
                            </button>
                        )}
                        <div className="flex items-center gap-4">
                            {onSkipStep && (
                                <button onClick={onSkipStep} className="text-sm font-medium text-text-secondary hover:text-main transition-colors">
                                    Skip Step
                                </button>
                            )}
                            {onSkipAll && (
                                <button onClick={onSkipAll} className="text-sm font-medium text-text-secondary hover:text-main transition-colors">
                                    Skip Guide
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


export const GettingStartedGuide: React.FC<GettingStartedGuideProps> = ({ site, setActiveTab, onGenerate, setError, onSkipAll }) => {
    const [skippedSteps, setSkippedSteps] = useState<string[]>([]);

    const wpIsConfigured = !!(site.wordpressUrl && site.wordpressUsername && site.applicationPassword);
    const hasBranding = !!site.brandGuideline?.trim();
    const hasKeywords = site.keywordList.split('\n').some(k => k.trim() && !k.trim().startsWith('[DONE]'));
    const nextKeyword = site.keywordList.split('\n').find(k => k.trim() && !k.trim().startsWith('[DONE]'))?.trim() || null;

    const handleGenerate = () => {
        if (!nextKeyword) {
            setError("No keywords available. Please add keywords in the Content Hub.");
            setActiveTab('content', 'blog');
            return;
        }
        onGenerate(nextKeyword, 'keyword', nextKeyword, site);
    };

    const handleSkipStep = (stepId: string) => {
        setSkippedSteps(prev => [...prev, stepId]);
    };

    const steps = [
        {
            id: 'connect',
            icon: WordPressIcon,
            title: 'Connect to WordPress',
            description: 'Provide your site URL and credentials to enable direct publishing.',
            isComplete: wpIsConfigured,
            ctaLabel: 'Go to Settings',
            onCtaClick: () => setActiveTab('settings'),
        },
        {
            id: 'branding',
            icon: LightbulbIcon,
            title: 'Define Your Brand',
            description: "Tell the AI about your brand's voice, tone, and audience. This is crucial for generating on-brand content.",
            isComplete: hasBranding,
            ctaLabel: 'Go to Branding',
            onCtaClick: () => setActiveTab('branding'),
        },
        {
            id: 'keyword',
            icon: PenIcon,
            title: 'Add a Content Idea',
            description: 'Add your first blog post topic to the Keyword List. This will be the source for your article.',
            isComplete: hasKeywords,
            ctaLabel: 'Go to Content Hub',
            onCtaClick: () => setActiveTab('content', 'blog'),
        },
        {
            id: 'generate',
            icon: SparklesIcon,
            title: 'Generate Your Article',
            description: `You're all set! We'll use the topic "${nextKeyword || '...'}" to create your first article.`,
            isComplete: false, // This is always the action step
            ctaLabel: 'Generate First Article',
            onCtaClick: handleGenerate,
        },
    ];

    const currentStepIndex = steps.findIndex(s => !s.isComplete && !skippedSteps.includes(s.id));
    const effectiveCurrentStepIndex = currentStepIndex === -1 ? steps.length - 1 : currentStepIndex;

    const visibleSteps = steps.slice(0, effectiveCurrentStepIndex + 1);

    return (
        <div className="bg-panel/50 p-6 rounded-2xl border border-border animate-fade-in">
            <h2 className="text-2xl font-bold text-main">Let's Get Your First Post Published!</h2>
            <p className="text-text-secondary mt-1">Follow these steps to get you up and running.</p>
            
            <div className="mt-8">
                {visibleSteps.map((step, index) => (
                    <GuideStep
                        key={step.id}
                        icon={step.icon}
                        title={step.title}
                        description={step.description}
                        isCompleted={step.isComplete}
                        isCurrent={effectiveCurrentStepIndex === index}
                        isLast={index === visibleSteps.length - 1}
                        ctaLabel={step.ctaLabel}
                        onCtaClick={step.onCtaClick}
                        onSkipStep={index < steps.length - 1 ? () => handleSkipStep(step.id) : undefined}
                        onSkipAll={onSkipAll}
                    />
                ))}
            </div>
        </div>
    );
};
