
import React, { useState, useMemo } from 'react';
import { XIcon, DocumentTextIcon, ClockIcon, WordPressIcon, SparklesIcon, PenIcon, LinkIcon, RssIcon, VideoCameraIcon, GoogleIcon, ShareIcon, MailIcon, ChartBarIcon, ScaleIcon, KeyIcon, ChevronDownIcon, MagnifyingGlassIcon } from './Icons';

interface HelpGuideProps {
  onClose: () => void;
}

const Section: React.FC<{ title: string, id: string, children: React.ReactNode }> = ({ title, id, children }) => (
    <div id={id} className="mb-10 scroll-mt-24">
        <h3 className="text-2xl font-bold text-main border-b border-border-subtle pb-3 mb-6">
            {title}
        </h3>
        <div className="prose prose-sm prose-invert max-w-none prose-p:text-text-secondary prose-a:text-brand-primary hover:prose-a:text-brand-primary-hover prose-ul:list-disc prose-ul:ml-5 prose-ol:list-decimal prose-ol:ml-5 prose-code:text-brand-primary prose-code:bg-panel-light prose-code:p-1 prose-code:rounded-md prose-code:font-mono prose-strong:text-text-primary">
            {children}
        </div>
    </div>
);

const FAQItem: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-border-subtle">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center text-left py-4"
            >
                <span className="font-semibold text-text-primary">{title}</span>
                <ChevronDownIcon className={`h-5 w-5 text-text-secondary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="pb-4 animate-fade-in prose prose-sm prose-invert max-w-none">
                    {children}
                </div>
            )}
        </div>
    )
};

const guideContent = [
    {
        id: 'getting-started',
        title: '🚀 Getting Started',
        icon: SparklesIcon,
        keywords: 'connect wordpress add idea generate article publish seo',
        component: () => (
            <Section title="Step-by-Step Guide" id="getting-started-section">
                <p>Welcome to Zenith Engine AI! Follow these steps to go from a simple idea to a fully SEO-optimized, published blog post in minutes.</p>
                <ol>
                    <li><strong>Connect Your Site:</strong> Go to the <strong className="text-brand-primary">Settings</strong> tab. Enter your WordPress URL, Username, and create an Application Password from your WP admin dashboard. Click Verify to confirm the connection.</li>
                    <li><strong>Define Your Brand:</strong> Navigate to the <strong className="text-brand-primary">Branding & Context</strong> tab. Fill out the Brand Guideline. This is crucial for teaching the AI your unique voice, tone, and audience.</li>
                    <li><strong>Add Content Ideas:</strong> Go to the <strong className="text-brand-primary">Content Hub</strong>. In the "Blog Posts" sub-tab, add your topics to the Keyword List, one per line.</li>
                    <li><strong>Generate Your Article:</strong> Click the "Generate Next Post" button. The AI will perform keyword research, create an SEO brief, write the article, and generate an image.</li>
                    <li><strong>Review and Publish:</strong> Once complete, a preview of the article appears. You can edit it if needed, then click "Publish" to send it directly to WordPress.</li>
                </ol>
            </Section>
        )
    },
    {
        id: 'automation',
        title: '⚙️ Automation',
        icon: ClockIcon,
        keywords: 'automation autopilot schedule recurring',
        component: () => (
            <Section title="Setting Up Automation" id="automation-section">
                <p>Zenith Engine AI can run on autopilot, generating and publishing content while you sleep.</p>
                <ul>
                    <li><strong>Triggers:</strong> Choose between "Daily" (runs once a day at a set time) or "Scheduled" (runs on specific days and times).</li>
                    <li><strong>Sources:</strong> Select where the AI gets its topics: Keyword List, RSS Feed, Video Source, or Google Sheet.</li>
                    <li><strong>Workflow:</strong> Choose "Autopilot" for fully hands-off publishing, or "Human Review" to have posts saved as drafts for your approval.</li>
                </ul>
            </Section>
        )
    }
];

export const HelpGuide: React.FC<HelpGuideProps> = ({ onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeSectionId, setActiveSectionId] = useState(guideContent[0].id);

    const filteredContent = useMemo(() => {
        if (!searchQuery) return guideContent;
        return guideContent.filter(item => 
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
            item.keywords.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery]);

    const ActiveComponent = guideContent.find(c => c.id === activeSectionId)?.component || guideContent[0].component;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-panel rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] border border-border flex overflow-hidden animate-modal-pop" onClick={e => e.stopPropagation()}>
                {/* Sidebar */}
                <div className="w-1/3 border-r border-border bg-panel-light flex flex-col">
                    <div className="p-4 border-b border-border">
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search help..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="input-base pl-10 w-full"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {filteredContent.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setActiveSectionId(item.id)}
                                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${activeSectionId === item.id ? 'bg-brand-primary text-white' : 'text-text-secondary hover:bg-panel hover:text-main'}`}
                            >
                                <item.icon className={`h-5 w-5 ${activeSectionId === item.id ? 'text-white' : 'text-gray-500'}`} />
                                {item.title}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col min-w-0">
                    <header className="p-4 border-b border-border flex justify-between items-center bg-panel">
                        <h2 className="font-bold text-main text-lg">Help & Documentation</h2>
                        <button onClick={onClose} className="p-2 text-gray-500 hover:text-white rounded-full"><XIcon className="h-6 w-6"/></button>
                    </header>
                    <div className="flex-1 overflow-y-auto p-8 bg-panel">
                        <ActiveComponent />
                    </div>
                </div>
            </div>
        </div>
    );
};
