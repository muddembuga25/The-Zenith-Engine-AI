
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { User, SubscriptionPlan, Site, GlobalSettings, SupabaseConnection, PaystackConnection, PayfastConnection, WiseConnection, PayoneerConnection, StripeConnection, PayPalConnection } from '../types';
import * as authService from '../services/authService';
import { storageService } from '../services/storageService';
import { useToast } from '../hooks/useToast';
import { AgencyPortalTab } from './AgencyPortalTab';
import { GlobalConnectionsTab } from './GlobalConnectionsTab';
import { ChartPieIcon, UsersIcon, BuildingOffice2Icon, SparklesIcon, LinkIcon, MagnifyingGlassIcon, UserIcon, TrashIcon, PenIcon, ArrowRightIcon, LogoIcon, SignOutIcon, ExclamationTriangleIcon, SunIcon, MoonIcon } from './Icons';

// Monochrome Brand Scale for Charts
const COLORS = ['#1DA1F2', '#4ABBF9', '#0C85D0', '#034E7D'];

interface AdminDashboardProps {
    currentUser: User;
    onImpersonate: (user: User) => void;
    onSignOut: () => void;
    theme: 'dark' | 'light';
    toggleTheme: () => void;
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.FC<any>; }> = ({ title, value, icon: Icon }) => (
    <div className="bg-panel/50 p-5 rounded-2xl border border-border">
        <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-text-secondary">{title}</p>
            <Icon className="h-6 w-6 text-brand-primary" />
        </div>
        <p className="text-4xl font-extrabold text-main mt-2">{value}</p>
    </div>
);

const UserRow: React.FC<{ user: User; onImpersonate: (user: User) => void; onUpdatePlan: (email: string, plan: SubscriptionPlan) => void; onDelete: (email: string) => void }> = ({ user, onImpersonate, onUpdatePlan, onDelete }) => {
    const plans: SubscriptionPlan[] = ['free', 'creator', 'pro', 'agency'];
    return (
        <tr className="border-b border-border hover:bg-panel-light/30 transition-colors">
            <td className="py-4 px-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-primary/20 flex items-center justify-center text-xs font-bold text-brand-primary">
                        {user.firstName ? user.firstName[0] : user.email[0].toUpperCase()}
                    </div>
                    <div>
                        <p className="font-semibold text-main text-sm">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-text-secondary">{user.email}</p>
                    </div>
                </div>
            </td>
            <td className="py-4 px-4">
                <select value={user.subscriptionPlan || 'free'} onChange={(e) => onUpdatePlan(user.email, e.target.value as SubscriptionPlan)} className="bg-panel border border-border text-sm rounded px-2 py-1 text-text-primary focus:ring-brand-primary">
                    {plans.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
            </td>
            <td className="py-4 px-4 text-sm text-text-secondary font-mono">{user.monthlyGenerations?.count || 0}</td>
            <td className="py-4 px-4 text-right">
                <div className="flex items-center justify-end gap-2">
                    <button onClick={() => onImpersonate(user)} className="text-blue-400 hover:text-blue-300 text-xs font-medium px-2 py-1 rounded hover:bg-blue-900/30 transition-colors">Impersonate</button>
                    {!user.isAdmin && <button onClick={() => onDelete(user.email)} className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-900/30 transition-colors"><TrashIcon className="h-4 w-4" /></button>}
                </div>
            </td>
        </tr>
    );
};

const OverviewPanel: React.FC<{ globalStats: any }> = ({ globalStats }) => (
    <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard title="Total Users" value={globalStats.totalUsers} icon={UsersIcon} />
            <StatCard title="Total Revenue (Est.)" value={`$${globalStats.totalRevenue.toLocaleString()}`} icon={BuildingOffice2Icon} />
            <StatCard title="Active Automations" value={globalStats.activeAutomations} icon={SparklesIcon} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-panel/50 p-6 rounded-2xl border border-border">
                <h3 className="text-lg font-bold text-main mb-4">Subscription Distribution</h3>
                <div className="h-64 w-full">
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie data={globalStats.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                {globalStats.pieData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: 'var(--color-panel-light)', border: '1px solid var(--color-border)' }} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <div className="bg-panel/50 p-6 rounded-2xl border border-border flex flex-col justify-center items-center text-center">
                <SparklesIcon className="h-12 w-12 text-brand-primary mb-4" />
                <h3 className="text-xl font-bold text-main">System Health</h3>
                <p className="text-text-secondary mt-2">All systems operational.</p>
            </div>
        </div>
    </div>
);

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, onImpersonate, onSignOut, theme, toggleTheme }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'agency_portal' | 'global-connections'>('overview');
    const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({});
    const toast = useToast();

    // Mock global stats for the overview
    const globalStats = useMemo(() => ({
        pieData: [
            { name: 'Free', value: users.filter(u => !u.subscriptionPlan || u.subscriptionPlan === 'free').length },
            { name: 'Creator', value: users.filter(u => u.subscriptionPlan === 'creator').length },
            { name: 'Pro', value: users.filter(u => u.subscriptionPlan === 'pro').length },
            { name: 'Agency', value: users.filter(u => u.subscriptionPlan === 'agency').length },
        ],
        totalUsers: users.length,
        totalRevenue: users.reduce((acc, u) => {
            if (u.subscriptionPlan === 'creator') return acc + 39;
            if (u.subscriptionPlan === 'pro') return acc + 99;
            if (u.subscriptionPlan === 'agency') return acc + 249;
            return acc;
        }, 0),
        activeAutomations: Math.floor(users.length * 0.8) // Simulated
    }), [users]);

    useEffect(() => {
        const loadData = async () => {
            const allUsers = await authService.getAllUsers();
            setUsers(allUsers);
            const settings = await storageService.loadGlobalSettings();
            setGlobalSettings(settings);
        };
        loadData();
    }, []);

    const filteredUsers = useMemo(() => {
        return users.filter(u => 
            u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (u.firstName && u.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (u.lastName && u.lastName.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [users, searchTerm]);

    const handleUpdatePlan = async (email: string, plan: SubscriptionPlan) => {
        try {
            await authService.updateUser(email, { subscriptionPlan: plan });
            setUsers(prev => prev.map(u => u.email === email ? { ...u, subscriptionPlan: plan } : u));
            toast.addToast(`Updated user plan to ${plan}`, 'success');
        } catch (error: any) {
            toast.addToast(`Failed to update plan: ${error.message}`, 'error');
        }
    };

    const handleDeleteUser = (email: string) => {
        if (window.confirm(`Are you sure you want to delete ${email}? This cannot be undone.`)) {
            authService.deleteUser(email);
            setUsers(prev => prev.filter(u => u.email !== email));
            toast.addToast('User deleted', 'success');
        }
    };

    const handleUpdateGlobalSettings = async (updates: Partial<GlobalSettings>) => {
        const newSettings = { ...globalSettings, ...updates };
        setGlobalSettings(newSettings);
        try {
            await storageService.saveGlobalSettings(newSettings);
            toast.addToast('Global settings updated', 'success');
        } catch (e: any) {
            toast.addToast(`Failed to save settings: ${e.message}`, 'error');
        }
    };

    // Global connection verify handlers placeholders - these call services
    // Since we are in AdminDashboard, we don't have a 'Site' object to update status on.
    // Instead we update the global settings state.
    const handleVerifySupabase = async (c: SupabaseConnection) => { toast.addToast('Verification simulated', 'info'); };
    const handleVerifyPaystack = async (c: PaystackConnection) => { toast.addToast('Verification simulated', 'info'); };
    const handleVerifyPayfast = async (c: PayfastConnection) => { toast.addToast('Verification simulated', 'info'); };
    const handleVerifyWise = async (c: WiseConnection) => { toast.addToast('Verification simulated', 'info'); };
    const handleVerifyPayoneer = async (c: PayoneerConnection) => { toast.addToast('Verification simulated', 'info'); };
    const handleVerifyStripe = async (c: StripeConnection) => { toast.addToast('Verification simulated', 'info'); };
    const handleVerifyPayPal = async (c: PayPalConnection) => { toast.addToast('Verification simulated', 'info'); };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: ChartPieIcon },
        { id: 'users', label: 'Users', icon: UsersIcon },
        { id: 'agency_portal', label: 'Agency Portal', icon: BuildingOffice2Icon },
        { id: 'global-connections', label: 'Global Connections', icon: LinkIcon },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return <OverviewPanel globalStats={globalStats} />;
            case 'users':
                return (
                    <div className="bg-panel/50 rounded-2xl border border-border overflow-hidden">
                        <div className="p-4 border-b border-border flex justify-between items-center">
                            <h3 className="font-bold text-main">User Management</h3>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><MagnifyingGlassIcon className="h-5 w-5 text-gray-400" /></div>
                                <input type="text" placeholder="Search users..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="input-base pl-10 pr-4 py-1.5 text-sm" />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-panel-light border-b border-border">
                                    <tr>
                                        <th className="py-3 px-4 text-xs font-medium text-text-secondary uppercase tracking-wider">User</th>
                                        <th className="py-3 px-4 text-xs font-medium text-text-secondary uppercase tracking-wider">Plan</th>
                                        <th className="py-3 px-4 text-xs font-medium text-text-secondary uppercase tracking-wider">Usage</th>
                                        <th className="py-3 px-4 text-xs font-medium text-text-secondary uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map(user => (
                                        <UserRow key={user.uid} user={user} onImpersonate={onImpersonate} onUpdatePlan={handleUpdatePlan} onDelete={handleDeleteUser} />
                                    ))}
                                    {filteredUsers.length === 0 && (
                                        <tr><td colSpan={4} className="py-8 text-center text-text-secondary">No users found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            case 'agency_portal':
                return <AgencyPortalTab currentUser={currentUser} />;
            case 'global-connections':
                // Note: We are passing empty array for 'sites' as this is global config, not site-specific monitoring
                return (
                    <GlobalConnectionsTab 
                        sites={[]} 
                        settings={globalSettings} 
                        onUpdateSettings={handleUpdateGlobalSettings}
                        onVerifySupabase={handleVerifySupabase}
                        onVerifyPaystack={handleVerifyPaystack}
                        onVerifyPayfast={handleVerifyPayfast}
                        onVerifyWise={handleVerifyWise}
                        onVerifyPayoneer={handleVerifyPayoneer}
                        onVerifyStripe={handleVerifyStripe}
                        onVerifyPayPal={handleVerifyPayPal}
                        setError={(err) => toast.addToast(err || 'Error', 'error')}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="h-full w-full flex flex-col bg-app">
            <header className="bg-panel-light/50 backdrop-blur-lg border-b border-border h-16 flex-shrink-0 flex items-center justify-between px-6">
                 <div className="flex items-center gap-3">
                  <LogoIcon className="h-7 w-7 text-brand-primary" />
                  <span className="font-bold text-xl text-main">Admin Dashboard</span>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={toggleTheme} className="p-2 rounded-lg text-sub hover:text-main hover:bg-panel-light transition-colors" title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
                        {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                    </button>
                    <div className="flex items-center gap-3 border-l border-border pl-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-medium text-main">Administrator</p>
                            <p className="text-xs text-text-secondary">{currentUser.email}</p>
                        </div>
                        <button onClick={onSignOut} className="p-2 text-text-secondary hover:text-red-400 transition-colors" title="Sign Out">
                            <SignOutIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </header>
            <main className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8 border-b border-border">
                        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Portal Tabs">
                            {tabs.map(tab => (
                                <button 
                                    key={tab.id} 
                                    onClick={() => setActiveTab(tab.id as any)} 
                                    className={`${activeTab === tab.id ? 'border-brand-primary text-brand-primary' : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-500'} flex items-center gap-2 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}
                                >
                                    <tab.icon className="h-5 w-5" /> {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>
                    <div className="animate-fade-in">
                        {renderContent()}
                    </div>
                </div>
            </main>
        </div>
    );
};
