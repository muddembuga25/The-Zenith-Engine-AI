
import React, { useState, useEffect, useMemo } from 'react';
import { SiteProvider, useSite } from './contexts/SiteContext';
import { Layout } from './components/Layout';
import { AppRouter } from './components/AppRouter';
import { AuthPage } from './components/AuthPage';
import { OnboardingWizard } from './components/OnboardingWizard';
import { AdminDashboard } from './components/AdminDashboard';
import { GlobalAutomationTracker } from './components/GlobalAutomationTracker';
import * as authService from './services/authService';
import { useToast } from './hooks/useToast';
import type { User, SubscriptionPlan } from './types';

// Separate component to consume SiteContext
const AppContent: React.FC<{
    currentUser: User;
    impersonatingUser: User | null;
    handleSignOut: () => void;
    toggleTheme: () => void;
    theme: 'dark' | 'light';
    handleUpdatePlan: (plan: SubscriptionPlan, cycle?: 'monthly' | 'yearly') => Promise<void>;
    setCurrentUser: (user: User) => void;
    setImpersonatingUser: (user: User | null) => void;
}> = ({ currentUser, impersonatingUser, handleSignOut, toggleTheme, theme, handleUpdatePlan, setCurrentUser, setImpersonatingUser }) => {
    const { sites, addNewSite } = useSite();
    const [isOnboarding, setIsOnboarding] = useState(false);
    const [activeTab, setActiveTabState] = useState('dashboard');
    const [activeSubTab, setActiveSubTab] = useState<string | null>(null);
    const toast = useToast();

    // Determine onboarding status based on plan and sites
    useEffect(() => {
        if (!currentUser.isAdmin && !impersonatingUser) {
            // User needs onboarding if they have no plan AND no sites
            // (Assuming 'free' plan is default, we mostly check for sites)
            if (sites.length === 0 && !currentUser.subscriptionPlan) {
                setIsOnboarding(true);
            } else {
                setIsOnboarding(false);
            }
        } else {
            setIsOnboarding(false);
        }
    }, [currentUser, impersonatingUser, sites.length]);

    const setActiveTab = (tab: string, subTab: string | null = null) => {
        setActiveTabState(tab);
        setActiveSubTab(subTab);
    };

    // --- Permissions Logic ---
    const planAccess = useMemo(() => {
        const plan = currentUser?.subscriptionPlan || 'free';
        const planLevels: Record<SubscriptionPlan, number> = { free: 0, creator: 1, pro: 2, agency: 3 };
        const currentLevel = planLevels[plan];
        return {
            plan,
            canUseAnalytics: currentLevel >= 1,
            canUseAuthority: currentLevel >= 2,
            canUseAdvertising: currentLevel >= 2,
            canUseBlogAutomation: currentLevel >= 0,
            canUseSocialAutomation: currentLevel >= 1,
            siteLimit: plan === 'free' ? 1 : plan === 'creator' ? 1 : plan === 'pro' ? 10 : Infinity,
            generationLimit: plan === 'free' ? 2 : plan === 'creator' ? 50 : plan === 'pro' ? 200 : Infinity,
            generationsUsed: currentUser?.monthlyGenerations?.count || 0,
            canGenerate: !!currentUser?.isAdmin || (currentUser?.monthlyGenerations?.count || 0) < (plan === 'free' ? 2 : plan === 'creator' ? 50 : plan === 'pro' ? 200 : Infinity)
        };
    }, [currentUser]);

    const handleImpersonate = (user: User) => {
        setImpersonatingUser(currentUser);
        setCurrentUser(user);
    };

    if (currentUser.isAdmin && !impersonatingUser) {
        return <AdminDashboard currentUser={currentUser} onImpersonate={handleImpersonate} onSignOut={handleSignOut} theme={theme} toggleTheme={toggleTheme} />;
    }

    if (isOnboarding) {
        return (
            <OnboardingWizard 
                currentUser={currentUser} 
                onUpdatePlan={handleUpdatePlan} 
                onAddNewSite={addNewSite} 
                onComplete={() => setIsOnboarding(false)} 
                setActiveTab={setActiveTab} 
            />
        );
    }

    return (
        <>
            <Layout
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                currentUser={currentUser}
                handleSignOut={handleSignOut}
                impersonatingUser={impersonatingUser}
                planAccess={planAccess}
                theme={theme}
                toggleTheme={toggleTheme}
            >
                <AppRouter 
                    activeTab={activeTab} 
                    activeSubTab={activeSubTab} 
                    setActiveTab={setActiveTab} 
                    currentUser={currentUser}
                    planAccess={planAccess}
                    onUpdatePlan={handleUpdatePlan}
                />
            </Layout>
            <GlobalAutomationTracker isOpen={false} onClose={() => {}} sites={sites} />
        </>
    );
};

export const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [impersonatingUser, setImpersonatingUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    const toast = useToast();

    // Theme initialization
    useEffect(() => {
        const storedTheme = localStorage.getItem('zenith-theme') as 'dark' | 'light' | null;
        if (storedTheme) {
            setTheme(storedTheme);
            if (storedTheme === 'light') document.documentElement.classList.add('light');
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('zenith-theme', newTheme);
        if (newTheme === 'light') document.documentElement.classList.add('light');
        else document.documentElement.classList.remove('light');
    };

    // Auth & Session Check
    useEffect(() => {
        const checkSession = async () => {
            let { user, impersonatingAdmin } = await authService.getCurrentUser();
            if (user) {
                setCurrentUser(user);
                if (impersonatingAdmin) setImpersonatingUser(impersonatingAdmin);
            }
            setAuthLoading(false);
        };
        checkSession();
    }, []);

    const handleAuthSuccess = (user: User) => {
        setCurrentUser(user);
    };

    const handleSignOut = () => {
        authService.signOut();
        setCurrentUser(null);
        setImpersonatingUser(null);
    };

    const handleUpdatePlan = async (plan: SubscriptionPlan, cycle?: 'monthly' | 'yearly') => {
        if (!currentUser) return;
        try {
            const updatedUser = await authService.updateUser(currentUser.email, { subscriptionPlan: plan, subscriptionCycle: cycle });
            setCurrentUser(updatedUser);
            toast.addToast(`Plan updated to ${plan}`, 'success');
        } catch (e: any) {
            toast.addToast(e.message, 'error');
        }
    };

    if (authLoading) return <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>;

    if (!currentUser) return <AuthPage onAuthSuccess={handleAuthSuccess} theme={theme} toggleTheme={toggleTheme} />;

    return (
        <SiteProvider currentUser={currentUser}>
            <AppContent 
                currentUser={currentUser}
                impersonatingUser={impersonatingUser}
                handleSignOut={handleSignOut}
                toggleTheme={toggleTheme}
                theme={theme}
                handleUpdatePlan={handleUpdatePlan}
                setCurrentUser={setCurrentUser}
                setImpersonatingUser={setImpersonatingUser}
            />
        </SiteProvider>
    );
};
