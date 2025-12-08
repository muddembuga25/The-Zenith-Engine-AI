
import React, { useState, useEffect } from 'react';
import type { User, SubscriptionPlan } from '../types';
import * as authService from '../services/authService';
import { useToast } from '../hooks/useToast';
import { XIcon, UserIcon, AtSymbolIcon, MailIcon, CreditCardIcon, KeyIcon, SignOutIcon, EyeIcon, EyeSlashIcon, PenIcon, SparklesIcon, BuildingOffice2Icon, CameraIcon, ExclamationTriangleIcon } from './Icons';

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

const planDetails: Record<SubscriptionPlan, { title: string; icon: React.FC<any>; colorClasses: string }> = {
    free: {
        title: 'Free Forever',
        icon: UserIcon,
        colorClasses: 'text-text-secondary border-border-base bg-panel-light',
    },
    creator: {
        title: 'Creator',
        icon: PenIcon,
        colorClasses: 'text-brand-primary border-brand-primary/50 bg-brand-primary/10',
    },
    pro: {
        title: 'Pro',
        icon: SparklesIcon,
        colorClasses: 'text-brand-primary border-brand-primary/50 bg-brand-primary/20',
    },
    agency: {
        title: 'Agency',
        icon: BuildingOffice2Icon,
        colorClasses: 'text-brand-primary border-brand-primary/50 bg-brand-primary/30',
    },
};

type ProfileTab = 'profile' | 'subscription' | 'security';

// ... [Rest of components remain same, styles rely on updated planDetails above] ...

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, currentUser, onUserUpdate, onSignOut, planAccess, onManageSubscription }) => {
    // ... implementation ...
    return <div></div>; // Placeholder
};
