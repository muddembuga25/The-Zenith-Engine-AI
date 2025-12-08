
import React, { useState, useEffect } from 'react';
import type { User, SubscriptionPlan } from '../types';
import * as authService from '../services/authService';
import { useToast } from '../hooks/useToast';
import { XIcon, UserIcon, AtSymbolIcon, MailIcon, CreditCardIcon, KeyIcon, SignOutIcon, EyeIcon, EyeSlashIcon, PenIcon, SparklesIcon, BuildingOffice2Icon, CheckCircleIcon, ArrowRightIcon } from './Icons';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User;
    onUserUpdate: (updatedUser: User) => void;
    onSignOut: () => void;
    planAccess: {
        plan: SubscriptionPlan;
        generationLimit: number | 'Unlimited';
        generationsUsed: number;
    };
    onManageSubscription: () => void;
}

const planDetails: Record<SubscriptionPlan, { title: string; icon: React.FC<any>; colorClasses: string; bgGradient: string }> = {
    free: {
        title: 'Free Plan',
        icon: UserIcon,
        colorClasses: 'text-text-secondary',
        bgGradient: 'from-gray-700 to-gray-900',
    },
    creator: {
        title: 'Creator Plan',
        icon: PenIcon,
        colorClasses: 'text-brand-primary',
        bgGradient: 'from-brand-primary/20 to-brand-primary/5',
    },
    pro: {
        title: 'Pro Plan',
        icon: SparklesIcon,
        colorClasses: 'text-purple-400',
        bgGradient: 'from-purple-500/20 to-purple-900/10',
    },
    agency: {
        title: 'Agency Plan',
        icon: BuildingOffice2Icon,
        colorClasses: 'text-amber-400',
        bgGradient: 'from-amber-500/20 to-amber-900/10',
    },
};

type ProfileTab = 'profile' | 'subscription' | 'security';

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, currentUser, onUserUpdate, onSignOut, planAccess, onManageSubscription }) => {
    const [activeTab, setActiveTab] = useState<ProfileTab>('profile');
    const [firstName, setFirstName] = useState(currentUser.firstName || '');
    const [lastName, setLastName] = useState(currentUser.lastName || '');
    const [username, setUsername] = useState(currentUser.username || '');
    
    // Security State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToast();

    // Reset local state when user prop changes or modal opens
    useEffect(() => {
        if (isOpen) {
            setFirstName(currentUser.firstName || '');
            setLastName(currentUser.lastName || '');
            setUsername(currentUser.username || '');
            setCurrentPassword('');
            setNewPassword('');
            setActiveTab('profile');
        }
    }, [isOpen, currentUser]);

    if (!isOpen) return null;

    const currentPlanStyle = planDetails[currentUser.subscriptionPlan || 'free'];
    const PlanIcon = currentPlanStyle.icon;

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const updated = await authService.updateUserProfile(currentUser.uid, {
                firstName,
                lastName,
                username
            });
            onUserUpdate(updated);
            addToast("Profile updated successfully.", 'success');
        } catch (error: any) {
            addToast(error.message || "Failed to update profile", 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            addToast("New password must be at least 6 characters.", 'error');
            return;
        }
        setIsLoading(true);
        try {
            await authService.changePassword(currentPassword, newPassword);
            addToast("Password changed successfully.", 'success');
            setCurrentPassword('');
            setNewPassword('');
        } catch (error: any) {
            addToast(error.message || "Failed to change password", 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const usagePercentage = planAccess.generationLimit === 'Unlimited' 
        ? 0 
        : Math.min(100, (planAccess.generationsUsed / (planAccess.generationLimit as number)) * 100);

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-panel w-full max-w-2xl rounded-2xl shadow-2xl border border-border flex flex-col max-h-[90vh] animate-modal-pop overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative border-b border-border bg-panel-light p-6">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 text-text-tertiary hover:text-text-primary rounded-full hover:bg-panel transition-colors">
                        <XIcon className="h-5 w-5" />
                    </button>
                    
                    <div className="flex items-center gap-5">
                        <div className="relative">
                            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-brand-primary to-blue-600 flex items-center justify-center text-white text-2xl font-bold border-4 border-panel shadow-lg">
                                {firstName ? firstName[0] : currentUser.email[0].toUpperCase()}
                            </div>
                            <div className={`absolute -bottom-1 -right-1 p-1.5 rounded-full bg-panel border border-border ${currentPlanStyle.colorClasses}`}>
                                <PlanIcon className="h-4 w-4" />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-main">{firstName} {lastName}</h2>
                            <p className="text-sm text-text-secondary flex items-center gap-1.5">
                                <MailIcon className="h-3.5 w-3.5" /> {currentUser.email}
                            </p>
                            <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r ${currentPlanStyle.bgGradient} ${currentPlanStyle.colorClasses} border border-white/10`}>
                                {currentPlanStyle.title}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs & Content Container */}
                <div className="flex flex-col md:flex-row flex-1 min-h-0">
                    {/* Sidebar Nav */}
                    <nav className="w-full md:w-64 bg-panel border-b md:border-b-0 md:border-r border-border p-4 flex flex-row md:flex-col gap-1 overflow-x-auto">
                        <button 
                            onClick={() => setActiveTab('profile')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'profile' ? 'bg-brand-primary/10 text-brand-primary shadow-sm' : 'text-text-secondary hover:bg-panel-light hover:text-main'}`}
                        >
                            <UserIcon className="h-5 w-5" /> Profile
                        </button>
                        <button 
                            onClick={() => setActiveTab('subscription')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'subscription' ? 'bg-brand-primary/10 text-brand-primary shadow-sm' : 'text-text-secondary hover:bg-panel-light hover:text-main'}`}
                        >
                            <CreditCardIcon className="h-5 w-5" /> Subscription
                        </button>
                        <button 
                            onClick={() => setActiveTab('security')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'security' ? 'bg-brand-primary/10 text-brand-primary shadow-sm' : 'text-text-secondary hover:bg-panel-light hover:text-main'}`}
                        >
                            <KeyIcon className="h-5 w-5" /> Security
                        </button>
                        
                        <div className="md:mt-auto pt-4 md:border-t border-border mt-0 ml-auto md:ml-0">
                            <button onClick={onSignOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-red-400/10 transition-colors">
                                <SignOutIcon className="h-5 w-5" /> Sign Out
                            </button>
                        </div>
                    </nav>

                    {/* Tab Content */}
                    <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-panel">
                        {activeTab === 'profile' && (
                            <form onSubmit={handleSaveProfile} className="space-y-6 animate-fade-in">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">First Name</label>
                                        <input 
                                            type="text" 
                                            value={firstName} 
                                            onChange={e => setFirstName(e.target.value)} 
                                            className="input-base w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Last Name</label>
                                        <input 
                                            type="text" 
                                            value={lastName} 
                                            onChange={e => setLastName(e.target.value)} 
                                            className="input-base w-full"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Username</label>
                                    <div className="relative">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <AtSymbolIcon className="h-5 w-5 text-text-tertiary" />
                                        </div>
                                        <input 
                                            type="text" 
                                            value={username} 
                                            onChange={e => setUsername(e.target.value)} 
                                            className="input-base pl-10 w-full"
                                        />
                                    </div>
                                </div>
                                <div className="pt-4 flex justify-end">
                                    <button 
                                        type="submit" 
                                        disabled={isLoading} 
                                        className="btn btn-primary flex items-center gap-2"
                                    >
                                        {isLoading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {activeTab === 'subscription' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className={`p-6 rounded-xl border border-border bg-gradient-to-br ${currentPlanStyle.bgGradient}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className={`text-lg font-bold ${currentPlanStyle.colorClasses}`}>{currentPlanStyle.title}</h3>
                                            <p className="text-text-secondary text-sm mt-1">
                                                Cycle: <span className="text-main font-medium capitalize">{currentUser.subscriptionCycle || 'Monthly'}</span>
                                            </p>
                                        </div>
                                        {currentUser.isAdmin && (
                                            <span className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 text-xs font-bold border border-yellow-500/30">ADMIN</span>
                                        )}
                                    </div>
                                    
                                    <div className="mt-6 space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-text-secondary">Generations Used</span>
                                            <span className="text-main font-mono">{planAccess.generationsUsed} / {planAccess.generationLimit}</span>
                                        </div>
                                        <div className="w-full bg-black/20 rounded-full h-2.5 overflow-hidden border border-white/5">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-500 ${usagePercentage > 90 ? 'bg-red-500' : 'bg-brand-primary'}`} 
                                                style={{ width: `${usagePercentage}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-text-tertiary text-right">Resets on {new Date(currentUser.monthlyGenerations?.resetDate || Date.now()).toLocaleDateString()}</p>
                                    </div>
                                </div>

                                <div className="bg-panel-light p-4 rounded-lg border border-border-subtle flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-main text-sm">Need more power?</p>
                                        <p className="text-xs text-text-secondary">Upgrade your plan to unlock more features.</p>
                                    </div>
                                    <button onClick={onManageSubscription} className="btn btn-secondary text-sm">
                                        Manage Subscription
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <form onSubmit={handleChangePassword} className="space-y-6 animate-fade-in">
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Current Password</label>
                                    <input 
                                        type="password" 
                                        value={currentPassword} 
                                        onChange={e => setCurrentPassword(e.target.value)} 
                                        className="input-base w-full"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">New Password</label>
                                    <div className="relative">
                                        <input 
                                            type={showPassword ? 'text' : 'password'} 
                                            value={newPassword} 
                                            onChange={e => setNewPassword(e.target.value)} 
                                            className="input-base w-full pr-10"
                                            placeholder="••••••••"
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-2.5 text-text-tertiary hover:text-main"
                                        >
                                            {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                        </button>
                                    </div>
                                    <p className="text-xs text-text-tertiary mt-2">Must be at least 6 characters long.</p>
                                </div>
                                <div className="pt-4 flex justify-end">
                                    <button 
                                        type="submit" 
                                        disabled={isLoading || !currentPassword || !newPassword} 
                                        className="btn btn-primary flex items-center gap-2"
                                    >
                                        <CheckCircleIcon className="h-4 w-4" />
                                        {isLoading ? 'Updating...' : 'Update Password'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
