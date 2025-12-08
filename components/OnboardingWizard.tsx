
import React, { useState } from 'react';
import type { User, SubscriptionPlan } from '../types';
import { SubscriptionPage } from './SubscriptionPage';
import { CheckCircleIcon, WordPressIcon, DocumentTextIcon, PenIcon } from './Icons';

interface OnboardingWizardProps {
    currentUser: User;
    onUpdatePlan: (plan: SubscriptionPlan, cycle?: 'monthly' | 'yearly') => Promise<void>;
    onAddNewSite: () => void;
    onComplete: () => void;
    setActiveTab: (tab: string, subTab?: string | null) => void;
}

type OnboardingStep = 'subscription' | 'subscription_confirmed' | 'create_site' | 'connect_wp' | 'add_idea';

const StepIndicator: React.FC<{ steps: string[], currentStepIndex: number }> = ({ steps, currentStepIndex }) => {
    return (
        <nav aria-label="Progress">
            <ol role="list" className="space-y-4 md:flex md:space-x-8 md:space-y-0">
                {steps.map((stepName, stepIdx) => (
                    <li key={stepName} className="md:flex-1">
                        {stepIdx < currentStepIndex ? (
                            <div className="group flex w-full flex-col border-l-4 border-brand-primary py-2 pl-4 md:border-l-0 md:border-t-4 md:pl-0 md:pt-4 md:pb-0">
                                <span className="text-sm font-medium text-brand-primary">{`Step ${stepIdx + 1}`}</span>
                                <span className="text-sm font-medium text-white">{stepName}</span>
                            </div>
                        ) : stepIdx === currentStepIndex ? (
                            <div className="flex w-full flex-col border-l-4 border-brand-primary py-2 pl-4 md:border-l-0 md:border-t-4 md:pl-0 md:pt-4 md:pb-0" aria-current="step">
                                <span className="text-sm font-medium text-brand-primary-hover">{`Step ${stepIdx + 1}`}</span>
                                <span className="text-sm font-medium text-white">{stepName}</span>
                            </div>
                        ) : (
                             <div className="group flex w-full flex-col border-l-4 border-border py-2 pl-4 md:border-l-0 md:border-t-4 md:pl-0 md:pt-4 md:pb-0">
                                <span className="text-sm font-medium text-text-secondary">{`Step ${stepIdx + 1}`}</span>
                                <span className="text-sm font-medium text-text-secondary">{stepName}</span>
                            </div>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
};


export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ currentUser, onUpdatePlan, onAddNewSite, onComplete, setActiveTab }) => {
    const [step, setStep] = useState<OnboardingStep>(
        !currentUser.subscriptionPlan && !currentUser.isAdmin 
        ? 'subscription' 
        : 'create_site'
    );
    
    const coreSteps = ['Create Your Site', 'Connect WordPress', 'Add Content Idea'];
    
    let currentStepIndex = -1;
    if (step === 'create_site') currentStepIndex = 0;
    if (step === 'connect_wp') currentStepIndex = 1;
    if (step === 'add_idea') currentStepIndex = 2;

    const handleSiteCreated = () => {
        onAddNewSite();
        setStep('connect_wp');
    };
    
    const handlePlanUpdated = async (plan: SubscriptionPlan, cycle?: 'monthly' | 'yearly') => {
        await onUpdatePlan(plan, cycle);
        setStep('subscription_confirmed');
    };

    const renderStepContent = () => {
        switch (step) {
            case 'subscription':
                return <SubscriptionPage currentUser={currentUser} onUpdatePlan={handlePlanUpdated} />;
            case 'subscription_confirmed':
                return (
                    <div className="text-center max-w-lg mx-auto py-8">
                        <CheckCircleIcon className="h-16 w-16 text-green-400 mx-auto" />
                        <h2 className="text-2xl font-bold text-white mt-6">Plan Updated Successfully!</h2>
                        <p className="text-text-secondary mt-2">You're all set. Let's continue setting up your first site.</p>
                        <button onClick={() => setStep('create_site')} className="mt-8 btn btn-primary text-lg px-8 py-3">Continue</button>
                    </div>
                );
            case 'create_site':
                return (
                     <div className="text-center max-w-lg mx-auto py-8">
                        <PenIcon className="h-16 w-16 text-brand-primary mx-auto" />
                        <h2 className="text-2xl font-bold text-white mt-6">Create Your First Site</h2>
                        <p className="text-text-secondary mt-2">A "Site" is a workspace for a single website or project. This will contain all your content, settings, and branding.</p>
                        <button onClick={handleSiteCreated} className="mt-8 btn btn-primary text-lg px-8 py-3">Create Site & Continue</button>
                    </div>
                );
            case 'connect_wp':
                return (
                     <div className="text-center max-w-2xl mx-auto py-8">
                        <WordPressIcon className="h-16 w-16 text-brand-primary mx-auto" />
                        <h2 className="text-2xl font-bold text-white mt-6">Connect Your WordPress Site</h2>
                         <p className="text-text-secondary mt-2">This is a crucial step. Connecting your website enables Zenith Engine AI to publish content directly to your blog.</p>
                         <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                             <button onClick={() => { setActiveTab('settings'); onComplete(); }} className="btn btn-primary text-lg px-8 py-3">
                                 Go to Connection Settings
                             </button>
                         </div>
                         <button onClick={() => setStep('add_idea')} className="mt-6 text-sm text-text-secondary hover:text-white">I'll do this later</button>
                    </div>
                );
            case 'add_idea':
                return (
                     <div className="text-center max-w-2xl mx-auto py-8">
                        <DocumentTextIcon className="h-16 w-16 text-brand-primary mx-auto" />
                        <h2 className="text-2xl font-bold text-white mt-6">Add Your First Content Idea</h2>
                         <p className="text-text-secondary mt-2">Your content engine needs fuel. Add a keyword or topic for the AI to write about. You can add more later in the Content Hub.</p>
                         <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                             <button onClick={() => { setActiveTab('content', 'blog'); onComplete(); }} className="btn btn-primary text-lg px-8 py-3">
                                 Go to Content Hub
                             </button>
                         </div>
                         <button onClick={onComplete} className="mt-6 text-sm text-text-secondary hover:text-white">Finish Setup</button>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="h-full w-full overflow-y-auto p-4 sm:p-8 flex items-start sm:items-center justify-center">
            <div className="w-full max-w-5xl animate-fade-in">
                {currentStepIndex !== -1 ? (
                    <div className="mb-12 px-4">
                        <StepIndicator steps={coreSteps} currentStepIndex={currentStepIndex} />
                    </div>
                ) : (
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-extrabold text-white">Let's Get You Set Up!</h1>
                        <p className="text-text-secondary mt-2">Just a few steps to get your AI content engine running.</p>
                    </div>
                )}
                
                <div className={`transition-all duration-300 ${currentStepIndex === -1 ? '' : 'bg-panel/50 border border-border rounded-2xl shadow-2xl'}`}>
                    {renderStepContent()}
                </div>
            </div>
        </div>
    );
};
