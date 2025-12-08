
import React, { useState, useEffect } from 'react';
import type { User, SubscriptionPlan, GlobalSettings } from '../types';
import { CheckCircleIcon, LightbulbIcon, XIcon, CreditCardIcon, ArrowRightIcon, UserIcon, PenIcon, SparklesIcon, BuildingOffice2Icon, LockClosedIcon, Cog6ToothIcon } from './Icons';
import { initiatePaymentTransaction, verifyPaymentTransaction } from '../services/secureBackendSimulation';

declare global {
    interface Window {
        PaystackPop: any;
    }
}

interface SubscriptionPageProps {
    currentUser: User;
    onUpdatePlan: (plan: SubscriptionPlan, cycle?: 'monthly' | 'yearly') => Promise<void>;
}

type Currency = 'USD' | 'ZAR';

const pricingData = {
    free: {
        USD: { monthly: '$0', yearly: '$0' },
        ZAR: { monthly: 'R0', yearly: 'R0' }
    },
    creator: {
        USD: { monthly: '$39', yearly: '$390' },
        ZAR: { monthly: 'R699', yearly: 'R6,990' } // Optimized local pricing
    },
    pro: {
        USD: { monthly: '$99', yearly: '$990' },
        ZAR: { monthly: 'R1,799', yearly: 'R17,990' }
    },
    agency: {
        USD: { monthly: '$249', yearly: '$2490' },
        ZAR: { monthly: 'R4,499', yearly: 'R44,990' }
    }
};

const plans: {
    name: SubscriptionPlan;
    title: string;
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

// Gateway Logic Strategy
const getGatewayForCurrency = (settings: GlobalSettings | null, currency: Currency): 'paystack' | 'payfast' | 'stripe' | 'paypal' | 'wise' | 'payoneer' | null => {
    if (!settings) return null;
    
    // Explicit split: ZAR uses Local gateway, USD uses International gateway
    if (currency === 'ZAR') {
        // Default to PayFast for local if not set, as it's the recommended one
        return settings.localPaymentGateway || 'payfast';
    } else {
        // Default to PayPal for international if not set, as it requires no subscription
        return settings.internationalPaymentGateway || 'paypal';
    }
};

const getPaymentMode = (settings: GlobalSettings | null, currency: Currency): 'live' | 'test' | 'unknown' => {
    const gateway = getGatewayForCurrency(settings, currency);
    if (!gateway) return 'unknown';
    
    if (gateway === 'stripe') {
        return settings?.stripeConnection?.publicKey?.startsWith('pk_live_') ? 'live' : 'test';
    }
    if (gateway === 'paystack') {
        return settings?.paystackConnection?.publicKey?.startsWith('pk_live_') ? 'live' : 'test';
    }
    if (gateway === 'paypal') return 'live'; 
    if (gateway === 'payfast') return 'live'; 
    return 'unknown';
};

const PlanSelectionView: React.FC<{
    currentUser: User;
    onUpdatePlan: (plan: SubscriptionPlan, cycle?: 'monthly' | 'yearly') => Promise<void>;
}> = ({ currentUser, onUpdatePlan }) => {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(currentUser.subscriptionCycle || 'monthly');
    const [currency, setCurrency] = useState<Currency>('USD');
    const [isLoading, setIsLoading] = useState<SubscriptionPlan | null>(null);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);

    useEffect(() => {
        const storedSettings = localStorage.getItem('zenith-engine-ai-global-settings');
        if (storedSettings) {
            setGlobalSettings(JSON.parse(storedSettings));
        }
        
        // Automatic Regional Currency Detection
        try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            // Standard IANA time zone for South Africa
            if (tz === 'Africa/Johannesburg') {
                setCurrency('ZAR');
            } else {
                setCurrency('USD');
            }
        } catch (e) {
            // Default to USD on error
            setCurrency('USD');
        }
    }, []);

    const currentPlan = currentUser.subscriptionPlan;
    const planLevels: Record<SubscriptionPlan, number> = { free: 0, creator: 1, pro: 2, agency: 3 };
    const currentLevel = currentPlan ? planLevels[currentPlan] : -1;
    const isOnTrial = !!currentUser.trialEndsAt && currentUser.subscriptionPlan === 'agency';
    const paymentMode = getPaymentMode(globalSettings, currency);

    const handleUpdate = async (plan: SubscriptionPlan) => {
        setIsLoading(plan);
        setError(null);

        // Free plan or admin bypass
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

        // Get Price
        const priceData = pricingData[plan][currency];
        const priceString = billingCycle === 'monthly' ? priceData.monthly : priceData.yearly;
        const amount = parseInt(priceString.replace(/[^0-9]/g, '')); // Clean string to number

        // Determine the gateway to use based on currency and active settings
        const targetGateway = getGatewayForCurrency(globalSettings, currency);
        
        if (!targetGateway) {
            setError(`No payment gateway configured for ${currency}. Please contact support.`);
            setIsLoading(null);
            return;
        }

        try {
            // Call the secure backend simulation to initiate the transaction
            const response = await initiatePaymentTransaction({
                gateway: targetGateway,
                amount,
                currency,
                plan,
                billingCycle,
                email: currentUser.email,
                globalSettings
            });

            if (!response.success) {
                throw new Error(response.message || "Payment initialization failed.");
            }

            // Handle specific gateway flows
            if (targetGateway === 'paystack') {
                if (window.PaystackPop) {
                    const handler = window.PaystackPop.setup({
                        key: globalSettings?.paystackConnection?.publicKey,
                        email: currentUser.email,
                        amount: amount * 100, // Kobo
                        currency: currency,
                        ref: response.reference || `zenith_${crypto.randomUUID()}`,
                        callback: (res: any) => {
                            onUpdatePlan(plan, billingCycle);
                            setIsLoading(null);
                        },
                        onClose: () => setIsLoading(null)
                    });
                    handler.openIframe();
                } else {
                    // Fallback to redirect if popup fails or is preferred by response
                    if (response.redirectUrl) window.location.href = response.redirectUrl;
                }
            } 
            else if (targetGateway === 'payfast' && response.formFields) {
                // Construct and submit form
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = 'https://www.payfast.co.za/eng/process';
                form.style.display = 'none';
                for (const key in response.formFields) {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = key;
                    input.value = response.formFields[key];
                    form.appendChild(input);
                }
                document.body.appendChild(form);
                setIsRedirecting(true);
                form.submit();
            }
            else if (response.redirectUrl) {
                // Standard Redirect (Stripe, PayPal)
                setIsRedirecting(true);
                window.location.href = response.redirectUrl;
            }
            else if (targetGateway === 'wise' || targetGateway === 'payoneer') {
                // Manual/Invoice flow
                alert(response.message);
                setIsLoading(null);
            }

        } catch (e: any) {
            console.error("Payment Error:", e);
            setError(e.message || "Payment failed to initialize.");
            setIsLoading(null);
            setIsRedirecting(false);
        }
    };

    const getCtaText = (plan: typeof plans[0]) => {
        const planLevel = planLevels[plan.name];

        if (isOnTrial) {
            if (plan.name === 'free') return 'Switch to Free Plan';
            return `Subscribe to ${plan.title}`;
        }
        
        if (plan.name === currentPlan) {
            if (plan.name !== 'free' && billingCycle !== (currentUser.subscriptionCycle || 'monthly')) {
                return `Switch to ${billingCycle === 'monthly' ? 'Monthly' : 'Yearly'}`;
            }
            return 'Your Current Plan';
        }
    
        if (currentPlan) {
            if (planLevel < currentLevel) {
                return plan.name === 'free' ? 'Downgrade to Free' : 'Downgrade Unavailable';
            }
            return `Upgrade to ${plan.title}`;
        }
        
        if (plan.name === 'free') return 'Start for Free';
        return `Start with ${plan.title}`;
    };

    return (
        <>
            {error && (
                <div className="bg-red-900/50 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm mb-6 flex items-center gap-2 animate-fade-in">
                    <XIcon className="h-4 w-4" /> {error}
                </div>
            )}
            <div className="text-center mb-12">
                <h1 className="text-4xl font-extrabold tracking-tight text-main sm:text-5xl">
                    Find the Perfect Plan
                </h1>
                <p className="mt-4 text-lg text-text-secondary max-w-2xl mx-auto">
                    Pricing tailored for global reach and local accessibility.
                </p>
                
                {/* Currency & Cycle Controls */}
                <div className="mt-8 flex flex-col items-center gap-6">
                    <div className="flex gap-2">
                        {/* Region Indicator */}
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-panel border border-border text-xs font-semibold text-text-secondary shadow-sm">
                            {currency === 'ZAR' ? (
                                <><span>🇿🇦</span> Region: South Africa (ZAR)</>
                            ) : (
                                <><span>🇺🇸</span> Region: International (USD)</>
                            )}
                        </div>
                        
                        {/* Payment Mode Indicator */}
                        {paymentMode !== 'unknown' && (
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${paymentMode === 'live' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                                {paymentMode === 'live' ? <LockClosedIcon className="h-3 w-3" /> : <Cog6ToothIcon className="h-3 w-3" />}
                                {paymentMode === 'live' ? 'Secure Live Payment' : 'Test Mode Active'}
                            </div>
                        )}
                    </div>

                    {/* Cycle Toggle */}
                    <div className="flex items-center gap-4">
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-start">
                {plans.map((plan) => {
                    const isFree = plan.name === 'free';
                    const priceObj = pricingData[plan.name][currency];
                    const price = billingCycle === 'monthly' ? priceObj.monthly : priceObj.yearly;
                    const pricePeriod = isFree ? ' Forever' : (billingCycle === 'monthly' ? ' / mo' : ' / year');
                    
                    const ctaText = getCtaText(plan);
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
                        buttonClasses += ' btn-primary';
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
    const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
    const isOnTrial = !!props.currentUser.trialEndsAt && props.currentUser.subscriptionPlan === 'agency';

    // Load global settings to verify payment gateway config
    useEffect(() => {
        const storedSettings = localStorage.getItem('zenith-engine-ai-global-settings');
        if (storedSettings) {
            setGlobalSettings(JSON.parse(storedSettings));
        }
    }, []);

    useEffect(() => {
        const verify = async () => {
            const params = new URLSearchParams(window.location.search);
            const status = params.get('payment_status');
            const plan = params.get('plan') as SubscriptionPlan | null;
            const cycle = params.get('cycle') as 'monthly' | 'yearly' | null;
            
            // If the user lands here with a success status or token, we must verify against the backend simulator
            if ((status === 'success' || params.has('token') || params.has('reference')) && plan && cycle && globalSettings) {
                
                // Determine which gateway was likely used based on params or settings fallback
                let gateway = globalSettings.localPaymentGateway || globalSettings.internationalPaymentGateway;
                if (params.has('token')) gateway = 'paypal'; // Strong signal for PayPal
                if (params.has('reference') || params.has('trxref')) gateway = 'paystack'; // Strong signal for Paystack
                if (params.has('session_id')) gateway = 'stripe'; // Strong signal for Stripe

                if (!gateway) return;

                // Show verification feedback
                setPaymentSuccessMessage("Verifying payment transaction...");
                
                try {
                    const verification = await verifyPaymentTransaction(gateway, params, globalSettings);
                    if (verification.success) {
                        await props.onUpdatePlan(plan, cycle);
                        setPaymentSuccessMessage(`Payment Verified! Subscription upgraded to ${plan.charAt(0).toUpperCase() + plan.slice(1)}.`);
                        // Clean URL to prevent re-verification on refresh
                        window.history.replaceState({}, document.title, window.location.pathname);
                    } else {
                        setPaymentSuccessMessage(null); // Clear optimistic message
                        alert(`Payment verification failed: ${verification.message}`);
                    }
                } catch (e: any) {
                    console.error("Verification error", e);
                    setPaymentSuccessMessage(null);
                    alert(`An error occurred while verifying payment: ${e.message}`);
                }
            } else if (status === 'cancelled') {
                 window.history.replaceState({}, document.title, window.location.pathname);
            }
        };
        
        if (globalSettings) verify();
    }, [props.onUpdatePlan, globalSettings]);

    return (
        <div className="max-w-6xl mx-auto">
             <TabGuide title="Manage Your Subscription">
                <p>Upgrade, downgrade, or view the features of your current plan. Choose the plan that best fits your content creation needs.</p>
            </TabGuide>
            {paymentSuccessMessage && (
                <div className="bg-green-900/50 border border-green-500/50 text-green-200 px-4 py-3 rounded-lg text-sm mb-6 flex items-center gap-3 animate-pulse">
                    <CheckCircleIcon className="h-5 w-5" />
                    {paymentSuccessMessage}
                </div>
            )}
            {isSubscribed && !isOnTrial ? <ManagementDashboardView {...props} /> : <PlanSelectionView {...props} />}
        </div>
    );
};
