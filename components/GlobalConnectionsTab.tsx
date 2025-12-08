
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { Site, SocialMediaSettings, SupabaseConnection, PaystackConnection, PayfastConnection, WiseConnection, GlobalSettings, PayoneerConnection, StripeConnection, PayPalConnection } from '../types';
import { LightbulbIcon, XIcon, CreditCardIcon, SparklesIcon, GoogleIcon, EyeIcon, EyeSlashIcon, UserIcon, KeyIcon, CheckCircleIcon } from './Icons';
import * as aiService from '../services/aiService';

interface GlobalConnectionsTabProps {
    sites: Site[];
    settings: GlobalSettings;
    onUpdateSettings: (updates: Partial<GlobalSettings>) => void;
    onVerifySupabase: (connection: SupabaseConnection) => Promise<void>;
    onVerifyPaystack: (connection: PaystackConnection) => Promise<void>;
    onVerifyPayfast: (connection: PayfastConnection) => Promise<void>;
    onVerifyWise: (connection: WiseConnection) => Promise<void>;
    onVerifyPayoneer: (connection: PayoneerConnection) => Promise<void>;
    onVerifyStripe: (connection: StripeConnection) => Promise<void>;
    onVerifyPayPal: (connection: PayPalConnection) => Promise<void>;
    setError: (error: string | null) => void;
}

const TabGuide: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => {
    const [isVisible, setIsVisible] = useState(true);
    if (!isVisible) return null;
    return (
        <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/30 mb-8 flex items-start gap-4 animate-fade-in">
            <LightbulbIcon className="h-6 w-6 text-blue-300 flex-shrink-0 mt-1" />
            <div className="flex-1">
                <h3 className="font-bold text-main">{title}</h3>
                <div className="text-sm text-blue-200/80 mt-1">
                    {children}
                </div>
            </div>
            <button onClick={() => setIsVisible(false)} className="p-1.5 text-blue-200/60 hover:text-main rounded-full">
                <XIcon className="h-5 w-5" />
            </button>
        </div>
    );
};

const Panel: React.FC<{ title: string; description: string; icon: React.FC<any>; iconColorClass?: string; children: React.ReactNode; }> = ({ title, description, icon: Icon, iconColorClass = 'text-blue-300', children }) => (
    <div className="bg-panel/50 p-6 rounded-2xl border border-border">
        <div className="flex items-start gap-4 mb-6">
            <div className="p-3 rounded-lg bg-blue-600/20 border border-blue-500/30 flex-shrink-0">
                <Icon className={`h-6 w-6 ${iconColorClass}`} />
            </div>
            <div>
                <h3 className="text-xl font-bold text-main">{title}</h3>
                <p className="text-sm text-text-secondary mt-1">{description}</p>
            </div>
        </div>
        {children}
    </div>
);

const SecretInput: React.FC<{ value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder: string; }> = ({ value, onChange, placeholder }) => {
    const [isVisible, setIsVisible] = useState(false);
    return (
        <div className="relative">
            <input type={isVisible ? "text" : "password"} value={value} onChange={onChange} placeholder={placeholder} className="input-base w-full pr-10" />
            <button type="button" onClick={() => setIsVisible(!isVisible)} className="absolute inset-y-0 right-0 px-3 flex items-center text-text-secondary hover:text-main" title={isVisible ? "Hide" : "Show"}>
                {isVisible ? <EyeSlashIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
            </button>
        </div>
    );
};

const GoogleAuthPanel: React.FC<{
    settings: GlobalSettings;
    onUpdateSettings: (updates: Partial<GlobalSettings>) => void;
}> = ({ settings, onUpdateSettings }) => {
    return (
        <Panel
            title="Google Sign-In Credentials"
            description="Configure the OAuth credentials used for the main 'Sign in with Google' button on the login page."
            icon={GoogleIcon}
            iconColorClass="text-blue-500"
        >
            <div className="space-y-4">
                <p className="text-xs text-text-secondary">
                    Create OAuth 2.0 credentials in your Google Cloud Console. <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Get Credentials</a>
                </p>
                <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Client ID</label>
                    <input type="text" value={settings.googleAuthClientId || ''} onChange={(e) => onUpdateSettings({ googleAuthClientId: e.target.value })} placeholder="Google Auth Client ID" className="input-base w-full" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Client Secret</label>
                    <SecretInput value={settings.googleAuthClientSecret || ''} onChange={(e) => onUpdateSettings({ googleAuthClientSecret: e.target.value })} placeholder="Google Auth Client Secret" />
                </div>
            </div>
        </Panel>
    );
};

const GoogleGeminiPanel: React.FC<{
    apiKey: string;
    onApiKeyChange: (value: string) => void;
    onVerify: (apiKey: string) => void;
    status: { status: 'idle' | 'verifying' | 'valid' | 'invalid', message?: string };
    apiSpend: number;
}> = ({ apiKey, onApiKeyChange, onVerify, status, apiSpend }) => {
    const isVerifying = status.status === 'verifying';
    
    const statusInfo = {
        idle: { color: 'bg-gray-500', text: 'Not Verified' },
        verifying: { color: 'bg-yellow-500 animate-pulse', text: 'Verifying...' },
        valid: { color: 'bg-green-500', text: 'Verified' },
        invalid: { color: 'bg-red-500', text: 'Invalid' },
    };
    const currentStatus = statusInfo[status.status];
    
    return (
        <Panel
            title="Google Gemini API"
            description="Set a global default Google API key. This will be used for all sites that don't have a site-specific key configured."
            icon={SparklesIcon}
            iconColorClass="text-purple-400"
        >
            <div className="space-y-4">
                 <p className="text-xs text-text-secondary">
                    Get your API key from Google AI Studio. This key will act as a fallback if no site-specific key is provided.
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline ml-1">Get API Key</a>
                </p>
                <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Global Gemini API Key</label>
                    <SecretInput 
                        value={apiKey} 
                        onChange={e => onApiKeyChange(e.target.value)} 
                        placeholder="Your global Google API Key" 
                    />
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs">
                        <div className={`w-2 h-2 rounded-full ${currentStatus.color}`}></div>
                        <span className={`${status.status === 'valid' ? 'text-green-300' : status.status === 'invalid' ? 'text-red-300' : 'text-text-secondary'}`}>{status.message || currentStatus.text}</span>
                    </div>
                    <button onClick={() => onVerify(apiKey)} disabled={isVerifying} className="btn btn-secondary text-sm disabled:opacity-50">{isVerifying ? 'Verifying...' : 'Verify Key'}</button>
                </div>
            </div>
            <div className="mt-6 pt-4 border-t border-border-subtle">
                <h4 className="text-sm font-medium text-text-primary mb-2">Live API Spend (Global Key)</h4>
                <div className="bg-panel-light p-4 rounded-lg flex items-center justify-between">
                    <p className="text-text-secondary text-sm">Estimated spend for all sites using this key:</p>
                    <p className="text-2xl font-bold text-blue-300">${apiSpend.toFixed(5)}</p>
                </div>
            </div>
        </Panel>
    );
};


const PaystackPanel: React.FC<{
    connection: PaystackConnection;
    onConnectionChange: (updates: Partial<PaystackConnection>) => void;
    onVerifyPaystack: (connection: PaystackConnection) => Promise<void>;
}> = ({ connection, onConnectionChange, onVerifyPaystack }) => {
    const isVerifying = connection.statusMessage?.includes('...');

    return (
        <div className="space-y-4">
            <p className="text-xs text-text-secondary">Find your keys in your Paystack Dashboard under Settings &gt; API Keys & Webhooks. <a href="https://dashboard.paystack.com/#/settings/developer" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-400 hover:underline">Get Credentials</a></p>
            <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Public Key</label>
                <input type="text" value={connection.publicKey} onChange={e => onConnectionChange({ publicKey: e.target.value })} placeholder="pk_live_..." className="input-base w-full" />
            </div>
            <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Secret Key</label>
                <SecretInput value={connection.secretKey} onChange={e => onConnectionChange({ secretKey: e.target.value })} placeholder="sk_live_..." />
            </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                    <div className={`w-2 h-2 rounded-full ${connection.status === 'connected' ? 'bg-green-400' : connection.status === 'error' ? 'bg-red-400' : 'bg-gray-500'}`}></div>
                    <span className={`${connection.status === 'connected' ? 'text-green-300' : connection.status === 'error' ? 'text-red-300' : 'text-text-secondary'}`}>{connection.statusMessage || connection.status}</span>
                </div>
                <button onClick={() => onVerifyPaystack(connection)} disabled={isVerifying} className="btn btn-secondary text-sm disabled:opacity-50">{isVerifying ? 'Verifying...' : 'Verify'}</button>
            </div>
        </div>
    );
};

const PayfastPanel: React.FC<{
    connection: PayfastConnection;
    onConnectionChange: (updates: Partial<PayfastConnection>) => void;
    onVerifyPayfast: (connection: PayfastConnection) => Promise<void>;
}> = ({ connection, onConnectionChange, onVerifyPayfast }) => {
    const isVerifying = connection.statusMessage?.includes('...');

    return (
        <div className="space-y-4">
            <p className="text-xs text-text-secondary">Find your keys on your Payfast Dashboard under Settings &gt; Integration. <a href="https://www.payfast.co.za/user/settings/integration" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-400 hover:underline">Get Credentials</a></p>
            <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Merchant ID</label>
                <input type="text" value={connection.merchantId} onChange={e => onConnectionChange({ merchantId: e.target.value })} placeholder="Your Merchant ID" className="input-base w-full" />
            </div>
            <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Merchant Key</label>
                <SecretInput value={connection.merchantKey} onChange={e => onConnectionChange({ merchantKey: e.target.value })} placeholder="Your Merchant Key" />
            </div>
            <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Passphrase (Optional)</label>
                <SecretInput value={connection.passphrase || ''} onChange={e => onConnectionChange({ passphrase: e.target.value })} placeholder="Your security passphrase" />
            </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                    <div className={`w-2 h-2 rounded-full ${connection.status === 'connected' ? 'bg-green-400' : connection.status === 'error' ? 'bg-red-400' : 'bg-gray-500'}`}></div>
                    <span className={`${connection.status === 'connected' ? 'text-green-300' : connection.status === 'error' ? 'text-red-300' : 'text-text-secondary'}`}>{connection.statusMessage || connection.status}</span>
                </div>
                <button onClick={() => onVerifyPayfast(connection)} disabled={isVerifying} className="btn btn-secondary text-sm disabled:opacity-50">{isVerifying ? 'Verifying...' : 'Verify'}</button>
            </div>
        </div>
    );
};

const WisePanel: React.FC<{
    connection: WiseConnection;
    onConnectionChange: (updates: Partial<WiseConnection>) => void;
    onVerifyWise: (connection: WiseConnection) => Promise<void>;
}> = ({ connection, onConnectionChange, onVerifyWise }) => {
    const isVerifying = connection.statusMessage?.includes('...');

    return (
        <div className="space-y-4">
            <p className="text-xs text-text-secondary">Generate an API token in your Wise account settings. <a href="https://wise.com/ph/business/api" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-400 hover:underline">Get API Token</a></p>
            <div>
                <label className="block text-sm font-medium text-text-primary mb-1">API Token</label>
                <SecretInput value={connection.apiKey} onChange={e => onConnectionChange({ apiKey: e.target.value })} placeholder="Your Wise API Token" />
            </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                    <div className={`w-2 h-2 rounded-full ${connection.status === 'connected' ? 'bg-green-400' : connection.status === 'error' ? 'bg-red-400' : 'bg-gray-500'}`}></div>
                    <span className={`${connection.status === 'connected' ? 'text-green-300' : connection.status === 'error' ? 'text-red-300' : 'text-text-secondary'}`}>{connection.statusMessage || connection.status}</span>
                </div>
                <button onClick={() => onVerifyWise(connection)} disabled={isVerifying} className="btn btn-secondary text-sm disabled:opacity-50">{isVerifying ? 'Verifying...' : 'Verify'}</button>
            </div>
        </div>
    );
};

const PayoneerPanel: React.FC<{
    connection: PayoneerConnection;
    onConnectionChange: (updates: Partial<PayoneerConnection>) => void;
    onVerifyPayoneer: (connection: PayoneerConnection) => Promise<void>;
}> = ({ connection, onConnectionChange, onVerifyPayoneer }) => {
    const isVerifying = connection.statusMessage?.includes('...');

    return (
        <div className="space-y-4">
            <p className="text-xs text-text-secondary">Get your API credentials from the Payoneer Partner Portal. <a href="https://partner.payoneer.com/" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-400 hover:underline">Get Credentials</a></p>
            <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Partner ID</label>
                <input type="text" value={connection.partnerId} onChange={e => onConnectionChange({ partnerId: e.target.value })} placeholder="Your Partner ID" className="input-base w-full" />
            </div>
            <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Program ID</label>
                <input type="text" value={connection.programId} onChange={e => onConnectionChange({ programId: e.target.value })} placeholder="Your Program ID" className="input-base w-full" />
            </div>
            <div>
                <label className="block text-sm font-medium text-text-primary mb-1">API Key</label>
                <SecretInput value={connection.apiKey} onChange={e => onConnectionChange({ apiKey: e.target.value })} placeholder="Your API Key" />
            </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                    <div className={`w-2 h-2 rounded-full ${connection.status === 'connected' ? 'bg-green-400' : connection.status === 'error' ? 'bg-red-400' : 'bg-gray-500'}`}></div>
                    <span className={`${connection.status === 'connected' ? 'text-green-300' : connection.status === 'error' ? 'text-red-300' : 'text-text-secondary'}`}>{connection.statusMessage || connection.status}</span>
                </div>
                <button onClick={() => onVerifyPayoneer(connection)} disabled={isVerifying} className="btn btn-secondary text-sm disabled:opacity-50">{isVerifying ? 'Verifying...' : 'Verify'}</button>
            </div>
        </div>
    );
};

const StripePanel: React.FC<{
    connection: StripeConnection;
    onConnectionChange: (updates: Partial<StripeConnection>) => void;
    onVerifyStripe: (connection: StripeConnection) => Promise<void>;
}> = ({ connection, onConnectionChange, onVerifyStripe }) => {
    const isVerifying = connection.statusMessage?.includes('...');

    return (
        <div className="space-y-4">
            <p className="text-xs text-text-secondary">Find your keys in your Stripe Dashboard under Developers &gt; API keys. <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-400 hover:underline">Get Credentials</a></p>
            <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Public Key</label>
                <input type="text" value={connection.publicKey} onChange={e => onConnectionChange({ publicKey: e.target.value })} placeholder="pk_live_..." className="input-base w-full" />
            </div>
            <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Secret Key</label>
                <SecretInput value={connection.secretKey} onChange={e => onConnectionChange({ secretKey: e.target.value })} placeholder="sk_live_..." />
            </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                    <div className={`w-2 h-2 rounded-full ${connection.status === 'connected' ? 'bg-green-400' : connection.status === 'error' ? 'bg-red-400' : 'bg-gray-500'}`}></div>
                    <span className={`${connection.status === 'connected' ? 'text-green-300' : connection.status === 'error' ? 'text-red-300' : 'text-text-secondary'}`}>{connection.statusMessage || connection.status}</span>
                </div>
                <button onClick={() => onVerifyStripe(connection)} disabled={isVerifying} className="btn btn-secondary text-sm disabled:opacity-50">{isVerifying ? 'Verifying...' : 'Verify'}</button>
            </div>
        </div>
    );
};

const PayPalPanel: React.FC<{
    connection: PayPalConnection;
    onConnectionChange: (updates: Partial<PayPalConnection>) => void;
    onVerifyPayPal: (connection: PayPalConnection) => Promise<void>;
}> = ({ connection, onConnectionChange, onVerifyPayPal }) => {
    const isVerifying = connection.statusMessage?.includes('...');

    return (
        <div className="space-y-4">
            <p className="text-xs text-text-secondary">Create a REST API app in the PayPal Developer Dashboard. <a href="https://developer.paypal.com/dashboard/applications" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-400 hover:underline">Get Credentials</a></p>
            <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Client ID</label>
                <input type="text" value={connection.clientId} onChange={e => onConnectionChange({ clientId: e.target.value })} placeholder="Your PayPal Client ID" className="input-base w-full" />
            </div>
            <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Client Secret</label>
                <SecretInput value={connection.clientSecret} onChange={e => onConnectionChange({ clientSecret: e.target.value })} placeholder="Your PayPal Client Secret" />
            </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                    <div className={`w-2 h-2 rounded-full ${connection.status === 'connected' ? 'bg-green-400' : connection.status === 'error' ? 'bg-red-400' : 'bg-gray-500'}`}></div>
                    <span className={`${connection.status === 'connected' ? 'text-green-300' : connection.status === 'error' ? 'text-red-300' : 'text-text-secondary'}`}>{connection.statusMessage || connection.status}</span>
                </div>
                <button onClick={() => onVerifyPayPal(connection)} disabled={isVerifying} className="btn btn-secondary text-sm disabled:opacity-50">{isVerifying ? 'Verifying...' : 'Verify'}</button>
            </div>
        </div>
    );
};

const SupabasePanel: React.FC<{
    connection: SupabaseConnection;
    onConnectionChange: (updates: Partial<SupabaseConnection>) => void;
    onVerifySupabase: (connection: SupabaseConnection) => Promise<void>;
}> = ({ connection, onConnectionChange, onVerifySupabase }) => {
    const isVerifying = connection.statusMessage?.includes('...');

    return (
        <Panel
            title="Supabase Integration"
            description="Connect to your Supabase project to enable features like custom user databases and content storage."
            icon={SparklesIcon} // Placeholder icon
            iconColorClass="text-green-400"
        >
            <div className="space-y-4">
                <p className="text-xs text-text-secondary">Find your keys in your Supabase project settings under API. <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-400 hover:underline">Go to Dashboard</a></p>
                <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Project URL</label>
                    <input type="url" value={connection.url} onChange={e => onConnectionChange({ url: e.target.value })} placeholder="https://....supabase.co" className="input-base w-full" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Anon (Public) Key</label>
                    <SecretInput value={connection.anonKey} onChange={e => onConnectionChange({ anonKey: e.target.value })} placeholder="Your Supabase anon key" />
                </div>
                <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2 text-xs">
                        <div className={`w-2 h-2 rounded-full ${connection.status === 'connected' ? 'bg-green-400' : connection.status === 'error' ? 'bg-red-400' : 'bg-gray-500'}`}></div>
                        <span className={`${connection.status === 'connected' ? 'text-green-300' : connection.status === 'error' ? 'text-red-300' : 'text-text-secondary'}`}>{connection.statusMessage || connection.status}</span>
                    </div>
                    <button onClick={() => onVerifySupabase(connection)} disabled={isVerifying} className="btn btn-secondary text-sm disabled:opacity-50">{isVerifying ? 'Verifying...' : 'Verify'}</button>
                </div>
            </div>
        </Panel>
    );
};

export const GlobalConnectionsTab: React.FC<GlobalConnectionsTabProps> = (props) => {
    const { sites, settings, onUpdateSettings, onVerifySupabase, onVerifyPaystack, onVerifyPayfast, onVerifyWise, onVerifyPayoneer, onVerifyStripe, onVerifyPayPal, setError } = props;
    
    const [apiKeyVerificationStatus, setApiKeyVerificationStatus] = useState<{ status: 'idle' | 'verifying' | 'valid' | 'invalid', message?: string }>({ status: 'idle' });

    const handleApiKeyChange = (value: string) => {
        onUpdateSettings({ googleApiKey: value });
        setApiKeyVerificationStatus({ status: 'idle' });
    };

    const handleVerifyApiKey = async (apiKey: string) => {
        if (!apiKey) {
            setError("API key is empty.");
            return;
        }
        setApiKeyVerificationStatus({ status: 'verifying' });
        setError(null);
        try {
            const { success, message } = await aiService.verifyApiKey('google', apiKey);
            setApiKeyVerificationStatus({ status: success ? 'valid' : 'invalid', message });
        } catch (e: any) {
            setApiKeyVerificationStatus({ status: 'invalid', message: e.message });
            setError(e.message);
        }
    };
    
    const globalApiKeySpend = useMemo(() => {
        return sites.reduce((total, site) => {
            if (!site.apiKeys?.google && site.apiUsage?.google) {
                return total + site.apiUsage.google;
            }
            return total;
        }, 0);
    }, [sites]);

    const paymentGateways = [
        { id: 'paystack', name: 'Paystack', component: <PaystackPanel connection={settings.paystackConnection || { publicKey: '', secretKey: '', status: 'disconnected' }} onConnectionChange={(u) => onUpdateSettings({ paystackConnection: {...(settings.paystackConnection || { publicKey: '', secretKey: '', status: 'disconnected' }), ...u} })} onVerifyPaystack={onVerifyPaystack} /> },
        { id: 'payfast', name: 'Payfast', component: <PayfastPanel connection={settings.payfastConnection || { merchantId: '', merchantKey: '', passphrase: '', status: 'disconnected' }} onConnectionChange={(u) => onUpdateSettings({ payfastConnection: {...(settings.payfastConnection || { merchantId: '', merchantKey: '', passphrase: '', status: 'disconnected' }), ...u} })} onVerifyPayfast={onVerifyPayfast} /> },
        { id: 'stripe', name: 'Stripe', component: <StripePanel connection={settings.stripeConnection || { publicKey: '', secretKey: '', status: 'disconnected' }} onConnectionChange={(u) => onUpdateSettings({ stripeConnection: {...(settings.stripeConnection || { publicKey: '', secretKey: '', status: 'disconnected' }), ...u} })} onVerifyStripe={onVerifyStripe} /> },
        { id: 'paypal', name: 'PayPal', component: <PayPalPanel connection={settings.payPalConnection || { clientId: '', clientSecret: '', status: 'disconnected' }} onConnectionChange={(u) => onUpdateSettings({ payPalConnection: {...(settings.payPalConnection || { clientId: '', clientSecret: '', status: 'disconnected' }), ...u} })} onVerifyPayPal={onVerifyPayPal} /> },
        { id: 'wise', name: 'Wise', component: <WisePanel connection={settings.wiseConnection || { apiKey: '', status: 'disconnected' }} onConnectionChange={(u) => onUpdateSettings({ wiseConnection: {...(settings.wiseConnection || { apiKey: '', status: 'disconnected' }), ...u} })} onVerifyWise={onVerifyWise} /> },
        { id: 'payoneer', name: 'Payoneer', component: <PayoneerPanel connection={settings.payoneerConnection || { partnerId: '', programId: '', apiKey: '', status: 'disconnected' }} onConnectionChange={(u) => onUpdateSettings({ payoneerConnection: {...(settings.payoneerConnection || { partnerId: '', programId: '', apiKey: '', status: 'disconnected' }), ...u} })} onVerifyPayoneer={onVerifyPayoneer} /> },
    ];
    
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <TabGuide title="Manage Global Integrations">
                <p>These settings apply across the entire application for all users. Configure global API keys, authentication methods, and payment gateways here.</p>
            </TabGuide>

            <div className="space-y-8">
                 <GoogleAuthPanel settings={settings} onUpdateSettings={onUpdateSettings} />
                 <GoogleGeminiPanel apiKey={settings.googleApiKey || ''} onApiKeyChange={handleApiKeyChange} onVerify={handleVerifyApiKey} status={apiKeyVerificationStatus} apiSpend={globalApiKeySpend} />
                 <SupabasePanel connection={settings.supabaseConnection || { url: '', anonKey: '', status: 'disconnected' }} onConnectionChange={(u) => onUpdateSettings({ supabaseConnection: {...(settings.supabaseConnection || { url: '', anonKey: '', status: 'disconnected' }), ...u} })} onVerifySupabase={onVerifySupabase} />
                
                <Panel
                    title="Payment Gateways"
                    description="Configure payment gateways for user subscriptions. Select one active gateway at a time."
                    icon={CreditCardIcon}
                    iconColorClass="text-green-400"
                >
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-1">Active Gateway</label>
                            <select value={settings.activePaymentGateway || ''} onChange={e => onUpdateSettings({ activePaymentGateway: e.target.value as any })} className="input-base w-full">
                                <option value="">None</option>
                                {paymentGateways.map(gw => (
                                    <option key={gw.id} value={gw.id}>{gw.name}</option>
                                ))}
                            </select>
                        </div>
                        {paymentGateways.map(gw => settings.activePaymentGateway === gw.id && (
                             <div key={gw.id} className="p-4 bg-panel-light border border-border-subtle rounded-lg animate-fade-in">
                                 <h4 className="font-semibold text-main mb-3">{gw.name} Configuration</h4>
                                 {gw.component}
                             </div>
                        ))}
                    </div>
                </Panel>
            </div>
        </div>
    );
};
