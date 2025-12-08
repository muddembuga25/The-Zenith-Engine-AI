import React from 'react';
import { CreditCardIcon, SparklesIcon } from './Icons';

interface UpgradePlanProps {
    featureName: string;
    requiredPlan: 'Creator' | 'Pro' | 'Agency';
    setActiveTab: (tab: string, subTab?: string | null) => void;
}

export const UpgradePlan: React.FC<UpgradePlanProps> = ({ featureName, requiredPlan, setActiveTab }) => {
    return (
        <div className="text-center bg-panel/50 p-12 rounded-2xl border-2 border-dashed border-border max-w-2xl mx-auto animate-fade-in">
            <SparklesIcon className="mx-auto h-12 w-12 text-blue-400" />
            <h3 className="mt-4 text-xl font-bold text-white">Unlock {featureName}</h3>
            <p className="mt-2 text-sm text-text-secondary">
                This feature is available on the <strong>{requiredPlan}</strong> plan and above.
            </p>
            <button
                onClick={() => setActiveTab('subscription')}
                className="mt-6 btn btn-primary flex items-center justify-center gap-2"
            >
                <CreditCardIcon className="h-5 w-5" />
                View Subscription Plans
            </button>
        </div>
    );
};
