
import React, { useState, useMemo, useEffect } from 'react';
import type { Site, RecurringSchedule, LiveBroadcastClip, MetaAsset, LiveBroadcastAutomation, SocialMediaAccount } from '../types';
import { AutomationWorkflow } from '../types';
import { ClockIcon, CalendarDaysIcon, DocumentTextIcon, RssIcon, VideoCameraIcon, ChevronDownIcon, GoogleIcon, SparklesIcon, PenIcon, NewspaperIcon, MailIcon, LightbulbIcon, XIcon, BrainCircuitIcon, BroadcastIcon, ShareIcon, FacebookIcon, YouTubeIcon, TikTokIcon, XIconSocial, CheckCircleIcon, ExclamationTriangleIcon, PhotoIcon, ArrowPathIcon } from './Icons';
import { UpgradePlan } from './UpgradePlan';
import { ScheduleManager } from './ScheduleManager';
import { NextStepGuide } from './NextStepGuide';
import { runScheduler } from '../services/automationService';
import { useToast } from '../hooks/useToast';

interface AutomationDashboardProps {
  site: Site;
  onSiteUpdate: (field: keyof Site, value: any) => void;
  onMultipleSiteUpdates: (updates: Partial<Site>) => void;
  setActiveTab: (tab: string, subTab?: string | null) => void;
  planAccess: any; // Passed from App.tsx
  initialSubTab?: string | null;
  isAgencyContext?: boolean;
}

const timezones: string[] = (() => {
    try {
        return (Intl as any).supportedValuesOf('timeZone');
    } catch (e) {
        return [
            'UTC', 'GMT', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
            'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai',
            'Asia/Dubai', 'Australia/Sydney', 'Pacific/Auckland'
        ];
    }
})();

const planPillClasses: Record<string, string> = {
    creator: 'bg-brand-primary/10 text-brand-primary border border-brand-primary/30',
    pro: 'bg-white/10 text-white border border-white/20',
    agency: 'bg-brand-primary/20 text-brand-primary border border-brand-primary/50',
};

const WorkflowCard: React.FC<{
    title: string;
    description: string;
    icon: React.FC<any>;
    isActive: boolean;
    onClick: () => void;
}> = ({ title, description, icon: Icon, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full text-left p-6 rounded-2xl border transition-all duration-300 group ${
            isActive 
            ? 'border-brand-primary bg-brand-primary/5 shadow-glow' 
            : 'border-border bg-panel hover:border-brand-primary/50'
        }`}
    >
        <div className="flex items-start gap-5">
            <div className={`p-4 rounded-xl border flex-shrink-0 transition-colors ${isActive ? 'bg-brand-primary text-white border-brand-primary' : 'bg-bg-surface-highlight border-border text-text-secondary group-hover:text-white group-hover:border-brand-primary/30'}`}>
                <Icon className="h-6 w-6" />
            </div>
            <div>
                <p className={`font-bold text-lg transition-colors ${isActive ? 'text-brand-primary' : 'text-white group-hover:text-white'}`}>{title}</p>
                <p className="text-sm text-text-secondary mt-1 leading-relaxed">{description}</p>
            </div>
        </div>
    </button>
);

const TabGuide: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => {
    const [isVisible, setIsVisible] = useState(true);
    if (!isVisible) return null;
    return (
        <div className="bg-brand-primary/5 p-5 rounded-2xl border border-brand-primary/20 mb-8 flex items-start gap-4 animate-fade-in relative overflow-hidden">
            <div className="absolute -right-6 -top-6 opacity-[0.03] pointer-events-none">
                <LightbulbIcon className="h-32 w-32 text-brand-primary" />
            </div>
            <div className="p-2 bg-brand-primary/10 rounded-full flex-shrink-0 relative z-10 text-brand-primary">
                <LightbulbIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 pt-0.5 relative z-10">
                <h3 className="font-bold text-white text-lg">{title}</h3>
                <div className="text-sm text-text-secondary mt-1 leading-relaxed">
                    {children}
                </div>
            </div>
            <button 
                onClick={() => setIsVisible(false)} 
                className="p-1.5 text-text-tertiary hover:text-white rounded-full relative z-10 transition-colors hover:bg-white/5"
            >
                <XIcon className="h-5 w-5" />
            </button>
        </div>
    );
};

const ClipCard: React.FC<{ clip?: LiveBroadcastClip; day: string; time: string }> = ({ clip, day, time }) => {
    const statusInfo = {
        pending: { icon: ClockIcon, color: 'text-text-secondary', label: 'Pending' },
        posted: { icon: CheckCircleIcon, color: 'text-brand-primary', label: 'Posted' },
        error: { icon: ExclamationTriangleIcon, color: 'text-white', label: 'Error' },
    };

    const currentStatus = statusInfo[clip?.status || 'pending'];
    const Icon = currentStatus.icon;

    return (
        <div className="bg-bg-surface-highlight p-3 rounded-xl border border-border h-full flex flex-col hover:border-border-highlight transition-colors">
            <div className="flex justify-between items-center mb-2">
                <p className="font-semibold text-white text-sm">{day} <span className="text-xs text-text-secondary font-mono">{time}</span></p>
                {clip && (
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${currentStatus.color}`}>
                        <Icon className="h-3 w-3" />
                        {currentStatus.label}
                    </div>
                )}
            </div>
            {clip && clip.videoUrl ? (
                <div className="flex-grow flex flex-col">
                    <video src={`${clip.videoUrl}&key=${process.env.API_KEY}`} className="w-full aspect-square object-cover rounded-lg bg-black flex-grow border border-border" controls={false} muted loop playsInline />
                    <p className="text-xs text-text-secondary mt-2 line-clamp-2" title={clip.caption}>
                        {clip.caption}
                    </p>
                </div>
            ) : (
                <div className="flex-grow flex items-center justify-center aspect-square bg-panel rounded-lg border border-dashed border-border-highlight">
                    <p className="text-xs text-text-tertiary">{clip?.error ? 'Failed' : 'Empty Slot'}</p>
                </div>
            )}
        </div>
    );
};


export const AutomationDashboard: React.FC<AutomationDashboardProps> = ({ site, onSiteUpdate, onMultipleSiteUpdates, setActiveTab, planAccess, initialSubTab, isAgencyContext }) => {
    const [currentTime, setCurrentTime] = useState('');
    const [isRunningNow, setIsRunningNow] = useState(false);
    const { addToast } = useToast();
    const [activeSubTab, setActiveSubTab] = useState<AutomationWorkflow>(() => {
        if (initialSubTab && Object.values(AutomationWorkflow).includes(initialSubTab as AutomationWorkflow)) {
            return initialSubTab as AutomationWorkflow;
        }
        return AutomationWorkflow.Blog;
    });
    const [newTime, setNewTime] = React.useState('12:00');

    useEffect(() => {
        document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [activeSubTab]);

    const handleRunAutomation = async () => {
        setIsRunningNow(true);
        addToast("Checking all automation schedules...", 'info');
        try {
            await runScheduler();
            // We don't necessarily show success here because jobs might just be queued. 
            // The GlobalAutomationTracker will pick them up.
        } catch (e: any) {
            console.error(e);
            addToast(`Error running automation: ${e.message}`, 'error');
        } finally {
            setIsRunningNow(false);
        }
    };

    const subTabs = [
        { id: AutomationWorkflow.Blog, label: 'Blog Posts', icon: DocumentTextIcon },
        { id: AutomationWorkflow.Social, label: 'Social Media', icon: ShareIcon, plan: 'creator' as const },
        { id: AutomationWorkflow.Live, label: 'Live Production', icon: VideoCameraIcon, plan: 'pro' as const },
        { id: AutomationWorkflow.Email, label: 'Email Marketing', icon: MailIcon, plan: 'pro' as const },
        { id: AutomationWorkflow.Creator, label: 'Creator Studio', icon: BrainCircuitIcon, plan: 'agency' as const },
    ];
    
    const groupedTimezones: Record<string, string[]> = useMemo(() => {
        const special = ['UTC', 'GMT'];
        const regularTimezones = timezones.filter(tz => !special.includes(tz) && tz.includes('/'));
        const grouped = regularTimezones.reduce((acc, tz) => {
            const region = tz.split('/')[0];
            if (!acc[region]) acc[region] = [];
            acc[region].push(tz);
            return acc;
        }, {} as Record<string, string[]>);
        return { 'General': special, ...grouped };
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            try {
                const time = new Date().toLocaleTimeString('en-US', {
                    timeZone: site.automationTimezone,
                    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
                });
                setCurrentTime(time);
            } catch (e) {
                setCurrentTime('Invalid Timezone');
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [site.automationTimezone]);

    const blogSourceOptions: { id: string; label: string; icon: React.FC<any>; color: string }[] = [
        { id: 'keyword', label: 'Keyword List', icon: DocumentTextIcon, color: 'text-brand-primary' },
        { id: 'rss', label: 'RSS Feed', icon: RssIcon, color: 'text-brand-primary' },
        { id: 'video', label: 'Video', icon: VideoCameraIcon, color: 'text-brand-primary' },
        { id: 'google_sheet', label: 'Google Sheet', icon: GoogleIcon, color: 'text-brand-primary' },
        { id: 'agency_agent', label: 'Agency Agent', icon: BrainCircuitIcon, color: 'text-brand-primary' },
    ];
    const emailSourceOptions: { id: string; label: string; icon: React.FC<any>; color: string }[] = [ ...blogSourceOptions, { id: 'newly_published_post', label: 'New Post', icon: NewspaperIcon, color: 'text-brand-primary' }];
    const socialSourceOptions: { id: string; label: string; icon: React.FC<any>; color: string }[] = [
        { id: 'keyword', label: 'Keyword', icon: DocumentTextIcon, color: 'text-brand-primary' },
        { id: 'rss', label: 'RSS', icon: RssIcon, color: 'text-brand-primary' },
        { id: 'video', label: 'Video', icon: VideoCameraIcon, color: 'text-brand-primary' },
        { id: 'google_sheet', label: 'Sheet', icon: GoogleIcon, color: 'text-brand-primary' },
        { id: 'agency_agent', label: 'Agent', icon: BrainCircuitIcon, color: 'text-brand-primary' },
        { id: 'newly_published_post', label: 'New Post', icon: NewspaperIcon, color: 'text-brand-primary' },
    ];

    const areSocialsConnected = useMemo(() => {
        if (!site) return false;
        return Object.values(site.socialMediaSettings).some(accounts => Array.isArray(accounts) && accounts.some(acc => acc.isConnected));
    }, [site]);

    // Live Production Logic...
    const automation: LiveBroadcastAutomation = site.liveBroadcastAutomation || { isEnabled: false, sourceType: 'meta', facebookPageId: '', facebookPageUrl: '', youtubeChannelUrl: '', tiktokProfileUrl: '', xProfileUrl: '', scheduleType: 'monitor', broadcastDay: 0, broadcastStartTime: '10:00', broadcastEndTime: '12:00', dailyPostTimes: ['09:00', '17:00'], status: 'idle', currentWeekClips: [], youtubeSourceMethod: 'url', tiktokSourceMethod: 'url', xSourceMethod: 'url' };
    
    const metaConnection = site.socialMediaSettings?.meta?.[0];
    const facebookPages: MetaAsset[] = (metaConnection && Array.isArray(metaConnection.assets)) 
        ? metaConnection.assets.filter(a => a.platform === 'facebook') 
        : [];
    
    const youtubeAccounts = (site.socialMediaSettings?.youtube || []).filter(a => a.isConnected);
    const tiktokAccounts = (site.socialMediaSettings?.tiktok || []).filter(a => a.isConnected);
    const xAccounts = (site.socialMediaSettings?.twitter || []).filter(a => a.isConnected);
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    const handleLiveAutomationUpdate = (field: keyof typeof automation, value: any) => { onSiteUpdate('liveBroadcastAutomation', { ...automation, [field]: value }); };
    
    // Safety check for dailyPostTimes
    const postTimes: string[] = Array.isArray(automation.dailyPostTimes) ? automation.dailyPostTimes : [];

    const handleAddTime = () => { if (newTime && !postTimes.includes(newTime)) { handleLiveAutomationUpdate('dailyPostTimes', [...postTimes, newTime].sort()); } };
    const handleRemoveTime = (timeToRemove: string) => { handleLiveAutomationUpdate('dailyPostTimes', postTimes.filter(t => t !== timeToRemove)); };

    const renderSourceInputs = () => {
        switch (automation.sourceType) {
            case 'meta':
                return facebookPages.length > 0 ? (
                    <select value={automation.facebookPageId} onChange={e => handleLiveAutomationUpdate('facebookPageId', e.target.value)} className="input-base w-full">
                        <option value="">Select a Facebook Page...</option>
                        {facebookPages.map((page) => <option key={page.id} value={page.id}>{page.name}</option>)}
                    </select>
                ) : (
                    <div className="mt-2 p-4 bg-panel rounded-lg border border-border-subtle flex items-center justify-between">
                        <p className="text-sm text-yellow-300">No Meta account with Facebook pages found.</p>
                        <button onClick={() => setActiveTab('connections')} className="btn btn-secondary text-sm">Connect Meta</button>
                    </div>
                );
            case 'facebook_url':
                return (
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><FacebookIcon className="h-5 w-5 text-gray-400" /></div>
                        <input id="fb-url" type="url" value={automation.facebookPageUrl} onChange={e => handleLiveAutomationUpdate('facebookPageUrl', e.target.value)} placeholder="https://www.facebook.com/YourPage" className="input-base w-full pl-10" />
                        <p className="text-xs text-text-secondary mt-1.5 pl-1">Provide URL to Facebook Page.</p>
                    </div>
                );
            case 'youtube': case 'tiktok': case 'x':
                const platform = automation.sourceType;
                const sourceMethod = (automation as any)[`${platform}SourceMethod`] || 'url';
                const accounts: SocialMediaAccount[] = platform === 'youtube' ? youtubeAccounts : platform === 'tiktok' ? tiktokAccounts : xAccounts;
                const accountId = (automation as any)[`${platform}AccountId`] || '';
                const profileUrl = (automation as any)[platform === 'youtube' ? 'youtubeChannelUrl' : platform === 'tiktok' ? 'tiktokProfileUrl' : 'xProfileUrl'] || '';
                const Icon = platform === 'youtube' ? YouTubeIcon : platform === 'tiktok' ? TikTokIcon : XIconSocial;

                return (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 bg-bg-surface-highlight rounded-lg p-1 w-full border border-border">
                            <button onClick={() => handleLiveAutomationUpdate(`${platform}SourceMethod` as any, 'account')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${sourceMethod === 'account' ? 'bg-brand-primary text-white shadow-md' : 'text-text-secondary hover:text-white'}`}>Connected Account</button>
                            <button onClick={() => handleLiveAutomationUpdate(`${platform}SourceMethod` as any, 'url')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${sourceMethod === 'url' ? 'bg-brand-primary text-white shadow-md' : 'text-text-secondary hover:text-white'}`}>Profile URL</button>
                        </div>
                        {sourceMethod === 'account' ? (
                            accounts.length > 0 ? (
                                <select value={accountId} onChange={e => handleLiveAutomationUpdate(`${platform}AccountId` as any, e.target.value)} className="input-base w-full">
                                    <option value="">Select a connected account...</option>
                                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                </select>
                            ) : (
                                <div className="p-4 bg-panel rounded-lg border border-border-subtle flex items-center justify-between">
                                    <p className="text-sm text-yellow-300">No connected {platform} accounts found.</p>
                                    <button onClick={() => setActiveTab('connections')} className="btn btn-secondary text-sm">Connect</button>
                                </div>
                            )
                        ) : (
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><Icon className="h-5 w-5 text-gray-400" /></div>
                                <input type="url" value={profileUrl} onChange={e => handleLiveAutomationUpdate(platform === 'youtube' ? 'youtubeChannelUrl' : platform === 'tiktok' ? 'tiktokProfileUrl' : 'xProfileUrl', e.target.value)} placeholder={`https://${platform}.com/@YourProfile`} className="input-base w-full pl-10" />
                            </div>
                        )}
                    </div>
                );
            default: return null;
        }
    }

    const handleBlogSourceUpdate = (source: any) => {
        const keyToUpdate = site.automationTrigger === 'daily' ? 'dailyGenerationSource' : 'scheduleGenerationSource';
        onSiteUpdate(keyToUpdate, source);
    };

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <TabGuide title="Configure Autopilot Protocols">
                <p>Direct your Senior AI Engineer. Set the strategic parameters for blog, social, and live automation, and let the engine execute complex GEO workflows 24/7.</p>
            </TabGuide>
            <div className="premium-panel p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Automation Workflows</h2>
                    <p className="text-text-secondary mt-1">Configure your hands-free content engine.</p>
                </div>
                <button 
                    onClick={handleRunAutomation} 
                    disabled={isRunningNow}
                    className="btn btn-primary flex items-center gap-2 px-4 py-2 shadow-lg shadow-brand-primary/20"
                >
                    {isRunningNow ? (
                        <><svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Checking Schedules...</>
                    ) : (
                        <><ArrowPathIcon className="h-5 w-5" /> Run Automation Now</>
                    )}
                </button>
            </div>
            
            <div className="border-b border-border">
                <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                    {subTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveSubTab(tab.id)}
                            className={`${ activeSubTab === tab.id ? 'border-brand-primary text-brand-primary' : 'border-transparent text-text-secondary hover:text-white hover:border-gray-500' } flex items-center gap-2 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}
                        >
                            <tab.icon className="h-5 w-5" /> {tab.label}
                            {!isAgencyContext && tab.plan && (
                                <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${planPillClasses[tab.plan]}`}>
                                    {tab.plan}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
            </div>

            {activeSubTab === AutomationWorkflow.Blog && (
                 <div className="p-6 premium-panel animate-fade-in">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-white">Blog Automation Status</h3>
                        <div className="flex items-center gap-3">
                            <span className={`text-sm font-semibold ${site.isAutomationEnabled ? 'text-brand-primary' : 'text-text-secondary'}`}>{site.isAutomationEnabled ? 'Enabled' : 'Disabled'}</span>
                            <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={site.isAutomationEnabled} onChange={e => onSiteUpdate('isAutomationEnabled', e.target.checked)} /><div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div></label>
                        </div>
                    </div>
                    {site.isAutomationEnabled && (
                        <div className="pt-6 border-t border-border animate-fade-in space-y-8">
                            <div className="flex items-center justify-between p-4 bg-bg-surface-highlight rounded-xl border border-border">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary"><BroadcastIcon className="h-6 w-6" /></div>
                                    <div>
                                        <label htmlFor="omnipresence-automation" className="font-semibold text-white cursor-pointer">Omnipresence Campaign</label>
                                        <p className="text-xs text-text-secondary mt-1">Automatically generate social media assets after publishing.</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer"><input id="omnipresence-automation" type="checkbox" className="sr-only peer" checked={site.isOmnipresenceAutomationEnabled ?? false} onChange={e => onSiteUpdate('isOmnipresenceAutomationEnabled', e.target.checked)} /><div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div></label>
                            </div>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                                <div className="lg:col-span-2 space-y-6">
                                    <div>
                                        <h4 className="font-semibold text-white mb-4">1. Workflow Mode</h4>
                                        <div className="space-y-4"><WorkflowCard title="Autopilot" description="AI generates & publishes content automatically." icon={SparklesIcon} isActive={site.isAutoPublishEnabled} onClick={() => onSiteUpdate('isAutoPublishEnabled', true)} /><WorkflowCard title="Human Review" description="AI saves drafts for your approval." icon={PenIcon} isActive={!site.isAutoPublishEnabled} onClick={() => onSiteUpdate('isAutoPublishEnabled', false)} /></div>
                                    </div>
                                </div>
                                <div className="lg:col-span-3 space-y-6">
                                    <div>
                                        <h4 className="font-semibold text-white mb-4">2. Trigger</h4>
                                        <div className="grid grid-cols-2 gap-3 bg-bg-surface-highlight rounded-xl p-1.5 w-full max-w-md border border-border"><button onClick={() => onSiteUpdate('automationTrigger', 'daily')} className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${site.automationTrigger === 'daily' ? 'bg-brand-primary text-white shadow-md' : 'text-text-secondary hover:text-white'}`}><ClockIcon className="h-5 w-5" /> Daily</button><button onClick={() => onSiteUpdate('automationTrigger', 'schedule')} className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${site.automationTrigger === 'schedule' ? 'bg-brand-primary text-white shadow-md' : 'text-text-secondary hover:text-white'}`}><CalendarDaysIcon className="h-5 w-5" /> Scheduled</button></div>
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-white">3. Content Source</h4>
                                        <div className="bg-bg-surface-highlight rounded-xl p-2 grid grid-cols-3 md:grid-cols-5 gap-2 border border-border">
                                            {blogSourceOptions.map(opt => (<button key={opt.id} onClick={() => handleBlogSourceUpdate(opt.id as any)} className={`px-2 py-3 text-xs font-semibold rounded-lg transition-colors flex flex-col items-center justify-center gap-2 ${(site.automationTrigger === 'daily' ? site.dailyGenerationSource : site.scheduleGenerationSource) === opt.id ? 'bg-brand-primary text-white shadow-sm' : 'text-text-secondary hover:text-white hover:bg-white/5'}`}><opt.icon className={`h-5 w-5 ${ (site.automationTrigger === 'daily' ? site.dailyGenerationSource : site.scheduleGenerationSource) !== opt.id ? opt.color : ''}`} /> {opt.label}</button>))}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="font-semibold text-white">4. Timing & Timezone</h4>
                                            <div className="flex items-center gap-2">
                                                 <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse"></div>
                                                 <span className="text-xs font-mono text-text-secondary">{currentTime}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-panel-light p-4 rounded-xl border border-border mb-4">
                                            <label className="block text-xs font-medium text-text-secondary mb-2">Time Zone</label>
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <select 
                                                        value={site.automationTimezone} 
                                                        onChange={(e) => onSiteUpdate('automationTimezone', e.target.value)} 
                                                        className="input-base text-sm py-2 pl-3 pr-8 w-full"
                                                    >
                                                        {Object.entries(groupedTimezones).map(([region, tzs]) => (
                                                            <optgroup key={region} label={region}>
                                                                {(tzs as string[]).map(tz => <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>)}
                                                            </optgroup>
                                                        ))}
                                                    </select>
                                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-secondary">
                                                        <ChevronDownIcon className="h-4 w-4" />
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => onSiteUpdate('automationTimezone', Intl.DateTimeFormat().resolvedOptions().timeZone)}
                                                    className="btn btn-secondary text-xs whitespace-nowrap px-3"
                                                    title="Use my local time"
                                                >
                                                    Use Local
                                                </button>
                                            </div>
                                        </div>

                                        {site.automationTrigger === 'daily' ? ( 
                                            <div className="p-5 bg-panel-light rounded-xl border border-border">
                                                <label htmlFor="autopilot-time" className="block text-sm font-medium text-text-primary">Daily Start Time</label>
                                                <div className="mt-3">
                                                    <input id="autopilot-time" type="time" value={site.automationDailyTime} onChange={(e) => onSiteUpdate('automationDailyTime', e.target.value)} className="input-base px-4 py-2.5 w-full" />
                                                </div>
                                            </div>
                                        ) : ( 
                                            <ScheduleManager 
                                                schedules={(site.recurringSchedules as RecurringSchedule[]) || []} 
                                                onAdd={(s) => onSiteUpdate('recurringSchedules', [...(site.recurringSchedules || []), { ...s, id: crypto.randomUUID(), isEnabled: true }])} 
                                                onDelete={(id) => onSiteUpdate('recurringSchedules', (site.recurringSchedules || []).filter(s => s.id !== id))} 
                                                onToggle={(id, e) => onSiteUpdate('recurringSchedules', (site.recurringSchedules || []).map((s: RecurringSchedule) => s.id === id ? { ...s, isEnabled: e } : s))} 
                                            /> 
                                        )}
                                    </div>
                                </div>
                            </div>
                            {site.isAutomationEnabled && <NextStepGuide label="Automate Your Social Media" description="Your blog is on autopilot. Now, let's automate your social media graphics and videos." onClick={() => setActiveSubTab(AutomationWorkflow.Social)} />}
                        </div>
                    )}
                </div>
            )}
            
            {activeSubTab === AutomationWorkflow.Social && (
                <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {!planAccess.canUseSocialAutomation ? <div className="lg:col-span-2"><UpgradePlan featureName="Social Automation" requiredPlan="Creator" setActiveTab={setActiveTab} /></div> : (
                        <>
                            {/* Graphics */}
                            <div className="premium-panel p-6 flex flex-col">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-xl bg-brand-primary/10 text-brand-primary shadow-glow"><PhotoIcon className="h-6 w-6" /></div>
                                        <div><h3 className="text-xl font-bold text-white">Social Graphics</h3><p className="text-sm text-text-secondary">Automate branded images.</p></div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={site.isSocialGraphicAutomationEnabled} onChange={e => onSiteUpdate('isSocialGraphicAutomationEnabled', e.target.checked)} /><div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div></label>
                                </div>
                                {site.isSocialGraphicAutomationEnabled && (<div className="space-y-6 animate-fade-in flex-grow flex flex-col pt-4 border-t border-border">
                                    <div><label className="block text-sm font-medium text-white mb-3">Workflow</label><div className="space-y-3"><WorkflowCard title="Autopilot" description="AI generates and publishes automatically." icon={SparklesIcon} isActive={site.isSocialGraphicAutoPublishEnabled ?? true} onClick={() => onSiteUpdate('isSocialGraphicAutoPublishEnabled', true)} /><WorkflowCard title="Human Review" description="AI saves drafts for approval." icon={PenIcon} isActive={!(site.isSocialGraphicAutoPublishEnabled ?? true)} onClick={() => onSiteUpdate('isSocialGraphicAutoPublishEnabled', false)} /></div></div>
                                    <div><label className="block text-sm font-medium text-white mb-3">Content Source</label><div className="grid grid-cols-3 sm:grid-cols-6 gap-2 bg-bg-surface-highlight rounded-xl p-1.5 border border-border">{socialSourceOptions.map(opt => (<button key={opt.id} onClick={() => onSiteUpdate('socialGraphicGenerationSource', opt.id)} className={`px-1 py-2 text-[10px] sm:text-xs font-semibold rounded-lg transition-colors flex flex-col items-center justify-center gap-1 ${site.socialGraphicGenerationSource === opt.id ? 'bg-brand-primary text-white shadow-sm' : 'text-text-secondary hover:text-white hover:bg-white/5'}`}><opt.icon className={`h-4 w-4 ${site.socialGraphicGenerationSource !== opt.id ? opt.color : ''}`} /> {opt.label}</button>))}</div></div>
                                    {/* Trigger & Time UI simplified for brevity but styled similarly */}
                                </div>)}
                            </div>
                            {/* Videos */}
                            <div className="premium-panel p-6 flex flex-col">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-xl bg-brand-primary/10 text-brand-primary shadow-glow"><VideoCameraIcon className="h-6 w-6" /></div>
                                        <div><h3 className="text-xl font-bold text-white">Social Videos</h3><p className="text-sm text-text-secondary">Automate video production.</p></div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={site.isSocialVideoAutomationEnabled} onChange={e => onSiteUpdate('isSocialVideoAutomationEnabled', e.target.checked)} /><div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div></label>
                                </div>
                                {site.isSocialVideoAutomationEnabled && (<div className="space-y-6 animate-fade-in flex-grow flex flex-col pt-4 border-t border-border">
                                    <div><label className="block text-sm font-medium text-white mb-3">Workflow</label><div className="space-y-3"><WorkflowCard title="Autopilot" description="AI generates and publishes automatically." icon={SparklesIcon} isActive={site.isSocialVideoAutoPublishEnabled ?? true} onClick={() => onSiteUpdate('isSocialVideoAutoPublishEnabled', true)} /><WorkflowCard title="Human Review" description="AI saves drafts for approval." icon={PenIcon} isActive={!(site.isSocialVideoAutoPublishEnabled ?? true)} onClick={() => onSiteUpdate('isSocialVideoAutoPublishEnabled', false)} /></div></div>
                                    {/* Source UI repeated */}
                                </div>)}
                            </div>
                            {(site.isSocialGraphicAutomationEnabled || site.isSocialVideoAutomationEnabled) && !areSocialsConnected && (
                                <div className="lg:col-span-2"><NextStepGuide label="Connect Your Social Accounts" description="Your social automations are set up, but you need to connect your accounts." onClick={() => setActiveTab('connections')} /></div>
                            )}
                        </>
                    )}
                </div>
            )}

            {activeSubTab === AutomationWorkflow.Live && (
                <div className="p-6 premium-panel animate-fade-in">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-brand-primary/10 rounded-xl text-brand-primary shadow-glow"><VideoCameraIcon className="h-6 w-6" /></div>
                            <div><h3 className="text-lg font-bold text-white">Live Broadcast Automation</h3><p className="text-sm text-text-secondary">Repurpose live streams from social media.</p></div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`text-sm font-semibold ${automation.isEnabled ? 'text-brand-primary' : 'text-text-secondary'}`}>{automation.isEnabled ? 'Active' : 'Inactive'}</span>
                            <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={automation.isEnabled} onChange={e => handleLiveAutomationUpdate('isEnabled', e.target.checked)} /><div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div></label>
                        </div>
                    </div>
                    {automation.isEnabled && (
                        <div className="pt-6 border-t border-border animate-fade-in space-y-8">
                            {!planAccess.canUseLiveProduction ? <UpgradePlan featureName="Live Production" requiredPlan="Pro" setActiveTab={setActiveTab} /> : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div>
                                            <h4 className="font-semibold text-white mb-4">1. Source Stream</h4>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-text-secondary mb-2">Platform</label>
                                                    <select value={automation.sourceType} onChange={e => handleLiveAutomationUpdate('sourceType', e.target.value)} className="input-base w-full">
                                                        <option value="meta">Meta (Facebook/Instagram)</option>
                                                        <option value="facebook_url">Facebook Page URL</option>
                                                        <option value="youtube">YouTube</option>
                                                        <option value="tiktok">TikTok</option>
                                                        <option value="x">X (Twitter)</option>
                                                    </select>
                                                </div>
                                                {renderSourceInputs()}
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-white mb-4">2. Monitor Schedule</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-text-secondary mb-2">Broadcast Day</label>
                                                    <select value={automation.broadcastDay} onChange={e => handleLiveAutomationUpdate('broadcastDay', parseInt(e.target.value))} className="input-base w-full">
                                                        {daysOfWeek.map((day, i) => <option key={i} value={i}>{day}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <p className="text-xs text-text-secondary mt-2">The system will check for a completed live video on this day.</p>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-white mb-4">3. Distribution Schedule</h4>
                                            <p className="text-xs text-text-secondary mb-3">When should the generated clips be posted?</p>
                                            <div className="flex gap-2 mb-3">
                                                <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="input-base" />
                                                <button onClick={handleAddTime} className="btn btn-secondary text-xs">Add Time</button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {postTimes.map((time) => (
                                                    <span key={time} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-panel border border-border text-text-primary">
                                                        {time} <button onClick={() => handleRemoveTime(time)} className="hover:text-red-400"><XIcon className="h-3 w-3" /></button>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-panel-light rounded-xl border border-border overflow-hidden flex flex-col">
                                        <div className="p-4 border-b border-border bg-panel flex justify-between items-center">
                                            <h4 className="font-bold text-white">This Week's Clips</h4>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${automation.status === 'processing' ? 'bg-yellow-500/20 text-yellow-300 animate-pulse' : 'bg-gray-700 text-gray-400'}`}>{automation.status.toUpperCase()}</span>
                                        </div>
                                        <div className="flex-1 p-4 overflow-y-auto max-h-[500px]">
                                            {automation.currentWeekClips.length === 0 ? (
                                                <div className="h-full flex flex-col items-center justify-center text-text-tertiary">
                                                    <VideoCameraIcon className="h-12 w-12 mb-2 opacity-20" />
                                                    <p>No clips generated yet.</p>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-4">
                                                    {daysOfWeek.map((day, index) => (
                                                        <React.Fragment key={day}>
                                                            {postTimes.map((time) => {
                                                                const clip = automation.currentWeekClips?.find(c => c.scheduledDay === index && c.scheduledTime === time);
                                                                return (
                                                                    <div key={`${day}-${time}`} className="aspect-square">
                                                                        <ClipCard clip={clip} day={day.substring(0, 3)} time={time} />
                                                                    </div>
                                                                );
                                                            })}
                                                        </React.Fragment>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {activeSubTab === AutomationWorkflow.Email && (
                <div className="p-6 premium-panel animate-fade-in">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-white">Email Marketing Automation</h3>
                        <div className="flex items-center gap-3">
                            <span className={`text-sm font-semibold ${site.isEmailMarketingAutomationEnabled ? 'text-brand-primary' : 'text-text-secondary'}`}>{site.isEmailMarketingAutomationEnabled ? 'Enabled' : 'Disabled'}</span>
                            <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={site.isEmailMarketingAutomationEnabled} onChange={e => onSiteUpdate('isEmailMarketingAutomationEnabled', e.target.checked)} /><div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div></label>
                        </div>
                    </div>
                    {site.isEmailMarketingAutomationEnabled && (
                        <div className="pt-6 border-t border-border animate-fade-in space-y-8">
                            {!planAccess.canUseEmailMarketing ? <UpgradePlan featureName="Email Automation" requiredPlan="Pro" setActiveTab={setActiveTab} /> : (
                                <>
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-white">1. Content Source</h4>
                                        <div className="bg-bg-surface-highlight rounded-xl p-2 grid grid-cols-3 sm:grid-cols-6 gap-2 border border-border">
                                            {emailSourceOptions.map(opt => (<button key={opt.id} onClick={() => onSiteUpdate('emailMarketingGenerationSource', opt.id)} className={`px-2 py-3 text-xs font-semibold rounded-lg transition-colors flex flex-col items-center justify-center gap-2 ${site.emailMarketingGenerationSource === opt.id ? 'bg-brand-primary text-white shadow-sm' : 'text-text-secondary hover:text-white hover:bg-white/5'}`}><opt.icon className={`h-5 w-5 ${site.emailMarketingGenerationSource !== opt.id ? opt.color : ''}`} /> {opt.label}</button>))}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-white mb-4">2. Schedule</h4>
                                        {/* Simplified schedule UI for email, similar to blog */}
                                        <div className="grid grid-cols-2 gap-3 bg-bg-surface-highlight rounded-xl p-1.5 w-full max-w-md border border-border mb-4"><button onClick={() => onSiteUpdate('emailMarketingAutomationTrigger', 'daily')} className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${site.emailMarketingAutomationTrigger === 'daily' ? 'bg-brand-primary text-white shadow-md' : 'text-text-secondary hover:text-white'}`}><ClockIcon className="h-5 w-5" /> Daily</button><button onClick={() => onSiteUpdate('emailMarketingAutomationTrigger', 'schedule')} className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${site.emailMarketingAutomationTrigger === 'schedule' ? 'bg-brand-primary text-white shadow-md' : 'text-text-secondary hover:text-white'}`}><CalendarDaysIcon className="h-5 w-5" /> Scheduled</button></div>
                                        {site.emailMarketingAutomationTrigger === 'daily' ? (
                                            <div className="p-5 bg-panel-light rounded-xl border border-border">
                                                <label className="block text-sm font-medium text-text-primary">Send Time</label>
                                                <input type="time" value={site.emailMarketingDailyTime} onChange={(e) => onSiteUpdate('emailMarketingDailyTime', e.target.value)} className="input-base px-4 py-2.5 w-full mt-3" />
                                            </div>
                                        ) : (
                                            <ScheduleManager schedules={(site.emailMarketingRecurringSchedules as RecurringSchedule[]) || []} onAdd={(s) => onSiteUpdate('emailMarketingRecurringSchedules', [...(site.emailMarketingRecurringSchedules || []), { ...s, id: crypto.randomUUID(), isEnabled: true }])} onDelete={(id) => onSiteUpdate('emailMarketingRecurringSchedules', (site.emailMarketingRecurringSchedules || []).filter(s => s.id !== id))} onToggle={(id, e) => onSiteUpdate('emailMarketingRecurringSchedules', (site.emailMarketingRecurringSchedules || []).map((s: RecurringSchedule) => s.id === id ? { ...s, isEnabled: e } : s))} />
                                        )}
                                    </div>
                                    {!site.mailchimpSettings?.isConnected && (
                                        <NextStepGuide label="Connect Mailchimp" description="You need to connect a Mailchimp account to send emails." onClick={() => setActiveTab('connections')} />
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            {activeSubTab === AutomationWorkflow.Creator && (
                <div className="p-6 premium-panel animate-fade-in">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-white">Creator Studio Automation</h3>
                        <div className="flex items-center gap-3">
                            <span className={`text-sm font-semibold ${site.isCreatorStudioAutomationEnabled ? 'text-brand-primary' : 'text-text-secondary'}`}>{site.isCreatorStudioAutomationEnabled ? 'Enabled' : 'Disabled'}</span>
                            <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={site.isCreatorStudioAutomationEnabled ?? false} onChange={e => onSiteUpdate('isCreatorStudioAutomationEnabled', e.target.checked)} /><div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div></label>
                        </div>
                    </div>
                    {site.isCreatorStudioAutomationEnabled && (
                        <div className="pt-6 border-t border-border animate-fade-in space-y-8">
                            {!planAccess.canUseClientManagement ? <UpgradePlan featureName="Creator Studio" requiredPlan="Agency" setActiveTab={setActiveTab} /> : (
                                <>
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-white">1. Prompt List</h4>
                                        <p className="text-sm text-text-secondary mb-2">Provide a list of creative prompts. The studio will pick one, generate a script, storyboard, and video.</p>
                                        <textarea value={site.creatorStudioPromptList || ''} onChange={e => onSiteUpdate('creatorStudioPromptList', e.target.value)} className="input-base w-full p-4 h-32" placeholder="Enter prompts, one per line..." />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-white mb-4">2. Schedule</h4>
                                        {/* Simplified schedule UI for Creator */}
                                        <div className="grid grid-cols-2 gap-3 bg-bg-surface-highlight rounded-xl p-1.5 w-full max-w-md border border-border mb-4"><button onClick={() => onSiteUpdate('creatorStudioAutomationTrigger', 'daily')} className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${site.creatorStudioAutomationTrigger === 'daily' ? 'bg-brand-primary text-white shadow-md' : 'text-text-secondary hover:text-white'}`}><ClockIcon className="h-5 w-5" /> Daily</button><button onClick={() => onSiteUpdate('creatorStudioAutomationTrigger', 'schedule')} className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${site.creatorStudioAutomationTrigger === 'schedule' ? 'bg-brand-primary text-white shadow-md' : 'text-text-secondary hover:text-white'}`}><CalendarDaysIcon className="h-5 w-5" /> Scheduled</button></div>
                                        {site.creatorStudioAutomationTrigger === 'daily' ? (
                                            <div className="p-5 bg-panel-light rounded-xl border border-border">
                                                <label className="block text-sm font-medium text-text-primary">Run Time</label>
                                                <input type="time" value={site.creatorStudioDailyTime} onChange={(e) => onSiteUpdate('creatorStudioDailyTime', e.target.value)} className="input-base px-4 py-2.5 w-full mt-3" />
                                            </div>
                                        ) : (
                                            <ScheduleManager schedules={(site.creatorStudioRecurringSchedules as RecurringSchedule[]) || []} onAdd={(s) => onSiteUpdate('creatorStudioRecurringSchedules', [...(site.creatorStudioRecurringSchedules || []), { ...s, id: crypto.randomUUID(), isEnabled: true }])} onDelete={(id) => onSiteUpdate('creatorStudioRecurringSchedules', (site.creatorStudioRecurringSchedules || []).filter(s => s.id !== id))} onToggle={(id, e) => onSiteUpdate('creatorStudioRecurringSchedules', (site.creatorStudioRecurringSchedules || []).map((s: RecurringSchedule) => s.id === id ? { ...s, isEnabled: e } : s))} />
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-bg-surface-highlight rounded-xl border border-border">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary"><SparklesIcon className="h-6 w-6" /></div>
                                            <div>
                                                <label htmlFor="creator-autopublish" className="font-semibold text-white cursor-pointer">Auto-Publish to Socials</label>
                                                <p className="text-xs text-text-secondary mt-1">Automatically post generated videos to connected accounts.</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer"><input id="creator-autopublish" type="checkbox" className="sr-only peer" checked={site.creatorStudioAutoPublishEnabled ?? false} onChange={e => onSiteUpdate('creatorStudioAutoPublishEnabled', e.target.checked)} /><div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div></label>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};