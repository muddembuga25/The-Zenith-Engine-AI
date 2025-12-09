
import React, { useState, useEffect } from 'react';
import type { User, SubscriptionPlan, GlobalSettings } from '../types';
import { storageService } from '../services/storageService';
import { CheckCircleIcon, LightbulbIcon, XIcon, CreditCardIcon, ArrowRightIcon, UserIcon, PenIcon, SparklesIcon, BuildingOffice2Icon } from './Icons';

declare global {
    interface Window {
        PaystackPop: any;
    }
}

interface SubscriptionPageProps {
    currentUser: User;
    onUpdatePlan: (plan: SubscriptionPlan, cycle?: 'monthly' | 'yearly') => Promise<void>;
}

const plans: {
    name: SubscriptionPlan;
    title: string;
    priceMonthly: string;
    priceYearly: string;
    yearlyDiscount: string;
    description: string;
    features: string[];
    cta: string;
    isFeatured?: boolean;
    generationLimit: number | string;
}[] = [
    {
        name: 'free',
        title: 'Free',
        priceMonthly: '$0',
        priceYearly: '$0',
        yearlyDiscount: '',
        description: 'The Test Drive. Your entry point to see the core power of the AI.',
        features: [
            '2 AI Blog Posts/month',
            '1 Website',
            'WordPress Integration',
            'Blog Post Automation',
            'Core AI Assistant',
            'Use your own Google API Key',
        ],
        cta: 'Your Current Plan',
        generationLimit: 2,
    },
    {
        name: 'creator',
        title: 'Creator',
        priceMonthly: '$39',
        priceYearly: '$390',
        yearlyDiscount: 'Save 16%',
        description: "The Solopreneur's Powerhouse. For individuals and bloggers focused on growing a single brand.",
        features: [
            'All Free features, plus:',
            '50 AI Blog Posts/month',
            'Social Graphics & Video Automation',
            'Analytics & Monitoring',
            'AI Strategy Suggestions',
            'Advanced Branding (Logos, Colors)',
            'Use All Custom API Keys',
        ],
        cta: 'Upgrade to Creator',
        isFeatured: true,
        generationLimit: 50,
    },
    {
        name: 'pro',
        title: 'Pro',
        priceMonthly: '$99',
        priceYearly: '$990',
        yearlyDiscount: 'Save 16%',
        description: "The Marketing Professional's Garage. For serious marketers managing multiple projects.",
        features: [
            'All Creator features, plus:',
            '200 AI Blog Posts/month',
            'Up to 10 Websites',
            'Email Marketing Automation',
            'Authority Suite (Commenting & Backlinks)',
            'Advertising Dashboard',
            'Live Production Automation',
            'Advanced SEO (DataForSEO)',
            'Branding with Character Personas',
        ],
        cta: 'Upgrade to Pro',
        generationLimit: 200,
    },
    {
        name: 'agency',
        title: 'Agency',
        priceMonthly: '$249',
        priceYearly: '$2490',
        yearlyDiscount: 'Save 16%',
        description: 'Unlimited scale for agencies and power users managing multiple clients.',
        features: [
            'All Pro features, plus:',
            'Unlimited Generations',
            'Unlimited Websites',
            'Priority Support',
            'White-Labeling Options (coming soon)',
        ],
        cta: 'Upgrade to Agency',
        generationLimit: 'Unlimited',
    },
];

const TabGuide: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => {
    const [isVisible, setIsVisible] = useState(true);
    if (!isVisible) return null;
    return (
        <div className="bg-brand-primary/10 p-4 rounded-lg border border-brand-primary/30 mb-8 flex items-start gap-4 animate-fade-in">
            <LightbulbIcon className="h-6 w-6 text-brand-primary flex-shrink-0 mt-1" />
            <div className="flex-1">
                <h3 className="font-bold text-main">{title}</h3>
                <div className="text-sm text-brand-primary mt-1">
                    {children}
                </div>
            </div>
            <button onClick={() => setIsVisible(false)} className="p-1.5 text-brand-primary hover:text-main rounded-full">
                <XIcon className="h-5 w-5" />
            </button>
        </div>
    );
};

const planDetailsForIcons: Record<SubscriptionPlan, { icon: React.FC<any>; colorClasses: string }> = {
    free: {
        icon: UserIcon,
        colorClasses: 'text-brand-primary border-brand-primary/50 bg-brand-primary/10',
    },
    creator: {
        icon: PenIcon,
        colorClasses: 'text-brand-primary border-brand-primary/50 bg-brand-primary/10',
    },
    pro: {
        icon: SparklesIcon,
        colorClasses: 'text-brand-primary border-brand-primary/50 bg-brand-primary/20',
    },
    agency: {
        icon: BuildingOffice2Icon,
        colorClasses: 'text-brand-primary border-brand-primary/50 bg-brand-primary/30',
    },
};

const PlanSelectionView: React.FC<{
    currentUser: User;
    onUpdatePlan: (plan: SubscriptionPlan, cycle?: 'monthly' | 'yearly') => Promise<void>;
}> = ({ currentUser, onUpdatePlan }) => {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(currentUser.subscriptionCycle || 'monthly');
    const [isLoading, setIsLoading] = useState<SubscriptionPlan | null>(null);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const settings = await storageService.loadGlobalSettings();
                setGlobalSettings(settings);
            } catch (e) {
                console.error("Failed to load global payment settings", e);
            }
        };
        fetchSettings();
    }, []);

    const currentPlan = currentUser.subscriptionPlan;
    const planLevels: Record<SubscriptionPlan, number> = { free: 0, creator: 1, pro: 2, agency: 3 };
    const currentLevel = currentPlan ? planLevels[currentPlan] : -1;
    const isOnTrial = !!currentUser.trialEndsAt && currentUser.subscriptionPlan === 'agency';


    const handleUpdate = async (plan: SubscriptionPlan) => {
        setIsLoading(plan);
        setError(null);

        if (plan === 'free' || (currentPlan && planLevels[plan] < currentLevel) || currentUser.isAdmin) {
            try {
                const cycleToUpdate = plan === 'free' ? undefined : billingCycle;
                await onUpdatePlan(plan, cycleToUpdate);
            } catch (e: any) {
                setError(e.message);
            } finally {
                setIsLoading(null);
            }
            return;
        }

        const planDetails = plans.find(p => p.name === plan);
        if (!planDetails) {
            setError("Selected plan details not found.");
            setIsLoading(null);
            return;
        }

        const priceString = billingCycle === 'monthly' ? planDetails.priceMonthly : planDetails.priceYearly;
        const amount = parseInt(priceString.replace('$', ''));

        // Gateway logic
        const activeGateway = globalSettings?.activePaymentGateway;
        const isPaystackConnected = activeGateway === 'paystack' && globalSettings?.paystackConnection?.status === 'connected';
        const isPayfastConnected = activeGateway === 'payfast' && globalSettings?.payfastConnection?.status === 'connected';
        const isWiseConnected = activeGateway === 'wise' && globalSettings?.wiseConnection?.status === 'connected';
        const isPayoneerConnected = activeGateway === 'payoneer' && globalSettings?.payoneerConnection?.status === 'connected';
        const isStripeConnected = activeGateway === 'stripe' && globalSettings?.stripeConnection?.status === 'connected';
        const isPayPalConnected = activeGateway === 'paypal' && globalSettings?.payPalConnection?.status === 'connected';


        if (!isPaystackConnected && !isPayfastConnected && !isWiseConnected && !isPayoneerConnected && !isStripeConnected && !isPayPalConnected) {
            setError("No payment gateway is configured for this site. Please contact the administrator.");
            setIsLoading(null);
            return;
        }
        
        setIsRedirecting(true);

        // --- Paystack Flow ---
        if (isPaystackConnected) {
            const paystackOptions = {
                key: globalSettings.paystackConnection!.publicKey,
                email: currentUser.email,
                amount: amount * 100, // Paystack expects amount in lowest currency unit (e.g., kobo/cents)
                ref: `zenith_${crypto.randomUUID()}`,
                callback: (response: any) => {
                    console.log("Paystack payment successful, reference:", response.reference);
                    onUpdatePlan(plan, billingCycle);
                    setIsLoading(null);
                    setIsRedirecting(false);
                },
                onClose: () => {
                    console.log("Paystack payment popup closed.");
                    setIsLoading(null);
                    setIsRedirecting(false);
                }
            };

            const handler = window.PaystackPop.setup(paystackOptions);
            handler.openIframe();
            return;
        }

        // --- Payfast Flow ---
        if (isPayfastConnected) {
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = 'https://www.payfast.co.za/eng/process';
            form.style.display = 'none';

            const fields = {
                merchant_id: globalSettings.payfastConnection!.merchantId,
                merchant_key: globalSettings.payfastConnection!.merchantKey,
                return_url: `${window.location.origin}${window.location.pathname}?payment_status=success&plan=${plan}&cycle=${billingCycle}`,
                cancel_url: `${window.location.origin}${window.location.pathname}?payment_status=cancelled`,
                notify_url: `${window.location.origin}${window.location.pathname}?payment_notify=true`, // Required by Payfast
                name_first: currentUser.firstName || '',
                name_last: currentUser.lastName || '',
                email_address: currentUser.email,
                amount: amount.toFixed(2),
                item_name: `Zenith Engine AI - ${planDetails.title} (${billingCycle})`,
            };
            
            for (const key in fields) {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = (fields as any)[key];
                form.appendChild(input);
            }
            
            document.body.appendChild(form);
            form.submit();
            return;
        }
        
        // --- Wise Flow (Simulated) ---
        if (isWiseConnected) {
            console.log(`[Wise Sim] Initiating payment for plan ${plan} (${billingCycle}).`);
            setTimeout(() => {
                console.log("[Wise Sim] Payment successful.");
                onUpdatePlan(plan, billingCycle);
                setIsLoading(null);
                setIsRedirecting(false);
            }, 3000); // Simulate 3 second payment process
            return;
        }

        // --- Payoneer Flow (Simulated) ---
        if (isPayoneerConnected) {
            console.log(`[Payoneer Sim] Initiating payment for plan ${plan} (${billingCycle}).`);
            setTimeout(() => {
                console.log("[Payoneer Sim] Payment successful.");
                onUpdatePlan(plan, billingCycle);
                setIsLoading(null);
                setIsRedirecting(false);
            }, 3000); // Simulate 3 second payment process
            return;
        }

        // --- Stripe Flow (Simulated) ---
        if (isStripeConnected) {
            console.log(`[Stripe Sim] Initiating payment for plan ${plan} (${billingCycle}).`);
            setTimeout(() => {
                console.log("[Stripe Sim] Payment successful.");
                onUpdatePlan(plan, billingCycle);
                setIsLoading(null);
                setIsRedirecting(false);
            }, 3000); // Simulate 3 second payment process
            return;
        }

        // --- PayPal Flow (Simulated) ---
        if (isPayPalConnected) {
            console.log(`[PayPal Sim] Redirecting to PayPal for plan ${plan} (${billingCycle}).`);
            setTimeout(() => {
                console.log("[PayPal Sim] Payment successful.");
                onUpdatePlan(plan, billingCycle);
                setIsLoading(null);
                setIsRedirecting(false);
            }, 3000); // Simulate 3 second payment process
            return;
        }
        
        setError("Could not initiate payment. Please check gateway configuration.");
        setIsLoading(null);
        setIsRedirecting(false);
    };

    const getCtaText = (plan: typeof plans[0]) => {
        const planLevel = planLevels[plan.name];

        if (isOnTrial) {
            if (plan.name === 'free') return 'Switch to Free Plan';
            return `Subscribe to ${plan.title}`;
        }
        
        // Non-trial user logic
        if (plan.name === currentPlan) {
            if (plan.name !== 'free' && billingCycle !== (currentUser.subscriptionCycle || 'monthly')) {
                return `Switch to ${billingCycle === 'monthly' ? 'Monthly' : 'Yearly'}`;
            }
            return 'Your Current Plan';
        }
    
        if (currentPlan) { // User has a plan
            if (planLevel < currentLevel) {
                return plan.name === 'free' ? 'Downgrade to Free' : 'Downgrade Unavailable';
            }
            return `Upgrade to ${plan.title}`;
        }
        
        // User has no plan yet
        if (plan.name === 'free') {
            return 'Start for Free';
        }
        return `Start with ${plan.title}`;
    };

    return (
        <>
            {error && (
                <div className="bg-red-900/50 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm mb-6">
                    {error}
                </div>
            )}
            <div className="text-center mb-12">
                <h1 className="text-4xl font-extrabold tracking-tight text-main sm:text-5xl">
                    Find the Perfect Plan
                </h1>
                <p className="mt-4 text-lg text-text-secondary max-w-2xl mx-auto">
                    From your first post to a global content empire, we have a plan that fits your needs.
                </p>
                <div className="mt-8 flex justify-center items-center gap-4">
                     <span className={`font-semibold transition-colors ${billingCycle === 'monthly' ? 'text-main' : 'text-text-secondary'}`}>
                        Monthly
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={billingCycle === 'yearly'} onChange={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')} />
                        <div className="w-11 h-6 bg-gray-600/50 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                    </label>
                     <span className={`font-semibold transition-colors ${billingCycle === 'yearly' ? 'text-main' : 'text-text-secondary'}`}>
                        Yearly
                    </span>
                    <span className={`ml-2 bg-brand-primary/20 text-brand-primary text-xs font-bold px-2 py-1 rounded-full transition-opacity duration-300 ${billingCycle === 'yearly' ? 'opacity-100' : 'opacity-0'}`}>
                        SAVE 16%
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-start">
                {plans.map((plan) => {
                    const isFree = plan.name === 'free';
                    const price = isFree ? '$0' : (billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly);
                    const pricePeriod = isFree ? ' Forever' : (billingCycle === 'monthly' ? ' / mo' : ' / year');
                    
                    const ctaText = getCtaText(plan);
                    // On trial, no plan is "current" for subscription purposes. All are actionable.
                    const isCurrent = !isOnTrial && (plan.name === currentPlan && (isFree || billingCycle === (currentUser.subscriptionCycle || 'monthly')));
                    const isActionable = !isCurrent && ctaText !== 'Downgrade Unavailable';
                    const isDisabled = isCurrent || isLoading === plan.name || !isActionable || isRedirecting;

                    let buttonText = ctaText;
                    if (isLoading === plan.name) {
                        buttonText = isRedirecting ? 'Redirecting...' : 'Processing...';
                    }

                    let buttonClasses = 'btn w-full mt-8 py-3 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed';
                    if (isCurrent) {
                        buttonClasses += ' bg-gray-700/50 text-text-secondary cursor-default';
                    } else if (!isActionable) {
                         buttonClasses += ' bg-gray-800/60 text-text-secondary cursor-not-allowed';
                    } else if (plan.isFeatured) {
                        buttonClasses += ' btn-primary'; // Featured gets brand primary
                    } else if (isOnTrial && plan.name !== 'free') {
                        buttonClasses += ' btn-primary';
                    } else {
                        buttonClasses += ' btn-secondary';
                    }

                    return (
                        <div key={plan.name} className={`bg-panel/50 rounded-2xl border ${plan.isFeatured && isActionable ? 'border-brand-primary shadow-2xl shadow-brand-primary/10' : 'border-border'} p-8 flex flex-col h-full transition-opacity ${!isActionable && !isCurrent ? 'opacity-60' : ''}`}>
                            {plan.isFeatured && isActionable && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><span className="bg-brand-primary text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">Most Popular</span></div>}
                            <h3 className="text-2xl font-bold text-main">{plan.title}</h3>
                            <div className="mt-4 flex flex-col">
                                <div className="flex items-baseline">
                                    <p className="text-4xl font-extrabold text-main">{price}</p>
                                    <span className="ml-2 text-lg font-medium text-text-secondary">{pricePeriod}</span>
                                </div>
                                {(billingCycle === 'yearly' && plan.yearlyDiscount && !isFree) ? <p className="text-sm font-semibold text-brand-primary mt-1">{plan.yearlyDiscount}</p> : <div className="h-[20px] mt-1"></div>}
                            </div>
                            <p className="text-sm text-text-secondary mt-2 min-h-12">{plan.description}</p>
                            
                            <div className="flex-grow">
                                <ul className="mt-8 space-y-4 text-sm text-text-secondary">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className={`flex items-start gap-3 ${feature.toLowerCase().includes('plus:') ? 'pt-4 border-t border-border-subtle' : ''}`}>
                                            {feature.toLowerCase().includes('plus:') ? <span className="flex-shrink-0 font-bold text-main">{feature}</span> : <><CheckCircleIcon className="h-5 w-5 text-brand-primary flex-shrink-0 mt-px" /><span>{feature}</span></>}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            
                            <button onClick={() => handleUpdate(plan.name)} disabled={isDisabled} className={buttonClasses}>
                                {isLoading === plan.name && (
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                )}
                                {buttonText}
                                {isActionable && isLoading !== plan.name && <ArrowRightIcon className="h-5 w-5 ml-2" />}
                            </button>

                        </div>
                    );
                })}
            </div>
        </>
    );
};

const ManagementDashboardView: React.FC<{
    currentUser: User;
    onUpdatePlan: (plan: SubscriptionPlan, cycle?: 'monthly' | 'yearly') => Promise<void>;
}> = ({ currentUser, onUpdatePlan }) => {
    const [isChangingPlan, setIsChangingPlan] = useState(false);
    
    const currentPlanDetails = plans.find(p => p.name === (currentUser.subscriptionPlan || 'free'));
    if (!currentPlanDetails) return null; // Should not happen

    const currentPlanIconDetails = planDetailsForIcons[currentPlanDetails.name];
    const PlanIcon = currentPlanIconDetails.icon;

    const nextBillingDate = new Date(currentUser.monthlyGenerations?.resetDate || Date.now());
    nextBillingDate.setDate(nextBillingDate.getDate() + 30);
    
    const used = currentUser.monthlyGenerations?.count || 0;
    const limit = currentPlanDetails.generationLimit;
    const usagePercentage = limit === 'Unlimited' ? 100 : (used / (limit as number)) * 100;
    
    return (
        <div className="space-y-8">
            <div className="text-center">
                <h1 className="text-4xl font-extrabold tracking-tight text-main sm:text-5xl">
                    Subscription Management
                </h1>
                <p className="mt-4 text-lg text-text-secondary max-w-2xl mx-auto">
                    View your current plan, monitor usage, and make changes to your subscription.
                </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 bg-panel/50 p-8 rounded-2xl border border-border space-y-6">
                     <h3 className="text-xl font-bold text-main">Current Plan</h3>
                     <div className="p-6 bg-panel rounded-lg border border-brand-primary/30">
                        <div className="flex justify-between items-start">
                             <div>
                                <p className="text-2xl font-bold text-brand-primary">{currentPlanDetails.title}</p>
                                <p className="text-text-secondary mt-1">Billed {currentUser.subscriptionCycle || 'monthly'}</p>
                             </div>
                             <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${currentPlanIconDetails.colorClasses.split(' ').filter(c => c.startsWith('bg-') || c.startsWith('border-')).join(' ')}`}>
                                 <PlanIcon className={`h-8 w-8 ${currentPlanIconDetails.colorClasses.split(' ')[0]}`} />
                             </div>
                        </div>
                         <div className="mt-6 pt-4 border-t border-border-subtle text-sm text-text-secondary">
                             Next billing date: {nextBillingDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                         </div>
                     </div>
                     <div>
                        <h4 className="font-semibold text-text-primary mb-2">Usage This Cycle</h4>
                        <div className="p-4 bg-panel rounded-lg">
                             <div className="flex justify-between items-center text-sm text-text-secondary mb-1">
                                <span>Monthly Generations</span>
                                <span>{used} / {limit === 'Unlimited' ? '∞' : limit}</span>
                            </div>
                            <div className="w-full bg-gray-700/50 rounded-full h-3">
                                <div className="bg-brand-primary h-3 rounded-full" style={{width: `${usagePercentage}%`}}></div>
                            </div>
                             <p className="text-xs text-text-secondary mt-2">Your generation count resets on {nextBillingDate.toLocaleDateString()}.</p>
                        </div>
                     </div>
                </div>
                <div className="bg-panel/50 p-8 rounded-2xl border border-border flex flex-col justify-center items-center gap-6">
                    <CreditCardIcon className="h-12 w-12 text-brand-primary" />
                    <h3 className="text-xl font-bold text-main">Billing</h3>
                    <p className="text-sm text-text-secondary text-center">Manage your payment methods and view invoices through our secure billing portal.</p>
                    <button className="w-full btn btn-secondary" disabled>Manage Billing</button>
                    <button onClick={() => setIsChangingPlan(true)} className="w-full btn btn-primary">Change Plan</button>
                </div>
            </div>
             {isChangingPlan && (
                <div className="mt-8 pt-8 border-t border-border">
                    <PlanSelectionView currentUser={currentUser} onUpdatePlan={onUpdatePlan} />
                </div>
            )}
        </div>
    );
};

export const SubscriptionPage: React.FC<SubscriptionPageProps> = (props) => {
    const isSubscribed = props.currentUser.subscriptionPlan && props.currentUser.subscriptionPlan !== 'free';
    const [paymentSuccessMessage, setPaymentSuccessMessage] = useState<string | null>(null);
    const isOnTrial = !!props.currentUser.trialEndsAt && props.currentUser.subscriptionPlan === 'agency';


    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const status = params.get('payment_status');
        const plan = params.get('plan') as SubscriptionPlan | null;
        const cycle = params.get('cycle') as 'monthly' | 'yearly' | null;

        if (status === 'success' && plan && cycle) {
            props.onUpdatePlan(plan, cycle).then(() => {
                setPaymentSuccessMessage(`Your subscription has been successfully upgraded to the ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan!`);
            });
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (status === 'cancelled') {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [props.onUpdatePlan]);

    return (
        <div className="max-w-6xl mx-auto">
             <TabGuide title="Manage Your Subscription">
                <p>Upgrade, downgrade, or view the features of your current plan. Choose the plan that best fits your content creation needs.</p>
            </TabGuide>
            {paymentSuccessMessage && (
                <div className="bg-green-900/50 border border-green-500/50 text-green-200 px-4 py-3 rounded-lg text-sm mb-6 flex items-center gap-3">
                    <CheckCircleIcon className="h-5 w-5" />
                    {paymentSuccessMessage}
                </div>
            )}
            {isSubscribed && !isOnTrial ? <ManagementDashboardView {...props} /> : <PlanSelectionView {...props} />}
        </div>
    );
};
