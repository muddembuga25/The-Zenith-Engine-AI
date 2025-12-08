
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { Site, SocialMediaSettings, SupabaseConnection, PaystackConnection, PayfastConnection, WiseConnection, GlobalSettings, PayoneerConnection, StripeConnection, PayPalConnection, SocialMediaAccount, WhatsAppAccount, TelegramAccount, ApiKeys, MailchimpSettings, SocialAccountStatus } from '../types';
import * as oauthService from '../services/oauthService';
import { CheckCircleIcon, ExclamationTriangleIcon, TrashIcon, XIconSocial, FacebookIcon, LinkedInIcon, InstagramIcon, PinterestIcon, WhatsAppIcon, YouTubeIcon, TikTokIcon, TelegramIcon, SnapchatIcon, GoogleIcon, ClarityIcon, SparklesIcon, KeyIcon, MailIcon, LinkIcon, XIcon, UserIcon, ShareIcon, ArrowPathIcon, ChartBarIcon, MetaIcon, QuestionMarkCircleIcon, ArrowRightIcon, PenIcon, LightbulbIcon, CreditCardIcon, EyeIcon, EyeSlashIcon, CalendarDaysIcon } from './Icons';
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

const Panel: React.FC<{ title: string; description: string; icon: React.FC<any>; iconColorClass?: string; children: React.ReactNode; }> = ({ title, description, icon: Icon, iconColorClass = 'text-brand-primary', children }) => (
    <div className="bg-panel/50 p-6 rounded-2xl border border-border">
        <div className="flex items-start gap-4 mb-6">
            <div className="p-3 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex-shrink-0">
                <Icon className={`h-6 w-6 text-brand-primary`} />
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

const ConnectionBadge: React.FC<{ isConnected: boolean; label?: string }> = ({ isConnected, label }) => {
    if (isConnected) {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-brand-primary/10 text-brand-primary border border-brand-primary/20 shadow-sm">
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

const CredentialsLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-brand-primary hover:text-brand-primary-hover hover:underline ml-1 transition-colors">
        {children} <ArrowRightIcon className="h-3 w-3" />
    </a>
);

export const ConnectionsTab: React.FC<ConnectionsTabProps> = ({ 
    site, onSiteUpdate, onMultipleSiteUpdates, isConnectingSocial, setError, onConnect, onVerify, onVerifyCredentials, 
    onVerifyMailchimp, onVerifyClarity, onVerifySupabase, onVerifyPaystack, onVerifyPayfast, onVerifyWise,
    onVerifyPayoneer, onVerifyStripe, onVerifyPayPal, setActiveTab, logApiUsage 
}) => {

    const metaConnected = site.socialMediaSettings.meta?.[0]?.isConnected;
    const mailchimpConnected = site.mailchimpSettings.isConnected;
    const gaConnected = site.googleAnalyticsSettings.isConnected;

    const addAccount = (platform: keyof SocialMediaSettings) => {
        const newAccount: SocialMediaAccount = {
            id: crypto.randomUUID(),
            name: `New ${platform} Account`,
            isAutomationEnabled: true,
            isConnected: false,
            status: 'disconnected',
            destinationType: 'profile'
        };
        
        if (platform === 'whatsapp') {
             const newWa: WhatsAppAccount = { ...newAccount, phoneNumberId: '', destination: '', destinationType: 'number', accessToken: '' };
             onSiteUpdate('socialMediaSettings', { ...site.socialMediaSettings, [platform]: [...(site.socialMediaSettings[platform] || []), newWa] });
        } else if (platform === 'telegram') {
             const newTg: TelegramAccount = { ...newAccount, botToken: '', chatId: '' };
             onSiteUpdate('socialMediaSettings', { ...site.socialMediaSettings, [platform]: [...(site.socialMediaSettings[platform] || []), newTg] });
        } else {
             // For other platforms that use SocialMediaAccount array
             onSiteUpdate('socialMediaSettings', { ...site.socialMediaSettings, [platform]: [...(site.socialMediaSettings[platform] as any[] || []), newAccount] });
        }
    };

    const removeAccount = (platform: keyof SocialMediaSettings, id: string) => {
        const currentAccounts = site.socialMediaSettings[platform] as any[];
        if (Array.isArray(currentAccounts)) {
            onSiteUpdate('socialMediaSettings', { ...site.socialMediaSettings, [platform]: currentAccounts.filter(a => a.id !== id) });
        }
    };

    const updateAccount = (platform: keyof SocialMediaSettings, id: string, field: string, value: any) => {
        const currentAccounts = site.socialMediaSettings[platform] as any[];
        if (Array.isArray(currentAccounts)) {
            const updatedAccounts = currentAccounts.map(acc => acc.id === id ? { ...acc, [field]: value } : acc);
            onSiteUpdate('socialMediaSettings', { ...site.socialMediaSettings, [platform]: updatedAccounts });
        }
    };

    // Helper component for rendering social platform sections
    const SocialPlatformSection = ({ platform, title, icon: Icon, colorClass, docUrl, supportedTypes }: { 
        platform: keyof SocialMediaSettings, 
        title: string, 
        icon: any, 
        colorClass: string, 
        docUrl?: string,
        supportedTypes?: { value: string, label: string }[] 
    }) => {
        const accounts = (site.socialMediaSettings[platform] as any[]) || [];

        return (
            <div className="bg-panel-light rounded-xl border border-border-subtle overflow-hidden">
                <div className="p-5 flex items-center justify-between border-b border-border-subtle bg-panel">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-brand-primary`}>
                            <Icon className={`h-6 w-6`} />
                        </div>
                        <div>
                            <span className="font-semibold text-main block">{title}</span>
                            <span className="text-xs text-text-secondary">Publish & Analyze</span>
                        </div>
                    </div>
                    <button onClick={() => addAccount(platform)} className="btn btn-secondary text-xs py-1.5 px-3">+ Add Account</button>
                </div>
                
                <div className="p-5 space-y-6">
                    {accounts.length === 0 && (
                        <p className="text-sm text-text-secondary italic text-center">No accounts connected.</p>
                    )}
                    
                    {accounts.map((account) => (
                        <div key={account.id} className="p-4 bg-panel rounded-lg border border-border-subtle space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="text" 
                                        value={account.name} 
                                        onChange={(e) => updateAccount(platform, account.id, 'name', e.target.value)}
                                        className="input-base px-2 py-1 text-sm font-medium"
                                        placeholder="Account Name"
                                    />
                                    <ConnectionBadge isConnected={account.isConnected} label={account.status === 'connected' ? 'Connected' : account.status} />
                                </div>
                                <button onClick={() => removeAccount(platform, account.id)} className="text-red-400 hover:text-red-300 p-1"><TrashIcon className="h-4 w-4" /></button>
                            </div>

                            {/* Platform specific fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {platform === 'whatsapp' ? (
                                    <>
                                        <div>
                                            <label className="text-xs text-text-secondary mb-1 block">Phone Number ID</label>
                                            <input type="text" value={(account as WhatsAppAccount).phoneNumberId} onChange={(e) => updateAccount(platform, account.id, 'phoneNumberId', e.target.value)} className="input-base w-full" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-text-secondary mb-1 block">Access Token</label>
                                            <SecretInput value={(account as WhatsAppAccount).accessToken} onChange={(e) => updateAccount(platform, account.id, 'accessToken', e.target.value)} placeholder="Access Token" />
                                        </div>
                                    </>
                                ) : platform === 'telegram' ? (
                                    <>
                                        <div>
                                            <label className="text-xs text-text-secondary mb-1 block">Bot Token</label>
                                            <SecretInput value={(account as TelegramAccount).botToken} onChange={(e) => updateAccount(platform, account.id, 'botToken', e.target.value)} placeholder="Bot Token" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-text-secondary mb-1 block">Chat ID</label>
                                            <input type="text" value={(account as TelegramAccount).chatId} onChange={(e) => updateAccount(platform, account.id, 'chatId', e.target.value)} className="input-base w-full" />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label className="text-xs text-text-secondary mb-1 block">Client ID / Key</label>
                                            <input type="text" value={(account as SocialMediaAccount).clientId || ''} onChange={(e) => updateAccount(platform, account.id, 'clientId', e.target.value)} className="input-base w-full" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-text-secondary mb-1 block">Client Secret</label>
                                            <SecretInput value={(account as SocialMediaAccount).clientSecret || ''} onChange={(e) => updateAccount(platform, account.id, 'clientSecret', e.target.value)} placeholder="Client Secret" />
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-3 pt-2">
                                {platform === 'whatsapp' || platform === 'telegram' ? (
                                    <button 
                                        onClick={() => onVerifyCredentials(platform, account as any)} 
                                        className="btn btn-secondary text-xs px-3 py-1.5"
                                    >
                                        Verify Credentials
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => onConnect(platform, account.id)} 
                                        className="btn btn-primary text-xs px-3 py-1.5 flex items-center gap-2"
                                        disabled={!!isConnectingSocial}
                                    >
                                        {isConnectingSocial === `${platform}-${account.id}` ? 'Connecting...' : (account.isConnected ? 'Reconnect' : 'Connect')}
                                        <ArrowRightIcon className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {docUrl && (
                        <div className="text-xs text-text-secondary bg-panel p-3 rounded-lg border border-border-subtle flex items-start gap-2">
                            <LightbulbIcon className="h-4 w-4 text-brand-primary mt-0.5 flex-shrink-0" />
                            <div>
                                Developer credentials required.
                                <CredentialsLink href={docUrl}>Get Credentials</CredentialsLink>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };
    
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <TabGuide title="Connect Your Ecosystem">
                <p>Connect your social media accounts, analytics, and marketing tools.</p>
            </TabGuide>

            <Panel title="Social Media & Platforms" description="Connect accounts to enable auto-posting and analytics." icon={ShareIcon}>
                <div className="space-y-8">
                    {/* Meta (Facebook/Instagram) */}
                    <div className={`p-5 rounded-xl border transition-all ${metaConnected ? 'bg-panel border-brand-primary/20 shadow-sm' : 'bg-panel-light border-border-subtle'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-brand-primary/10 border border-brand-primary/20 text-brand-primary rounded-lg">
                                    <MetaIcon className="h-6 w-6" />
                                </div>
                                <div>
                                    <span className="font-semibold text-main block">Meta Business Suite (App)</span>
                                    <span className="text-xs text-text-secondary">Global App Credentials for Facebook & Instagram</span>
                                </div>
                            </div>
                            <ConnectionBadge isConnected={!!metaConnected} />
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
                             <CredentialsLink href="https://developers.facebook.com/apps/">Get App ID</CredentialsLink>
                             <button onClick={() => onConnect('meta', '')} className="btn btn-primary text-xs px-3 py-1.5" disabled={!!isConnectingSocial}>
                                {isConnectingSocial === 'meta-' ? 'Connecting...' : (metaConnected ? 'Reconnect' : 'Connect App')}
                            </button>
                        </div>
                    </div>

                    <SocialPlatformSection platform="facebook" title="Facebook Pages/Groups" icon={FacebookIcon} colorClass="" docUrl="https://developers.facebook.com/docs/development/create-an-app/" supportedTypes={[ { value: 'page', label: 'Page' }, { value: 'group', label: 'Group' } ]} />
                    <SocialPlatformSection platform="instagram" title="Instagram" icon={InstagramIcon} colorClass="" docUrl="https://developers.facebook.com/docs/instagram-basic-display-api/" supportedTypes={[ { value: 'profile', label: 'Business Profile' } ]} />
                    <SocialPlatformSection platform="linkedin" title="LinkedIn" icon={LinkedInIcon} colorClass="" docUrl="https://www.linkedin.com/developers/apps" supportedTypes={[ { value: 'profile', label: 'Personal Profile' }, { value: 'page', label: 'Company Page' } ]} />
                    <SocialPlatformSection platform="twitter" title="X (Twitter)" icon={XIconSocial} colorClass="" docUrl="https://developer.twitter.com/en/portal/dashboard" supportedTypes={[ { value: 'profile', label: 'Profile' } ]} />
                    <SocialPlatformSection platform="youtube" title="Google & YouTube" icon={YouTubeIcon} colorClass="" docUrl="https://console.cloud.google.com/apis/credentials" supportedTypes={[ { value: 'channel', label: 'YouTube Channel' } ]} />
                    <SocialPlatformSection platform="tiktok" title="TikTok" icon={TikTokIcon} colorClass="" docUrl="https://developers.tiktok.com/" supportedTypes={[ { value: 'profile', label: 'Profile' } ]} />
                    <SocialPlatformSection platform="pinterest" title="Pinterest" icon={PinterestIcon} colorClass="" docUrl="https://developers.pinterest.com/apps/" supportedTypes={[ { value: 'profile', label: 'Profile' } ]} />
                    <SocialPlatformSection platform="snapchat" title="Snapchat" icon={SnapchatIcon} colorClass="" docUrl="https://kit.snapchat.com/portal/" supportedTypes={[ { value: 'profile', label: 'Profile' } ]} />

                    {/* WhatsApp */}
                    <div className="bg-panel-light rounded-xl border border-border-subtle overflow-hidden">
                        <div className="p-5 flex items-center justify-between border-b border-border-subtle bg-panel">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-brand-primary"><WhatsAppIcon className="h-6 w-6" /></div>
                                <div><span className="font-semibold text-main block">WhatsApp Business</span><span className="text-xs text-text-secondary">Send automated messages</span></div>
                            </div>
                            <button onClick={() => addAccount('whatsapp')} className="btn btn-secondary text-xs py-1.5 px-3">+ Add Account</button>
                        </div>
                        
                        <div className="p-5 space-y-4">
                            {(site.socialMediaSettings.whatsapp || []).map((account) => (
                                <div key={account.id} className="p-4 bg-panel rounded-lg border border-border-subtle space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <input type="text" value={account.name} onChange={(e) => updateAccount('whatsapp', account.id, 'name', e.target.value)} className="input-base px-2 py-1 text-sm font-medium" placeholder="Account Name" />
                                            <ConnectionBadge isConnected={account.isConnected} />
                                        </div>
                                        <button onClick={() => removeAccount('whatsapp', account.id)} className="text-red-400 hover:text-red-300"><TrashIcon className="h-4 w-4" /></button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label className="text-xs text-text-secondary mb-1 block">Phone Number ID</label><input type="text" value={account.phoneNumberId} onChange={(e) => updateAccount('whatsapp', account.id, 'phoneNumberId', e.target.value)} className="input-base w-full" /></div>
                                        <div><label className="text-xs text-text-secondary mb-1 block">Access Token</label><SecretInput value={account.accessToken} onChange={(e) => updateAccount('whatsapp', account.id, 'accessToken', e.target.value)} placeholder="Access Token" /></div>
                                    </div>
                                    <div className="flex justify-end pt-2"><button onClick={() => onVerifyCredentials('whatsapp', account)} className="btn btn-secondary text-xs px-3 py-1.5">Verify Credentials</button></div>
                                </div>
                            ))}
                            {(site.socialMediaSettings.whatsapp || []).length === 0 && <p className="text-sm text-text-secondary italic text-center">No WhatsApp accounts connected.</p>}
                        </div>
                    </div>

                    {/* Telegram */}
                    <div className="bg-panel-light rounded-xl border border-border-subtle overflow-hidden">
                        <div className="p-5 flex items-center justify-between border-b border-border-subtle bg-panel">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-brand-primary"><TelegramIcon className="h-6 w-6" /></div>
                                <div><span className="font-semibold text-main block">Telegram Bot</span><span className="text-xs text-text-secondary">Send messages to channel/group</span></div>
                            </div>
                            <button onClick={() => addAccount('telegram')} className="btn btn-secondary text-xs py-1.5 px-3">+ Add Bot</button>
                        </div>
                        <div className="p-5 space-y-4">
                            {(site.socialMediaSettings.telegram || []).map((account) => (
                                <div key={account.id} className="p-4 bg-panel rounded-lg border border-border-subtle space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <input type="text" value={account.name} onChange={(e) => updateAccount('telegram', account.id, 'name', e.target.value)} className="input-base px-2 py-1 text-sm font-medium" placeholder="Bot Name" />
                                            <ConnectionBadge isConnected={account.isConnected} />
                                        </div>
                                        <button onClick={() => removeAccount('telegram', account.id)} className="text-red-400 hover:text-red-300"><TrashIcon className="h-4 w-4" /></button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label className="text-xs text-text-secondary mb-1 block">Bot Token</label><SecretInput value={account.botToken} onChange={(e) => updateAccount('telegram', account.id, 'botToken', e.target.value)} placeholder="Bot Token" /></div>
                                        <div><label className="text-xs text-text-secondary mb-1 block">Chat ID</label><input type="text" value={account.chatId} onChange={(e) => updateAccount('telegram', account.id, 'chatId', e.target.value)} className="input-base w-full" /></div>
                                    </div>
                                    <div className="flex justify-end pt-2"><button onClick={() => onVerifyCredentials('telegram', account)} className="btn btn-secondary text-xs px-3 py-1.5">Verify Credentials</button></div>
                                </div>
                            ))}
                            {(site.socialMediaSettings.telegram || []).length === 0 && <p className="text-sm text-text-secondary italic text-center">No Telegram bots connected.</p>}
                        </div>
                    </div>
                </div>
            </Panel>

            <Panel title="Integrations" description="Connect third-party tools for analytics, email, and productivity." icon={LinkIcon}>
                <div className="space-y-6">
                    {/* Mailchimp */}
                    <div className={`p-5 rounded-xl border transition-all ${mailchimpConnected ? 'bg-panel border-brand-primary/20 shadow-sm' : 'bg-panel-light border-border-subtle'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-brand-primary/10 border border-brand-primary/20 text-brand-primary rounded-lg">
                                    <MailIcon className="h-6 w-6" />
                                </div>
                                <div>
                                    <span className="font-semibold text-main block">Mailchimp</span>
                                    <span className="text-xs text-text-secondary">Send AI-generated Email Campaigns</span>
                                </div>
                            </div>
                            <ConnectionBadge isConnected={mailchimpConnected} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div><label className="text-xs text-text-secondary mb-1 block">API Key</label><SecretInput value={site.mailchimpSettings.apiKey} onChange={(e) => onSiteUpdate('mailchimpSettings', { ...site.mailchimpSettings, apiKey: e.target.value })} placeholder="Your Mailchimp API Key" /></div>
                            <div><label className="text-xs text-text-secondary mb-1 block">Server Prefix</label><input type="text" value={site.mailchimpSettings.serverPrefix} onChange={(e) => onSiteUpdate('mailchimpSettings', { ...site.mailchimpSettings, serverPrefix: e.target.value })} className="input-base w-full" placeholder="e.g., us1" /></div>
                            <div className="md:col-span-2"><label className="text-xs text-text-secondary mb-1 block">Default Audience ID</label><input type="text" value={site.mailchimpSettings.defaultListId} onChange={(e) => onSiteUpdate('mailchimpSettings', { ...site.mailchimpSettings, defaultListId: e.target.value })} className="input-base w-full" placeholder="Audience ID" /></div>
                        </div>
                        <div className="flex justify-end gap-3"><CredentialsLink href="https://mailchimp.com/developer/marketing/guides/quick-start/">Get API Key</CredentialsLink><button onClick={() => onVerifyMailchimp(site.mailchimpSettings)} className="btn btn-secondary text-xs px-3 py-1.5">Verify Connection</button></div>
                    </div>

                    {/* Google Analytics */}
                    <div className={`p-5 rounded-xl border transition-all ${gaConnected ? 'bg-panel border-brand-primary/20 shadow-sm' : 'bg-panel-light border-border-subtle'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-brand-primary/10 border border-brand-primary/20 text-brand-primary rounded-lg">
                                    <ChartBarIcon className="h-6 w-6" />
                                </div>
                                <div>
                                    <span className="font-semibold text-main block">Google Analytics 4</span>
                                    <span className="text-xs text-text-secondary">Track site performance and conversions.</span>
                                </div>
                            </div>
                            <ConnectionBadge isConnected={gaConnected} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div><label className="text-xs text-text-secondary mb-1 block">Client ID</label><input type="text" value={site.googleAnalyticsSettings.clientId || ''} onChange={(e) => onSiteUpdate('googleAnalyticsSettings', { ...site.googleAnalyticsSettings, clientId: e.target.value })} className="input-base w-full" /></div>
                            <div><label className="text-xs text-text-secondary mb-1 block">Client Secret</label><SecretInput value={site.googleAnalyticsSettings.clientSecret || ''} onChange={(e) => onSiteUpdate('googleAnalyticsSettings', { ...site.googleAnalyticsSettings, clientSecret: e.target.value })} placeholder="Client Secret" /></div>
                            <div className="md:col-span-2"><label className="text-xs text-text-secondary mb-1 block">GA4 Property ID</label><input type="text" value={site.googleAnalyticsSettings.propertyId || ''} onChange={(e) => onSiteUpdate('googleAnalyticsSettings', { ...site.googleAnalyticsSettings, propertyId: e.target.value })} className="input-base w-full" placeholder="e.g., 345678901" /></div>
                        </div>
                        <div className="flex justify-end gap-3"><CredentialsLink href="https://console.cloud.google.com/apis/credentials">Get Credentials</CredentialsLink><button onClick={() => onConnect('google_analytics', '')} className="btn btn-primary text-xs px-3 py-1.5" disabled={!!isConnectingSocial}>{isConnectingSocial === 'google_analytics-' ? 'Connecting...' : (gaConnected ? 'Reconnect' : 'Connect GA4')}</button></div>
                    </div>
                </div>
            </Panel>
        </div>
    );
};
