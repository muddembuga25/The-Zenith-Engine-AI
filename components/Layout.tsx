
import React, { useState } from 'react';
import { useSite } from '../contexts/SiteContext';
import { LogoIcon, MenuIcon, XIcon, HomeIcon, DocumentTextIcon, LightbulbIcon, ClockIcon, ChartBarIcon, SparklesIcon, LinkIcon, KeyIcon, Cog6ToothIcon, SignOutIcon, SunIcon, MoonIcon } from './Icons';
import type { User, SubscriptionPlan } from '../types';

interface LayoutProps {
    children: React.ReactNode;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    currentUser: User | null;
    handleSignOut: () => void;
    impersonatingUser: User | null;
    planAccess: any;
    theme: 'dark' | 'light';
    toggleTheme: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, currentUser, handleSignOut, impersonatingUser, planAccess, theme, toggleTheme }) => {
    const { sites, selectedSiteId, setSelectedSiteId } = useSite();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const navItems = [
        { id: 'dashboard', label: 'Mission Control', icon: HomeIcon },
        { id: 'content', label: 'Content Hub', icon: DocumentTextIcon },
        { id: 'authority', label: 'Authority Suite', icon: LightbulbIcon, locked: !planAccess.canUseAuthority },
        { id: 'automation', label: 'Automation', icon: ClockIcon, locked: !planAccess.canUseBlogAutomation },
        { id: 'advertising', label: 'Advertising', icon: ChartBarIcon, locked: !planAccess.canUseAdvertising },
        { id: 'branding', label: 'Branding', icon: SparklesIcon },
        { id: 'connections', label: 'Connections', icon: LinkIcon },
        { id: 'analytics', label: 'Analytics', icon: ChartBarIcon, locked: !planAccess.canUseAnalytics },
        { id: 'api-spend', label: 'API & Spend', icon: KeyIcon, mt: true },
        { id: 'settings', label: 'Settings', icon: Cog6ToothIcon },
    ];

    const handleTabClick = (id: string) => {
        setActiveTab(id);
        setIsSidebarOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="h-full w-full flex flex-col md:flex-row bg-app text-main transition-colors duration-300 overflow-hidden">
            {/* Mobile Overlay */}
            {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity" />}

            {/* Sidebar */}
            <aside className={`fixed md:relative z-50 h-full flex flex-col flex-shrink-0 bg-panel border-r border-border transition-all duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} w-64 md:w-20 lg:w-64 md:hover:w-64 group/sidebar`}>
                <div className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-border bg-panel-solid">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <LogoIcon className="h-8 w-8 text-brand-primary flex-shrink-0" />
                        <span className="font-bold text-xl tracking-tight text-main whitespace-nowrap opacity-100 md:opacity-0 lg:opacity-100 group-hover/sidebar:opacity-100 transition-opacity">Zenith</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1 text-sub hover:text-main"><XIcon className="h-6 w-6" /></button>
                </div>

                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    {navItems.map((item) => (
                        <button key={item.id} onClick={() => handleTabClick(item.id)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors relative group ${activeTab === item.id ? 'bg-brand-primary/10 text-brand-primary' : 'text-sub hover:text-main hover:bg-panel-light'} ${item.mt ? 'mt-6' : ''}`}>
                            {activeTab === item.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-brand-primary rounded-r-full" />}
                            <item.icon className={`h-5 w-5 flex-shrink-0 ${activeTab === item.id ? 'text-brand-primary' : 'text-sub group-hover:text-main'}`} />
                            <span className="whitespace-nowrap opacity-100 md:opacity-0 lg:opacity-100 group-hover/sidebar:opacity-100 transition-opacity delay-75">{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-border bg-panel-solid">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="h-9 w-9 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary font-semibold flex-shrink-0 border border-brand-primary/30">
                            {currentUser?.firstName?.[0] || currentUser?.email?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0 opacity-100 md:opacity-0 lg:opacity-100 group-hover/sidebar:opacity-100 transition-opacity">
                            <p className="text-sm font-medium text-main truncate">{currentUser?.firstName || 'User'}</p>
                            <p className="text-xs text-sub truncate">{currentUser?.email}</p>
                        </div>
                        <div className="flex flex-col gap-1 opacity-100 md:opacity-0 lg:opacity-100 group-hover/sidebar:opacity-100 transition-opacity">
                            <button onClick={toggleTheme} className="p-1.5 text-sub hover:text-main hover:bg-panel-light rounded transition-colors">{theme === 'dark' ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}</button>
                            <button onClick={handleSignOut} className="p-1.5 text-sub hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"><SignOutIcon className="h-4 w-4" /></button>
                        </div>
                    </div>
                    {impersonatingUser && <div className="mt-3 px-2 py-1 bg-yellow-900/30 border border-yellow-500/30 rounded text-xs text-yellow-500 text-center opacity-100 md:opacity-0 lg:opacity-100 group-hover/sidebar:opacity-100 transition-opacity">Impersonating</div>}
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 min-w-0 flex flex-col relative h-full bg-app">
                <header className="md:hidden h-16 bg-panel border-b border-border flex items-center justify-between px-4 flex-shrink-0 z-30 sticky top-0">
                    <button onClick={() => setIsSidebarOpen(true)} className="text-sub hover:text-main p-2 -ml-2"><MenuIcon className="h-6 w-6" /></button>
                    <span className="font-bold text-lg text-main">Zenith Engine</span>
                    <div className="w-9 h-9 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary text-sm font-semibold border border-brand-primary/30">{currentUser?.firstName?.[0] || 'U'}</div>
                </header>
                <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth relative">
                    <div className="max-w-7xl mx-auto relative z-10">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};
