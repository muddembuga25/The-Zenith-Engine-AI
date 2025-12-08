
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { Site, SocialMediaSettings, SupabaseConnection, PaystackConnection, PayfastConnection, WiseConnection, GlobalSettings, PayoneerConnection, StripeConnection, PayPalConnection, SocialMediaAccount, WhatsAppAccount, TelegramAccount, ApiKeys, MailchimpSettings, SocialAccountStatus, ConnectionMethod } from '../types';
import * as oauthService from '../services/oauthService';
import { CheckCircleIcon, ExclamationTriangleIcon, TrashIcon, XIconSocial, FacebookIcon, LinkedInIcon, InstagramIcon, PinterestIcon, WhatsAppIcon, YouTubeIcon, TikTokIcon, TelegramIcon, SnapchatIcon, GoogleIcon, ClarityIcon, SparklesIcon, KeyIcon, MailIcon, LinkIcon, XIcon, UserIcon, ShareIcon, ArrowPathIcon, ChartBarIcon, MetaIcon, QuestionMarkCircleIcon, ArrowRightIcon, PenIcon, LightbulbIcon, CreditCardIcon, EyeIcon, EyeSlashIcon, CalendarDaysIcon, BuildingOffice2Icon } from './Icons';
import * as aiService from '../services/aiService';

interface ConnectionsTabProps {
    site: Site;
    onSiteUpdate: (field: keyof Site, value: any) => void;
    onMultipleSiteUpdates: (updates: Partial<Site>) => void;
    isConnectingSocial: string | null;
    setError: (error: string | null) => void;
    onConnect: (platform: any, accountId: string) => void;
    onVerify: (platformId: oauthService.SocialPlatform, accountId: string, accessToken: string) => void;
    onVerifyCredentials: (platform: 'whatsapp' | 'telegram', account: WhatsAppAccount | TelegramAccount) => void;
    onVerifyMailchimp: (settings: MailchimpSettings) => Promise<void>;
    onVerifyClarity: (projectId: string) => Promise<void>;
    onVerifySupabase: (connection: SupabaseConnection) => Promise<void>;
    onVerifyPaystack: (connection: PaystackConnection) => Promise<void>;
    onVerifyPayfast: (connection: PayfastConnection) => Promise<void>;
    onVerifyWise: (connection: WiseConnection) => Promise<void>;
    onVerifyPayoneer: (connection: PayoneerConnection) => Promise<void>;
    onVerifyStripe: (connection: StripeConnection) => Promise<void>;
    onVerifyPayPal: (connection: PayPalConnection) => Promise<void>;
    setActiveTab: (tab: string, subTab?: string | null) => void;
    logApiUsage: (provider: keyof ApiKeys, cost: number) => void;
}

// Brand Color Mapping - Official Brand Colors
const brandStyles: Record<string, { text: string, bg: string, border: string, solid: string, hoverBorder: string }> = {
    meta: { text: 'text-[#0668E1]', bg: 'bg-[#0668E1]/10', border: 'border-[#0668E1]/20', solid: 'bg-[#0668E1]', hoverBorder: 'hover:border-[#0668E1]/50' },
    facebook: { text: 'text-[#1877F2]', bg: 'bg-[#1877F2]/10', border: 'border-[#1877F2]/20', solid: 'bg-[#1877F2]', hoverBorder: 'hover:border-[#1877F2]/50' },
    instagram: { text: 'text-[#E1306C]', bg: 'bg-[#E1306C]/10', border: 'border-[#E1306C]/20', solid: 'bg-[#E1306C]', hoverBorder: 'hover:border-[#E1306C]/50' },
    linkedin: { text: 'text-[#0A66C2]', bg: 'bg-[#0A66C2]/10', border: 'border-[#0A66C2]/20', solid: 'bg-[#0A66C2]', hoverBorder: 'hover:border-[#0A66C2]/50' },
    twitter: { text: 'text-white', bg: 'bg-white/10', border: 'border-white/20', solid: 'bg-white', hoverBorder: 'hover:border-white/50' },
    youtube: { text: 'text-[#FF0000]', bg: 'bg-[#FF0000]/10', border: 'border-[#FF0000]/20', solid: 'bg-[#FF0000]', hoverBorder: 'hover:border-[#FF0000]/50' },
    tiktok: { text: 'text-[#00F2EA]', bg: 'bg-[#00F2EA]/10', border: 'border-[#00F2EA]/20', solid: 'bg-[#00F2EA]', hoverBorder: 'hover:border-[#00F2EA]/50' },
    pinterest: { text: 'text-[#BD081C]', bg: 'bg-[#BD081C]/10', border: 'border-[#BD081C]/20', solid: 'bg-[#BD081C]', hoverBorder: 'hover:border-[#BD081C]/50' },
    snapchat: { text: 'text-[#FFFC00]', bg: 'bg-[#FFFC00]/10', border: 'border-[#FFFC00]/20', solid: 'bg-[#FFFC00]', hoverBorder: 'hover:border-[#FFFC00]/50' },
    whatsapp: { text: 'text-[#25D366]', bg: 'bg-[#25D366]/10', border: 'border-[#25D366]/20', solid: 'bg-[#25D366]', hoverBorder: 'hover:border-[#25D366]/50' },
    telegram: { text: 'text-[#26A5E4]', bg: 'bg-[#26A5E4]/10', border: 'border-[#26A5E4]/20', solid: 'bg-[#26A5E4]', hoverBorder: 'hover:border-[#26A5E4]/50' },
    mailchimp: { text: 'text-[#FFE01B]', bg: 'bg-[#FFE01B]/10', border: 'border-[#FFE01B]/20', solid: 'bg-[#FFE01B]', hoverBorder: 'hover:border-[#FFE01B]/50' },
    google_analytics: { text: 'text-[#E37400]', bg: 'bg-[#E37400]/10', border: 'border-[#E37400]/20', solid: 'bg-[#E37400]', hoverBorder: 'hover:border-[#E37400]/50' },
    google_auth: { text: 'text-[#4285F4]', bg: 'bg-[#4285F4]/10', border: 'border-[#4285F4]/20', solid: 'bg-[#4285F4]', hoverBorder: 'hover:border-[#4285F4]/50' },
    gemini: { text: 'text-[#8E75B2]', bg: 'bg-[#8E75B2]/10', border: 'border-[#8E75B2]/20', solid: 'bg-[#8E75B2]', hoverBorder: 'hover:border-[#8E75B2]/50' },
    supabase: { text: 'text-[#3ECF8E]', bg: 'bg-[#3ECF8E]/10', border: 'border-[#3ECF8E]/20', solid: 'bg-[#3ECF8E]', hoverBorder: 'hover:border-[#3ECF8E]/50' },
    paystack: { text: 'text-[#00C3F7]', bg: 'bg-[#00C3F7]/10', border: 'border-[#00C3F7]/20', solid: 'bg-[#00C3F7]', hoverBorder: 'hover:border-[#00C3F7]/50' },
    payfast: { text: 'text-[#BF0711]', bg: 'bg-[#BF0711]/10', border: 'border-[#BF0711]/20', solid: 'bg-[#BF0711]', hoverBorder: 'hover:border-[#BF0711]/50' },
    wise: { text: 'text-[#9FE870]', bg: 'bg-[#9FE870]/10', border: 'border-[#9FE870]/20', solid: 'bg-[#9FE870]', hoverBorder: 'hover:border-[#9FE870]/50' },
    payoneer: { text: 'text-[#FF4800]', bg: 'bg-[#FF4800]/10', border: 'border-[#FF4800]/20', solid: 'bg-[#FF4800]', hoverBorder: 'hover:border-[#FF4800]/50' },
    stripe: { text: 'text-[#635BFF]', bg: 'bg-[#635BFF]/10', border: 'border-[#635BFF]/20', solid: 'bg-[#635BFF]', hoverBorder: 'hover:border-[#635BFF]/50' },
    paypal: { text: 'text-[#003087]', bg: 'bg-[#003087]/10', border: 'border-[#003087]/20', solid: 'bg-[#003087]', hoverBorder: 'hover:border-[#003087]/50' },
    default: { text: 'text-brand-primary', bg: 'bg-brand-primary/10', border: 'border-brand-primary/20', solid: 'bg-brand-primary', hoverBorder: 'hover:border-brand-primary/50' }
};

const getStyle = (key: string) => brandStyles[key] || brandStyles.default;

const TabGuide: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => {
    const [isVisible, setIsVisible] = useState(true);
    if (!isVisible) return null;
    return (
        <div className="bg-brand-primary/10 p-5 rounded-xl border border-brand-primary/20 shadow-sm mb-8 flex items-start gap-4 animate-fade-in relative overflow-hidden border-y border-r">
            <div className="absolute -right-6 -top-6 opacity-[0.03] pointer-events-none">
                <LightbulbIcon className="h-32 w-32 text-brand-primary" />
            </div>
            <div className="p-2 bg-brand-primary/10 rounded-full flex-shrink-0 relative z-10">
                <LightbulbIcon className="h-5 w-5 text-brand-primary" />
            </div>
            <div className="flex-1 pt-0.5 relative z-10">
                <h3 className="font-bold text-main text-lg">{title}</h3>
                <div className="text-sm text-text-secondary mt-1 leading-relaxed">
                    {children}
                </div>
            </div>
            <button 
                onClick={() => setIsVisible(false)} 
                className="p-1.5 text-text-tertiary hover:text-main rounded-full relative z-10 transition-colors hover:bg-bg-surface-highlight"
            >
                <XIcon className="h-5 w-5" />
            </button>
        </div>
    );
};

const Panel: React.FC<{ title: string; description: string; icon: React.FC<any>; brandKey?: string; children: React.ReactNode; }> = ({ title, description, icon: Icon, brandKey = 'default', children }) => {
    const style = getStyle(brandKey);
    return (
        <div className={`bg-panel/50 p-6 rounded-2xl border ${style.border}`}>
            <div className="flex items-start gap-4 mb-6">
                <div className={`p-3 rounded-lg ${style.bg} border ${style.border} ${style.text} flex-shrink-0`}>
                    <Icon className={`h-6 w-6 ${style.text}`} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-main">{title}</h3>
                    <p className="text-sm text-text-secondary mt-1">{description}</p>
                </div>
            </div>
            {children}
        </div>
    );
};

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

const ConnectionBadge: React.FC<{ isConnected: boolean; label?: string; brandKey?: string }> = ({ isConnected, label, brandKey = 'default' }) => {
    const style = getStyle(brandKey);
    
    if (isConnected) {
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text} border ${style.border} shadow-sm`}>
                <CheckCircleIcon className="h-3.5 w-3.5" />
                {label || 'Verified'}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-800 text-gray-400 border border-gray-700">
            Not Connected
        </span>
    );
};

const CredentialsLink: React.FC<{ href: string; children: React.ReactNode; brandKey?: string }> = ({ href, children, brandKey = 'default' }) => {
    const style = getStyle(brandKey);
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 text-xs font-medium ${style.text} hover:underline ml-1 transition-colors`}>
            {children} <ArrowRightIcon className="h-3 w-3" />
        </a>
    );
};

// --- PLATFORM CONNECTION STRATEGY COMPONENT ---

interface PlatformOption {
    id: ConnectionMethod;
    label: string;
    icon?: React.FC<any>;
    description?: string;
}

const ConnectionMethodSelector: React.FC<{
    options: PlatformOption[];
    selected: ConnectionMethod;
    onSelect: (method: ConnectionMethod) => void;
    brandKey: string;
}> = ({ options, selected, onSelect, brandKey }) => {
    const style = getStyle(brandKey);
    return (
        <div className="flex gap-2 p-1 bg-panel border border-border-subtle rounded-lg mb-4 overflow-x-auto">
            {options.map(opt => (
                <button
                    key={opt.id}
                    onClick={() => onSelect(opt.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                        selected === opt.id 
                        ? `${style.bg} ${style.text} shadow-sm` 
                        : 'text-text-secondary hover:text-main hover:bg-panel-light'
                    }`}
                >
                    {opt.icon && <opt.icon className="h-3.5 w-3.5" />}
                    {opt.label}
                </button>
            ))}
        </div>
    );
};

interface PlatformConnectionCardProps {
    platformKey: string;
    account: SocialMediaAccount | WhatsAppAccount | TelegramAccount; 
    onUpdate: (field: string, value: any) => void;
    onRemove: () => void;
    onConnect: () => void;
    onVerify?: () => void; // Optional verification for credential based
    onFetchAssets?: () => void;
    isConnecting?: boolean;
    options: PlatformOption[];
}

const PlatformConnectionCard: React.FC<PlatformConnectionCardProps> = ({ 
    platformKey, account, onUpdate, onRemove, onConnect, onVerify, onFetchAssets, isConnecting, options 
}) => {
    const style = getStyle(platformKey);
    
    // Ensure default method if not set
    useEffect(() => {
        if (!account.connectionMethod && options.length > 0) {
            onUpdate('connectionMethod', options[0].id);
        }
    }, []);

    const currentMethod = account.connectionMethod || options[0]?.id || 'oauth';
    const acc = account as SocialMediaAccount; // Cast for asset handling

    return (
        <div className={`p-4 bg-panel rounded-lg border ${style.border} ${style.hoverBorder} transition-colors space-y-4`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <input 
                        type="text" 
                        value={account.name} 
                        onChange={(e) => onUpdate('name', e.target.value)}
                        className="input-base px-2 py-1 text-sm font-medium w-40 sm:w-auto"
                        placeholder="Account Name"
                    />
                    <ConnectionBadge isConnected={account.isConnected} label={account.status === 'connected' ? 'Connected' : account.status} brandKey={platformKey} />
                </div>
                <button onClick={onRemove} className="text-red-400 hover:text-red-300 p-1"><TrashIcon className="h-4 w-4" /></button>
            </div>

            <ConnectionMethodSelector 
                options={options} 
                selected={currentMethod} 
                onSelect={(m) => onUpdate('connectionMethod', m)} 
                brandKey={platformKey}
            />

            {/* Dynamic Content based on Method */}
            <div className="space-y-4 animate-fade-in">
                {currentMethod === 'oauth' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-text-secondary mb-1 block">Client ID / Key</label>
                            <input type="text" value={account.clientId || ''} onChange={(e) => onUpdate('clientId', e.target.value)} className="input-base w-full" placeholder="App Client ID" />
                        </div>
                        <div>
                            <label className="text-xs text-text-secondary mb-1 block">Client Secret</label>
                            <SecretInput value={account.clientSecret || ''} onChange={(e) => onUpdate('clientSecret', e.target.value)} placeholder="App Client Secret" />
                        </div>
                    </div>
                )}

                {currentMethod === 'api_key' && (
                    <div className="grid grid-cols-1 gap-4">
                        {platformKey === 'telegram' ? (
                             <>
                                <div><label className="text-xs text-text-secondary mb-1 block">Bot Token</label><SecretInput value={(account as TelegramAccount).botToken} onChange={(e) => onUpdate('botToken', e.target.value)} placeholder="Bot Token" /></div>
                                <div><label className="text-xs text-text-secondary mb-1 block">Chat ID</label><input type="text" value={(account as TelegramAccount).chatId} onChange={(e) => onUpdate('chatId', e.target.value)} className="input-base w-full" placeholder="@channel or ID" /></div>
                             </>
                        ) : platformKey === 'whatsapp' ? (
                             <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="text-xs text-text-secondary mb-1 block">Phone Number ID</label><input type="text" value={(account as WhatsAppAccount).phoneNumberId} onChange={(e) => onUpdate('phoneNumberId', e.target.value)} className="input-base w-full" /></div>
                                    <div><label className="text-xs text-text-secondary mb-1 block">Access Token</label><SecretInput value={(account as WhatsAppAccount).accessToken} onChange={(e) => onUpdate('accessToken', e.target.value)} placeholder="Access Token" /></div>
                                </div>
                                
                                <div className="p-3 bg-panel-light rounded-lg border border-border-subtle space-y-3">
                                    <label className="text-xs font-semibold text-text-secondary block">Message Destination</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['individual', 'group', 'both'] as const).map(mode => (
                                            <button 
                                                key={mode}
                                                onClick={() => onUpdate('targetMode', mode)}
                                                className={`px-3 py-2 text-xs font-medium rounded-md capitalize transition-colors ${(account as WhatsAppAccount).targetMode === mode ? 'bg-green-600 text-white shadow-sm' : 'bg-panel border border-border-subtle text-text-secondary hover:text-white'}`}
                                            >
                                                {mode}
                                            </button>
                                        ))}
                                    </div>

                                    {((account as WhatsAppAccount).targetMode === 'individual' || (account as WhatsAppAccount).targetMode === 'both') && (
                                        <div className="animate-fade-in">
                                            <label className="text-xs text-text-secondary mb-1 block">Recipient Phone Number</label>
                                            <input type="tel" value={(account as WhatsAppAccount).recipientPhone || ''} onChange={(e) => onUpdate('recipientPhone', e.target.value)} className="input-base w-full" placeholder="e.g. 15551234567" />
                                        </div>
                                    )}

                                    {((account as WhatsAppAccount).targetMode === 'group' || (account as WhatsAppAccount).targetMode === 'both') && (
                                        <div className="animate-fade-in">
                                            <label className="text-xs text-text-secondary mb-1 block">Group ID</label>
                                            <input type="text" value={(account as WhatsAppAccount).groupId || ''} onChange={(e) => onUpdate('groupId', e.target.value)} className="input-base w-full" placeholder="e.g. 1203630..." />
                                            <p className="text-[10px] text-text-tertiary mt-1">Found via API or webhook payload.</p>
                                        </div>
                                    )}
                                </div>
                             </>
                        ) : (
                            <div><label className="text-xs text-text-secondary mb-1 block">API Key</label><SecretInput value={account.accessToken || ''} onChange={(e) => onUpdate('accessToken', e.target.value)} placeholder="API Key" /></div>
                        )}
                    </div>
                )}

                {currentMethod === 'url' && (
                    <div>
                        <label className="text-xs text-text-secondary mb-1 block">Profile/Page URL</label>
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><LinkIcon className="h-4 w-4 text-text-tertiary"/></div>
                            <input type="url" value={account.profileUrl || ''} onChange={(e) => onUpdate('profileUrl', e.target.value)} className="input-base w-full pl-9" placeholder={`https://${platformKey}.com/yourpage`} />
                        </div>
                        <p className="text-xs text-yellow-500 mt-1 flex items-center gap-1"><ExclamationTriangleIcon className="h-3 w-3" /> Monitoring public data only. Posting not available via URL.</p>
                    </div>
                )}

                {currentMethod === 'credentials' && (
                    <div className="space-y-3">
                        <div className="p-3 bg-red-900/10 border border-red-500/20 rounded-md text-xs text-red-300">
                            <strong>Security Warning:</strong> Storing passwords is risky. Only use this for test accounts. {account.twoFactorSecret ? "2FA is enabled." : "Use only if 2FA is disabled or provide a Secret."} This method allows for advanced automation.
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="text-xs text-text-secondary mb-1 block">Username/Email</label><input type="text" value={account.username || ''} onChange={(e) => onUpdate('username', e.target.value)} className="input-base w-full" placeholder="Login Username" /></div>
                            <div><label className="text-xs text-text-secondary mb-1 block">Password</label><SecretInput value={account.password || ''} onChange={(e) => onUpdate('password', e.target.value)} placeholder="Login Password" /></div>
                            <div className="md:col-span-2">
                                <label className="text-xs text-text-secondary mb-1 block">2FA Secret Key (Optional)</label>
                                <SecretInput value={account.twoFactorSecret || ''} onChange={(e) => onUpdate('twoFactorSecret', e.target.value)} placeholder="TOTP Secret (e.g. JBSWY3DPEHPK3PXP)" />
                                <p className="text-[10px] text-text-tertiary mt-1">Provide the authenticator secret key to generate 2FA codes automatically and skip simulation limits.</p>
                            </div>
                        </div>
                    </div>
                )}
                
                {currentMethod === 'manual' && platformKey === 'whatsapp' && (
                     <div>
                        <label className="text-xs text-text-secondary mb-1 block">Business Phone Number</label>
                        <input type="tel" value={(account as WhatsAppAccount).phoneNumber || ''} onChange={(e) => onUpdate('phoneNumber', e.target.value)} className="input-base w-full" placeholder="+1 234 567 8900" />
                        <p className="text-[10px] text-text-secondary mt-1">For manual link generation (Click-to-Chat).</p>
                    </div>
                )}
                
                {/* PAGE / ASSET SELECTION AFTER CONNECTION */}
                {account.isConnected && (platformKey === 'linkedin' || platformKey === 'facebook' || platformKey === 'instagram') && onFetchAssets && (
                    <div className="mt-4 pt-4 border-t border-border-subtle animate-fade-in">
                        <label className="text-xs font-semibold text-text-secondary mb-2 block">Target Destination</label>
                        <div className="flex gap-2 items-center">
                            <select 
                                value={acc.destinationId || ''} 
                                onChange={(e) => onUpdate('destinationId', e.target.value)} 
                                className="input-base text-sm w-full"
                            >
                                <option value="">{platformKey === 'linkedin' ? 'Personal Profile' : 'Select a Page/Account...'}</option>
                                {acc.availableAssets?.map(asset => (
                                    <option key={asset.id} value={asset.id}>{asset.name}</option>
                                ))}
                            </select>
                            <button 
                                onClick={onFetchAssets} 
                                className="btn btn-secondary text-xs px-3 py-2 whitespace-nowrap"
                                title="Refresh Pages/Organizations"
                            >
                                <ArrowPathIcon className="h-4 w-4" />
                            </button>
                        </div>
                        <p className="text-[10px] text-text-tertiary mt-1">
                            {acc.availableAssets && acc.availableAssets.length > 0 
                                ? `Found ${acc.availableAssets.length} options.` 
                                : "Click refresh to load available pages or organizations."}
                        </p>
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-border-subtle">
                {(currentMethod === 'api_key' || currentMethod === 'url' || currentMethod === 'credentials' || currentMethod === 'manual') ? (
                    <button 
                        onClick={onVerify || onConnect} 
                        className="btn btn-secondary text-xs px-3 py-1.5"
                    >
                        Verify {currentMethod === 'url' ? 'Link' : 'Credentials'}
                    </button>
                ) : (
                    <button 
                        onClick={onConnect} 
                        className="btn btn-primary text-xs px-3 py-1.5 flex items-center gap-2"
                        disabled={!!isConnecting}
                    >
                        {isConnecting ? 'Connecting...' : (account.isConnected ? 'Reconnect App' : 'Connect App')}
                        <ArrowRightIcon className="h-3 w-3" />
                    </button>
                )}
            </div>
        </div>
    );
};

const SocialPlatformSection: React.FC<{
    platform: keyof SocialMediaSettings;
    title: string;
    icon: any;
    docUrl?: string;
    methods: PlatformOption[];
    accounts: any[];
    onAddAccount: () => void;
    onUpdateAccount: (id: string, field: string, value: any) => void;
    onRemoveAccount: (id: string) => void;
    onConnect: (accountId: string) => void;
    onVerify: (account: any) => void;
    onFetchAssets?: (accountId: string) => void;
    isConnectingSocial: string | null;
}> = ({ 
    platform, title, icon: Icon, docUrl, methods, accounts, 
    onAddAccount, onUpdateAccount, onRemoveAccount, onConnect, onVerify, onFetchAssets, isConnectingSocial 
}) => {
    const style = getStyle(platform);

    return (
        <div className={`bg-panel-light rounded-xl border ${style.border} overflow-hidden transition-all duration-200 hover:shadow-lg`}>
            <div className={`p-5 flex items-center justify-between border-b ${style.border} bg-panel`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${style.bg} border ${style.border} ${style.text}`}>
                        <Icon className={`h-6 w-6`} />
                    </div>
                    <div>
                        <span className="font-semibold text-main block">{title}</span>
                        <span className="text-xs text-text-secondary">Publish & Analyze</span>
                    </div>
                </div>
                <button onClick={onAddAccount} className="btn btn-secondary text-xs py-1.5 px-3">+ Add Account</button>
            </div>
            
            <div className="p-5 space-y-6">
                {accounts.length === 0 && (
                    <p className="text-sm text-text-secondary italic text-center">No accounts connected.</p>
                )}
                
                {accounts.map((account) => (
                    <PlatformConnectionCard
                        key={account.id}
                        platformKey={platform}
                        account={account}
                        onUpdate={(field, val) => onUpdateAccount(account.id, field, val)}
                        onRemove={() => onRemoveAccount(account.id)}
                        onConnect={() => onConnect(account.id)}
                        onVerify={() => onVerify(account)}
                        onFetchAssets={onFetchAssets ? () => onFetchAssets(account.id) : undefined}
                        isConnecting={isConnectingSocial === `${platform}-${account.id}`}
                        options={methods}
                    />
                ))}

                {docUrl && (
                    <div className={`text-xs text-text-secondary bg-panel p-3 rounded-lg border ${style.border} flex items-start gap-2`}>
                        <LightbulbIcon className={`h-4 w-4 ${style.text} mt-0.5 flex-shrink-0`} />
                        <div>
                            Developer credentials required for OAuth/API methods.
                            <CredentialsLink href={docUrl} brandKey={platform}>Get Credentials</CredentialsLink>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export const ConnectionsTab: React.FC<ConnectionsTabProps> = ({ 
    site, onSiteUpdate, onMultipleSiteUpdates, isConnectingSocial, setError, onConnect, onVerify, onVerifyCredentials, 
    onVerifyMailchimp, onVerifyClarity, onVerifySupabase, onVerifyPaystack, onVerifyPayfast, onVerifyWise,
    onVerifyPayoneer, onVerifyStripe, onVerifyPayPal, setActiveTab, logApiUsage 
}) => {

    const metaConnected = site.socialMediaSettings.meta?.[0]?.isConnected;
    const mailchimpConnected = site.mailchimpSettings.isConnected;
    const gaConnected = site.googleAnalyticsSettings.isConnected;

    const addAccount = useCallback((platform: keyof SocialMediaSettings) => {
        const newAccount: SocialMediaAccount = {
            id: crypto.randomUUID(),
            name: `New ${platform.charAt(0).toUpperCase() + platform.slice(1)} Account`,
            isAutomationEnabled: true,
            isConnected: false,
            status: 'disconnected',
            connectionMethod: 'oauth',
            destinationType: 'profile'
        };
        
        let newSettings = { ...site.socialMediaSettings };

        if (platform === 'whatsapp') {
             const newWa: WhatsAppAccount = { 
                 ...newAccount, 
                 phoneNumberId: '', 
                 destination: '', // Legacy
                 destinationType: 'number', // Legacy
                 targetMode: 'individual',
                 accessToken: '', 
                 connectionMethod: 'api_key' 
             };
             newSettings = { ...newSettings, [platform]: [...(newSettings[platform] || []), newWa] };
        } else if (platform === 'telegram') {
             const newTg: TelegramAccount = { ...newAccount, botToken: '', chatId: '', connectionMethod: 'api_key' };
             newSettings = { ...newSettings, [platform]: [...(newSettings[platform] || []), newTg] };
        } else {
             newSettings = { ...newSettings, [platform]: [...(newSettings[platform] as any[] || []), newAccount] };
        }
        
        onSiteUpdate('socialMediaSettings', newSettings);
    }, [site.socialMediaSettings, onSiteUpdate]);

    const removeAccount = useCallback((platform: keyof SocialMediaSettings, id: string) => {
        const currentAccounts = site.socialMediaSettings[platform] as any[];
        if (Array.isArray(currentAccounts)) {
            onSiteUpdate('socialMediaSettings', { ...site.socialMediaSettings, [platform]: currentAccounts.filter(a => a.id !== id) });
        }
    }, [site.socialMediaSettings, onSiteUpdate]);

    const updateAccount = useCallback((platform: keyof SocialMediaSettings, id: string, field: string, value: any) => {
        const currentAccounts = site.socialMediaSettings[platform] as any[];
        if (Array.isArray(currentAccounts)) {
            const updatedAccounts = currentAccounts.map(acc => acc.id === id ? { ...acc, [field]: value } : acc);
            onSiteUpdate('socialMediaSettings', { ...site.socialMediaSettings, [platform]: updatedAccounts });
        }
    }, [site.socialMediaSettings, onSiteUpdate]);
    
    const handleFetchAssets = useCallback(async (platform: keyof SocialMediaSettings, accountId: string) => {
        const account = (site.socialMediaSettings[platform] as any[]).find(a => a.id === accountId);
        if (!account || !account.accessToken) {
            setError("Account not connected or missing token.");
            return;
        }

        try {
            let assets: { id: string, name: string }[] = [];
            
            if (platform === 'linkedin') {
                assets = await oauthService.getLinkedInOrganizations(account.accessToken);
            } else if (platform === 'facebook' || platform === 'instagram') {
                const metaAssets = await oauthService.getMetaAssets(account.accessToken);
                // Filter if needed based on platform, or show all available
                assets = metaAssets
                    .filter(a => platform === 'facebook' ? a.platform === 'facebook' : a.platform === 'instagram')
                    .map(a => ({ id: a.id, name: a.name }));
            }

            // Update the account with fetched assets
            updateAccount(platform, accountId, 'availableAssets', assets);
            
        } catch (e: any) {
            setError(`Failed to fetch assets: ${e.message}`);
        }
    }, [site.socialMediaSettings, setError, updateAccount]);

    
    // --- Specific Connection Configs ---
    
    // Default strategy configs for common platforms
    const defaultSocialStrategies: PlatformOption[] = [
        { id: 'oauth', label: 'Official App (OAuth)', icon: ShareIcon },
        { id: 'url', label: 'Page URL', icon: LinkIcon },
        { id: 'credentials', label: 'Credentials', icon: KeyIcon }
    ];

    const waStrategies: PlatformOption[] = [
        { id: 'api_key', label: 'WhatsApp Cloud API', icon: ShareIcon },
        { id: 'manual', label: 'Manual Phone Number', icon: PenIcon }
    ];

    const tgStrategies: PlatformOption[] = [
        { id: 'api_key', label: 'Telegram Bot', icon: ShareIcon },
        { id: 'url', label: 'Channel Link', icon: LinkIcon }
    ];

    const metaStyle = getStyle('meta');
    const mcStyle = getStyle('mailchimp');
    const gaStyle = getStyle('google_analytics');

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <TabGuide title="Connect Your Ecosystem">
                <p>Connect your social media accounts using the method that suits you best. Use <strong>Official Apps (OAuth)</strong> for reliability, <strong>URLs</strong> for monitoring, or <strong>Credentials</strong> for advanced simulation scenarios.</p>
            </TabGuide>

            <Panel title="Social Media & Platforms" description="Connect accounts to enable auto-posting and analytics." icon={ShareIcon}>
                <div className="space-y-8">
                    {/* Meta (Facebook/Instagram) Master Connection */}
                    <div className={`p-5 rounded-xl border transition-all ${metaConnected ? `bg-panel ${metaStyle.border} shadow-sm` : `bg-panel-light ${metaStyle.border}`}`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 ${metaStyle.bg} border ${metaStyle.border} ${metaStyle.text} rounded-lg`}>
                                    <MetaIcon className="h-6 w-6" />
                                </div>
                                <div>
                                    <span className="font-semibold text-main block">Meta Business Suite (App)</span>
                                    <span className="text-xs text-text-secondary">Global App Credentials for Facebook & Instagram</span>
                                </div>
                            </div>
                            <ConnectionBadge isConnected={!!metaConnected} brandKey="meta" />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="text-xs text-text-secondary mb-1 block">App ID</label>
                                <input type="text" value={site.socialMediaSettings.metaClientId || ''} onChange={(e) => onSiteUpdate('socialMediaSettings', { ...site.socialMediaSettings, metaClientId: e.target.value })} className="input-base w-full" placeholder="Meta App ID" />
                            </div>
                            <div>
                                <label className="text-xs text-text-secondary mb-1 block">App Secret</label>
                                <SecretInput value={site.socialMediaSettings.metaClientSecret || ''} onChange={(e) => onSiteUpdate('socialMediaSettings', { ...site.socialMediaSettings, metaClientSecret: e.target.value })} placeholder="Meta App Secret" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                             <CredentialsLink href="https://developers.facebook.com/apps/" brandKey="meta">Get App ID</CredentialsLink>
                             <button onClick={() => onConnect('meta', '')} className="btn btn-primary text-xs px-3 py-1.5" disabled={!!isConnectingSocial}>
                                {isConnectingSocial === 'meta-' ? 'Connecting...' : (metaConnected ? 'Reconnect' : 'Connect App')}
                            </button>
                        </div>
                    </div>

                    <SocialPlatformSection 
                        platform="facebook" 
                        title="Facebook Pages/Groups" 
                        icon={FacebookIcon} 
                        docUrl="https://developers.facebook.com/docs/development/create-an-app/" 
                        methods={defaultSocialStrategies}
                        accounts={(site.socialMediaSettings['facebook'] as any[]) || []}
                        onAddAccount={() => addAccount('facebook')}
                        onUpdateAccount={(id, field, val) => updateAccount('facebook', id, field, val)}
                        onRemoveAccount={(id) => removeAccount('facebook', id)}
                        onConnect={(id) => onConnect('facebook', id)}
                        onVerify={(account) => onVerifyCredentials('facebook' as any, account)}
                        onFetchAssets={(id) => handleFetchAssets('facebook', id)}
                        isConnectingSocial={isConnectingSocial}
                    />
                    <SocialPlatformSection 
                        platform="instagram" 
                        title="Instagram" 
                        icon={InstagramIcon} 
                        docUrl="https://developers.facebook.com/docs/instagram-basic-display-api/" 
                        methods={defaultSocialStrategies}
                        accounts={(site.socialMediaSettings['instagram'] as any[]) || []}
                        onAddAccount={() => addAccount('instagram')}
                        onUpdateAccount={(id, field, val) => updateAccount('instagram', id, field, val)}
                        onRemoveAccount={(id) => removeAccount('instagram', id)}
                        onConnect={(id) => onConnect('instagram', id)}
                        onVerify={(account) => onVerifyCredentials('instagram' as any, account)}
                        onFetchAssets={(id) => handleFetchAssets('instagram', id)}
                        isConnectingSocial={isConnectingSocial}
                    />
                    <SocialPlatformSection 
                        platform="linkedin" 
                        title="LinkedIn" 
                        icon={LinkedInIcon} 
                        docUrl="https://www.linkedin.com/developers/apps" 
                        methods={[{ id: 'oauth', label: 'OAuth App', icon: ShareIcon }, { id: 'url', label: 'Profile URL', icon: LinkIcon }]}
                        accounts={(site.socialMediaSettings['linkedin'] as any[]) || []}
                        onAddAccount={() => addAccount('linkedin')}
                        onUpdateAccount={(id, field, val) => updateAccount('linkedin', id, field, val)}
                        onRemoveAccount={(id) => removeAccount('linkedin', id)}
                        onConnect={(id) => onConnect('linkedin', id)}
                        onVerify={(account) => onVerifyCredentials('linkedin' as any, account)}
                        onFetchAssets={(id) => handleFetchAssets('linkedin', id)}
                        isConnectingSocial={isConnectingSocial}
                    />
                    <SocialPlatformSection 
                        platform="twitter" 
                        title="X (Twitter)" 
                        icon={XIconSocial} 
                        docUrl="https://developer.twitter.com/en/portal/dashboard" 
                        methods={defaultSocialStrategies}
                        accounts={(site.socialMediaSettings['twitter'] as any[]) || []}
                        onAddAccount={() => addAccount('twitter')}
                        onUpdateAccount={(id, field, val) => updateAccount('twitter', id, field, val)}
                        onRemoveAccount={(id) => removeAccount('twitter', id)}
                        onConnect={(id) => onConnect('twitter', id)}
                        onVerify={(account) => onVerifyCredentials('twitter' as any, account)}
                        isConnectingSocial={isConnectingSocial}
                    />
                    <SocialPlatformSection 
                        platform="youtube" 
                        title="Google & YouTube" 
                        icon={YouTubeIcon} 
                        docUrl="https://console.cloud.google.com/apis/credentials" 
                        methods={[{ id: 'oauth', label: 'OAuth App', icon: ShareIcon }, { id: 'url', label: 'Channel URL', icon: LinkIcon }]}
                        accounts={(site.socialMediaSettings['youtube'] as any[]) || []}
                        onAddAccount={() => addAccount('youtube')}
                        onUpdateAccount={(id, field, val) => updateAccount('youtube', id, field, val)}
                        onRemoveAccount={(id) => removeAccount('youtube', id)}
                        onConnect={(id) => onConnect('youtube', id)}
                        onVerify={(account) => onVerifyCredentials('youtube' as any, account)}
                        isConnectingSocial={isConnectingSocial}
                    />
                    <SocialPlatformSection 
                        platform="tiktok" 
                        title="TikTok" 
                        icon={TikTokIcon} 
                        docUrl="https://developers.tiktok.com/" 
                        methods={defaultSocialStrategies}
                        accounts={(site.socialMediaSettings['tiktok'] as any[]) || []}
                        onAddAccount={() => addAccount('tiktok')}
                        onUpdateAccount={(id, field, val) => updateAccount('tiktok', id, field, val)}
                        onRemoveAccount={(id) => removeAccount('tiktok', id)}
                        onConnect={(id) => onConnect('tiktok', id)}
                        onVerify={(account) => onVerifyCredentials('tiktok' as any, account)}
                        isConnectingSocial={isConnectingSocial}
                    />
                    <SocialPlatformSection 
                        platform="pinterest" 
                        title="Pinterest" 
                        icon={PinterestIcon} 
                        docUrl="https://developers.pinterest.com/apps/" 
                        methods={defaultSocialStrategies}
                        accounts={(site.socialMediaSettings['pinterest'] as any[]) || []}
                        onAddAccount={() => addAccount('pinterest')}
                        onUpdateAccount={(id, field, val) => updateAccount('pinterest', id, field, val)}
                        onRemoveAccount={(id) => removeAccount('pinterest', id)}
                        onConnect={(id) => onConnect('pinterest', id)}
                        onVerify={(account) => onVerifyCredentials('pinterest' as any, account)}
                        isConnectingSocial={isConnectingSocial}
                    />
                    <SocialPlatformSection 
                        platform="snapchat" 
                        title="Snapchat" 
                        icon={SnapchatIcon} 
                        docUrl="https://kit.snapchat.com/portal/" 
                        methods={[{ id: 'oauth', label: 'OAuth App', icon: ShareIcon }]}
                        accounts={(site.socialMediaSettings['snapchat'] as any[]) || []}
                        onAddAccount={() => addAccount('snapchat')}
                        onUpdateAccount={(id, field, val) => updateAccount('snapchat', id, field, val)}
                        onRemoveAccount={(id) => removeAccount('snapchat', id)}
                        onConnect={(id) => onConnect('snapchat', id)}
                        onVerify={(account) => onVerifyCredentials('snapchat' as any, account)}
                        isConnectingSocial={isConnectingSocial}
                    />
                    <SocialPlatformSection 
                        platform="whatsapp" 
                        title="WhatsApp Business" 
                        icon={WhatsAppIcon} 
                        docUrl="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" 
                        methods={waStrategies}
                        accounts={(site.socialMediaSettings['whatsapp'] as any[]) || []}
                        onAddAccount={() => addAccount('whatsapp')}
                        onUpdateAccount={(id, field, val) => updateAccount('whatsapp', id, field, val)}
                        onRemoveAccount={(id) => removeAccount('whatsapp', id)}
                        onConnect={(id) => onConnect('whatsapp', id)}
                        onVerify={(account) => onVerifyCredentials('whatsapp' as any, account)}
                        isConnectingSocial={isConnectingSocial}
                    />
                    <SocialPlatformSection 
                        platform="telegram" 
                        title="Telegram Bot" 
                        icon={TelegramIcon} 
                        docUrl="https://core.telegram.org/bots/tutorial" 
                        methods={tgStrategies}
                        accounts={(site.socialMediaSettings['telegram'] as any[]) || []}
                        onAddAccount={() => addAccount('telegram')}
                        onUpdateAccount={(id, field, val) => updateAccount('telegram', id, field, val)}
                        onRemoveAccount={(id) => removeAccount('telegram', id)}
                        onConnect={(id) => onConnect('telegram', id)}
                        onVerify={(account) => onVerifyCredentials('telegram' as any, account)}
                        isConnectingSocial={isConnectingSocial}
                    />

                </div>
            </Panel>

            <Panel title="Integrations" description="Connect third-party tools for analytics, email, and productivity." icon={LinkIcon}>
                <div className="space-y-6">
                    {/* Mailchimp */}
                    <div className={`p-5 rounded-xl border transition-all ${mailchimpConnected ? `bg-panel ${mcStyle.border} shadow-sm` : `bg-panel-light ${mcStyle.border}`}`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 ${mcStyle.bg} border ${mcStyle.border} ${mcStyle.text} rounded-lg`}>
                                    <MailIcon className="h-6 w-6" />
                                </div>
                                <div>
                                    <span className="font-semibold text-main block">Mailchimp</span>
                                    <span className="text-xs text-text-secondary">Send AI-generated Email Campaigns</span>
                                </div>
                            </div>
                            <ConnectionBadge isConnected={mailchimpConnected} brandKey="mailchimp" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div><label className="text-xs text-text-secondary mb-1 block">API Key</label><SecretInput value={site.mailchimpSettings.apiKey} onChange={(e) => onSiteUpdate('mailchimpSettings', { ...site.mailchimpSettings, apiKey: e.target.value })} placeholder="Your Mailchimp API Key" /></div>
                            <div><label className="text-xs text-text-secondary mb-1 block">Server Prefix</label><input type="text" value={site.mailchimpSettings.serverPrefix} onChange={(e) => onSiteUpdate('mailchimpSettings', { ...site.mailchimpSettings, serverPrefix: e.target.value })} className="input-base w-full" placeholder="e.g., us1" /></div>
                            <div className="md:col-span-2"><label className="text-xs text-text-secondary mb-1 block">Default Audience ID</label><input type="text" value={site.mailchimpSettings.defaultListId} onChange={(e) => onSiteUpdate('mailchimpSettings', { ...site.mailchimpSettings, defaultListId: e.target.value })} className="input-base w-full" placeholder="Audience ID" /></div>
                        </div>
                        <div className="flex justify-end gap-3"><CredentialsLink href="https://mailchimp.com/developer/marketing/guides/quick-start/" brandKey="mailchimp">Get API Key</CredentialsLink><button onClick={() => onVerifyMailchimp(site.mailchimpSettings)} className="btn btn-secondary text-xs px-3 py-1.5">Verify Connection</button></div>
                    </div>

                    {/* Google Analytics */}
                    <div className={`p-5 rounded-xl border transition-all ${gaConnected ? `bg-panel ${gaStyle.border} shadow-sm` : `bg-panel-light ${gaStyle.border}`}`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 ${gaStyle.bg} border ${gaStyle.border} ${gaStyle.text} rounded-lg`}>
                                    <ChartBarIcon className="h-6 w-6" />
                                </div>
                                <div>
                                    <span className="font-semibold text-main block">Google Analytics 4</span>
                                    <span className="text-xs text-text-secondary">Track site performance and conversions.</span>
                                </div>
                            </div>
                            <ConnectionBadge isConnected={gaConnected} brandKey="google_analytics" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div><label className="text-xs text-text-secondary mb-1 block">Client ID</label><input type="text" value={site.googleAnalyticsSettings.clientId || ''} onChange={(e) => onSiteUpdate('googleAnalyticsSettings', { ...site.googleAnalyticsSettings, clientId: e.target.value })} className="input-base w-full" /></div>
                            <div><label className="text-xs text-text-secondary mb-1 block">Client Secret</label><SecretInput value={site.googleAnalyticsSettings.clientSecret || ''} onChange={(e) => onSiteUpdate('googleAnalyticsSettings', { ...site.googleAnalyticsSettings, clientSecret: e.target.value })} placeholder="Client Secret" /></div>
                            <div className="md:col-span-2"><label className="text-xs text-text-secondary mb-1 block">GA4 Property ID</label><input type="text" value={site.googleAnalyticsSettings.propertyId || ''} onChange={(e) => onSiteUpdate('googleAnalyticsSettings', { ...site.googleAnalyticsSettings, propertyId: e.target.value })} className="input-base w-full" placeholder="e.g., 345678901" /></div>
                        </div>
                        <div className="flex justify-end gap-3"><CredentialsLink href="https://console.cloud.google.com/apis/credentials" brandKey="google_analytics">Get Credentials</CredentialsLink><button onClick={() => onConnect('google_analytics', '')} className="btn btn-primary text-xs px-3 py-1.5" disabled={!!isConnectingSocial}>{isConnectingSocial === 'google_analytics-' ? 'Connecting...' : (gaConnected ? 'Reconnect' : 'Connect GA4')}</button></div>
                    </div>
                </div>
            </Panel>
        </div>
    );
};
