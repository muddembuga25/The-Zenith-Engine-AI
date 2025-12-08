
import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Site, ApiKeys, User, SubscriptionPlan } from '../types';
import { AiProvider } from '../types';
import { ExclamationTriangleIcon, TrashIcon, WordPressIcon, ChevronDownIcon, KeyIcon, EyeIcon, EyeSlashIcon, UserIcon, ChartBarIcon, LightbulbIcon, XIcon } from './Icons';
import * as aiService from '../services/aiService';

interface ApiSpendDashboardProps {
  sites: Site[];
  onResetAllSitesSpend: () => void;
  site: Site;
  onSiteUpdate: (field: keyof Site, value: any) => void;
  setError: (error: string | null) => void;
  currentUser: User;
}

const providerDisplayNames: Record<keyof ApiKeys, string> = {
  google: 'Google',
  openAI: 'OpenAI',
  openRouter: 'OpenRouter',
  anthropic: 'Anthropic',
  xai: 'X.AI Grok',
  replicate: 'Replicate',
  openArt: 'OpenArt AI',
  dataforseo: 'DataForSEO',
};

// Using Brand Primary (#1d9bf0) as the lead color
const COLORS = ['#1d9bf0', '#4dabf5', '#7dc0f8', '#aed5fb', '#dff0ff', '#1280c9', '#0d6efd'];

const TabGuide: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => {
    const [isVisible, setIsVisible] = useState(true);
    if (!isVisible) return null;
    return (
        <div className="bg-panel p-5 rounded-xl border-l-4 border-brand-primary shadow-sm mb-8 flex items-start gap-4 animate-fade-in relative overflow-hidden border-y border-r border-border-subtle">
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

const ApiKeyInputRow: React.FC<{
    provider: keyof ApiKeys;
    name: string;
    placeholder: string;
    docLink: string;
    apiDocLink: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onVerify: () => void;
    status: { status: 'idle' | 'verifying' | 'valid' | 'invalid', message?: string };
    description?: string;
}> = ({ provider, name, placeholder, docLink, apiDocLink, value, onChange, onVerify, status, description }) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const statusInfo = {
        idle: { color: 'bg-gray-500', text: 'Not Verified' },
        verifying: { color: 'bg-yellow-500 animate-pulse', text: 'Verifying...' },
        valid: { color: 'bg-green-500', text: 'Verified' },
        invalid: { color: 'bg-red-500', text: 'Invalid' },
    };
    const currentStatus = statusInfo[status.status];

    return (
        <div className="p-4 bg-panel rounded-lg border border-border-subtle">
            <div className="flex justify-between items-center mb-2">
                <a href={apiDocLink} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-text-primary hover:text-brand-primary hover:underline">
                    {name}
                </a>
                <div className="flex items-center gap-2 text-xs">
                    <div className={`w-2 h-2 rounded-full ${currentStatus.color}`}></div>
                    <span className="text-text-secondary">{status.message || currentStatus.text}</span>
                </div>
            </div>
            <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><KeyIcon className="h-5 w-5 text-gray-400"/></div>
                <input
                    type={isPasswordVisible ? "text" : "password"}
                    value={value || ''}
                    onChange={onChange}
                    placeholder={placeholder}
                    className="input-base pl-10 pr-28 w-full"
                    aria-label={`${name} API Key`}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-2">
                    <button type="button" onClick={() => setIsPasswordVisible(!isPasswordVisible)} className="p-1.5 text-gray-400 hover:text-main" title={isPasswordVisible ? "Hide key" : "Show key"}>
                        {isPasswordVisible ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                    <div className="h-4 w-px bg-gray-600"></div>
                    <button type="button" onClick={onVerify} className="text-xs font-semibold text-brand-primary hover:text-brand-primary-hover">Verify</button>
                </div>
            </div>
            <a href={docLink} target="_blank" rel="noopener noreferrer" className="text-xs text-text-secondary hover:text-brand-primary hover:underline mt-1.5 inline-block">
                Get API Key
            </a>
            {provider === 'google' && (
                <p className="text-xs text-text-secondary mt-1.5">
                    Optional. A default key is configured. Providing a key here will override it for this site.
                </p>
            )}
            {description && (
                <p className="text-xs text-text-secondary mt-1.5">{description}</p>
            )}
        </div>
    );
};

const DataForSeoApiKeyManager: React.FC<{
    site: Site;
    handleApiKeyChange: (provider: keyof ApiKeys, value: string) => void;
    handleVerify: (provider: keyof ApiKeys) => void;
    verificationStatus: { status: 'idle' | 'verifying' | 'valid' | 'invalid', message?: string };
    keyInfo: { id: keyof ApiKeys; name: string; docLink: string; apiDocLink: string; description?: string; };
}> = ({ site, handleApiKeyChange, handleVerify, verificationStatus, keyInfo }) => {
    const [dfseoLogin, setDfseoLogin] = useState('');
    const [dfseoApiKey, setDfseoApiKey] = useState('');
    const [isApiKeyVisible, setIsApiKeyVisible] = useState(false);
    
    useEffect(() => {
        const combined = site.apiKeys?.dataforseo || '';
        if (combined.includes(':')) {
            const parts = combined.split(':', 2);
            setDfseoLogin(parts[0] || '');
            setDfseoApiKey(parts[1] || '');
        } else {
            setDfseoLogin('');
            setDfseoApiKey(''); // Don't pre-fill key if format is wrong
        }
    }, [site.apiKeys?.dataforseo]);
    
    const combineAndSaveChanges = () => {
        const combined = `${dfseoLogin}:${dfseoApiKey}`;
        if (combined !== (site.apiKeys?.dataforseo || '')) {
            handleApiKeyChange('dataforseo', combined);
        }
    };

    const handleVerifyClick = () => {
        const combined = `${dfseoLogin}:${dfseoApiKey}`;
        handleApiKeyChange('dataforseo', combined);
        // Wait for state to propagate before verifying
        setTimeout(() => {
            handleVerify('dataforseo');
        }, 100);
    };
    
    const statusInfo = {
        idle: { color: 'bg-gray-500', text: 'Not Verified' },
        verifying: { color: 'bg-yellow-500 animate-pulse', text: 'Verifying...' },
        valid: { color: 'bg-green-500', text: 'Verified' },
        invalid: { color: 'bg-red-500', text: 'Invalid' },
    };
    const currentStatus = statusInfo[verificationStatus.status];
  
    return (
        <div className="p-4 bg-panel rounded-lg border border-border-subtle space-y-3">
            <div className="flex justify-between items-center">
                 <a href={keyInfo.apiDocLink} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-text-primary hover:text-brand-primary hover:underline">
                     {keyInfo.name}
                </a>
                <div className="flex items-center gap-2 text-xs">
                     <div className={`w-2 h-2 rounded-full ${currentStatus.color}`}></div>
                     <span className="text-text-secondary">{verificationStatus.message || currentStatus.text}</span>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                     <label htmlFor={`dfseo-login-${site.id}`} className="block text-sm font-medium text-text-primary mb-1">API Login</label>
                     <div className="relative">
                         <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><UserIcon className="h-5 w-5 text-gray-400"/></div>
                         <input
                             id={`dfseo-login-${site.id}`}
                             type="email"
                             value={dfseoLogin}
                             onBlur={combineAndSaveChanges}
                             onChange={(e) => setDfseoLogin(e.target.value)}
                             placeholder="Your DataForSEO email"
                             className="input-base pl-10 pr-4 w-full"
                             aria-label="DataForSEO API Login"
                         />
                     </div>
                </div>
                <div>
                     <label htmlFor={`dfseo-password-${site.id}`} className="block text-sm font-medium text-text-primary mb-1">API Password (Key)</label>
                     <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><KeyIcon className="h-5 w-5 text-gray-400"/></div>
                        <input
                            id={`dfseo-password-${site.id}`}
                            type={isApiKeyVisible ? "text" : "password"}
                            value={dfseoApiKey}
                            onBlur={combineAndSaveChanges}
                            onChange={(e) => setDfseoApiKey(e.target.value)}
                            placeholder="Your DataForSEO API key"
                            className="input-base pl-10 pr-12 w-full"
                            aria-label="DataForSEO API Password Key"
                        />
                         <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                            <button type="button" onClick={() => setIsApiKeyVisible(!isApiKeyVisible)} className="p-1.5 text-gray-400 hover:text-main" title={isApiKeyVisible ? "Hide key" : "Show key"}>
                                 {isApiKeyVisible ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                             </button>
                         </div>
                     </div>
                </div>
            </div>
    
             <div className="flex justify-between items-center mt-2">
                 <a href={keyInfo.docLink} target="_blank" rel="noopener noreferrer" className="text-xs text-text-secondary hover:text-brand-primary hover:underline">
                     Get API Key
                 </a>
                 <button type="button" onClick={handleVerifyClick} className="text-sm font-semibold text-brand-primary hover:text-brand-primary-hover">Verify</button>
            </div>
            {keyInfo.description && (
                 <p className="text-xs text-text-secondary pt-2 border-t border-border-subtle">{keyInfo.description}</p>
            )}
        </div>
    );
};

interface ApiKeyPanelProps {
    site: Site;
    onSiteUpdate: (field: keyof Site, value: any) => void;
    setError: (error: string | null) => void;
    currentUser: User;
}

const ApiKeyPanel: React.FC<ApiKeyPanelProps> = ({ site, onSiteUpdate, setError, currentUser }) => {
    const [verificationStatus, setVerificationStatus] = useState<Record<keyof ApiKeys, { status: 'idle' | 'verifying' | 'valid' | 'invalid', message?: string }>>({
        google: { status: 'idle' }, openAI: { status: 'idle' }, anthropic: { status: 'idle' },
        openRouter: { status: 'idle' }, xai: { status: 'idle' }, replicate: { status: 'idle' },
        openArt: { status: 'idle' }, dataforseo: { status: 'idle' },
    });

    const planAccess = useMemo(() => {
        const plan = currentUser.subscriptionPlan || 'free';
        const planLevels: Record<SubscriptionPlan, number> = { free: 0, creator: 1, pro: 2, agency: 3 };
        const currentLevel = planLevels[plan];
        return {
            canUseCustomModels: currentLevel >= planLevels.creator,
        };
    }, [currentUser]);

    const apiKeyToProviderMap: Partial<Record<keyof ApiKeys, AiProvider>> = {
        google: AiProvider.GOOGLE,
        openAI: AiProvider.OPENAI,
        anthropic: AiProvider.ANTHROPIC,
        openRouter: AiProvider.OPENROUTER,
        xai: AiProvider.XAI,
        replicate: AiProvider.REPLICATE,
        openArt: AiProvider.OPENART,
    };

    const handleApiKeyChange = (provider: keyof ApiKeys, value: string) => {
        const newApiKeys = { ...(site.apiKeys || {}), [provider]: value };
        onSiteUpdate('apiKeys', newApiKeys);
        setVerificationStatus(prev => ({ ...prev, [provider]: { status: 'idle' } }));
    };

    const handleVerify = async (provider: keyof ApiKeys) => {
        const apiKey = site.apiKeys?.[provider];
        if (!apiKey) {
            setError(`${providerDisplayNames[provider]} API key is empty.`);
            return;
        }
        setVerificationStatus(prev => ({ ...prev, [provider]: { status: 'verifying' } }));
        setError(null);
        try {
            const { success, message, models } = await aiService.verifyApiKey(provider, apiKey);
            setVerificationStatus(prev => ({ ...prev, [provider]: { status: success ? 'valid' : 'invalid', message } }));
            if (success && models) {
                const aiProvider = apiKeyToProviderMap[provider];
                if (aiProvider) {
                    onSiteUpdate('fetchedModels', {
                        ...(site.fetchedModels || {}),
                        [aiProvider]: models
                    });
                }
            }
        } catch (e: any) {
            setVerificationStatus(prev => ({ ...prev, [provider]: { status: 'invalid', message: e.message } }));
            setError(e.message);
        }
    };

    const apiKeysList: { id: keyof ApiKeys; name: string; placeholder?: string; docLink: string; apiDocLink: string; description?: string; }[] = [
        { id: 'google', name: 'Google (Gemini, Imagen, Veo)', placeholder: 'Your Google AI Studio API Key', docLink: 'https://aistudio.google.com/app/apikey', apiDocLink: 'https://ai.google.dev/docs' },
        { id: 'openAI', name: 'OpenAI (GPT Models, DALL-E)', placeholder: 'Your OpenAI API Key', docLink: 'https://platform.openai.com/api-keys', apiDocLink: 'https://platform.openai.com/docs/overview' },
        { id: 'anthropic', name: 'Anthropic (Claude Models)', placeholder: 'Your Anthropic API Key', docLink: 'https://console.anthropic.com/settings/keys', apiDocLink: 'https://docs.anthropic.com/claude/reference/getting-started-with-the-api' },
        { id: 'openRouter', name: 'OpenRouter', placeholder: 'Your OpenRouter API Key', docLink: 'https://openrouter.ai/keys', apiDocLink: 'https://openrouter.ai/docs' },
        { id: 'xai', name: 'X.AI (Grok)', placeholder: 'Your X.AI API Key', docLink: 'https://x.com/settings/premium', apiDocLink: 'https://x.ai', description: 'Grok API access requires an X Premium+ subscription.' },
        { id: 'replicate', name: 'Replicate', placeholder: 'Your Replicate API Token', docLink: 'https://replicate.com/account/api-tokens', apiDocLink: 'https://replicate.com/docs' },
        { id: 'openArt', name: 'OpenArt AI', placeholder: 'Your OpenArt API Key', docLink: 'https://openart.ai/user/api-keys', apiDocLink: 'https://docs.openart.ai/' },
        { id: 'dataforseo', name: 'DataForSEO', docLink: 'https://app.dataforseo.com/api-access', apiDocLink: 'https://docs.dataforseo.com/', description: 'Your API key is available on your dashboard after signing up.' },
    ];

    const visibleApiKeys = useMemo(() => {
        if (currentUser.isAdmin || planAccess.canUseCustomModels) {
            return apiKeysList;
        }
        return apiKeysList.filter(key => key.id === 'google');
    }, [currentUser.isAdmin, planAccess.canUseCustomModels]);
    
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {visibleApiKeys.map(keyInfo => {
                    if (keyInfo.id === 'dataforseo') {
                        return (
                            <DataForSeoApiKeyManager
                                key={keyInfo.id}
                                site={site}
                                handleApiKeyChange={handleApiKeyChange}
                                handleVerify={handleVerify}
                                verificationStatus={verificationStatus.dataforseo}
                                keyInfo={keyInfo}
                            />
                        );
                    }
                    return (
                        <ApiKeyInputRow
                            key={keyInfo.id}
                            provider={keyInfo.id}
                            name={keyInfo.name}
                            placeholder={keyInfo.placeholder!}
                            docLink={keyInfo.docLink}
                            apiDocLink={keyInfo.apiDocLink}
                            description={keyInfo.description}
                            value={site.apiKeys?.[keyInfo.id] || ''}
                            onChange={(e) => handleApiKeyChange(keyInfo.id, e.target.value)}
                            onVerify={() => handleVerify(keyInfo.id)}
                            status={verificationStatus[keyInfo.id]}
                        />
                    );
                })}
            </div>
        </div>
    );
};

export const ApiSpendDashboard: React.FC<ApiSpendDashboardProps> = ({ sites, onResetAllSitesSpend, site, onSiteUpdate, setError, currentUser }) => {
    const { totalSpend, spendData } = useMemo(() => {
        const aggregatedUsage: Partial<Record<keyof ApiKeys, number>> = {};
        for (const s of sites) {
            if (s.apiUsage) {
                for (const key in s.apiUsage) {
                    const providerKey = key as keyof ApiKeys;
                    aggregatedUsage[providerKey] = (aggregatedUsage[providerKey] || 0) + (s.apiUsage[providerKey] || 0);
                }
            }
        }
        
        const providerData = (Object.keys(providerDisplayNames) as Array<keyof ApiKeys>)
            .map((key) => ({ name: providerDisplayNames[key], spend: aggregatedUsage[key] || 0 }))
            .filter(item => item.spend > 0)
            .sort((a, b) => b.spend - a.spend);
        
        const overallTotal = providerData.reduce((sum, item) => sum + item.spend, 0);

        return { totalSpend: overallTotal, spendData: providerData };
    }, [sites]);

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <TabGuide title="Monitor Costs & Manage Keys">
                <p>Keep track of your estimated API spend across all providers. You can also provide your own API keys for services like Google, OpenAI, etc. This will override the application's default key and the cost will be billed to your own account.</p>
            </TabGuide>
            <div className="bg-panel/50 p-6 rounded-2xl border border-border">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-main">API Spend & Keys</h2>
                        <p className="text-text-secondary mt-1">Monitor your estimated API costs and manage your API keys for different AI providers.</p>
                    </div>
                    <button onClick={onResetAllSitesSpend} className="btn bg-red-900/40 hover:bg-red-800/60 text-red-300 flex items-center gap-2">
                        <TrashIcon className="h-5 w-5" />
                        Reset All Spend Data
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-panel/50 p-6 rounded-2xl border border-border">
                    <h3 className="text-lg font-bold text-main mb-2">Total Estimated Spend</h3>
                    <p className="text-5xl font-extrabold text-brand-primary">${totalSpend.toFixed(5)}</p>
                    <p className="text-xs text-text-secondary">Aggregated across all your sites.</p>
                    <div className="mt-6" style={{ width: '100%', height: 250 }}>
                        {spendData.length > 0 ? (
                            <ResponsiveContainer>
                                <BarChart data={spendData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="2 2" stroke="var(--color-border-subtle)" />
                                    <XAxis type="number" stroke="var(--color-text-secondary)" tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} tickFormatter={(value) => `$${Number(value).toFixed(4)}`} />
                                    <YAxis type="category" dataKey="name" stroke="var(--color-text-secondary)" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} width={80} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(29, 155, 240, 0.1)'}}
                                        contentStyle={{ backgroundColor: 'var(--color-panel-light)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', borderRadius: '0.5rem' }}
                                        formatter={(value: number) => [`$${value.toFixed(5)}`, 'Spend']}
                                    />
                                    <Bar dataKey="spend" name="Spend (USD)" barSize={20}>
                                        {spendData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <p className="text-center text-text-secondary pt-12">No spend data yet. Generate some content to see costs.</p>}
                    </div>
                </div>

                <div className="bg-panel/50 p-6 rounded-2xl border border-border">
                    <h3 className="text-lg font-bold text-main mb-4">API Keys for "{site.name}"</h3>
                    <ApiKeyPanel site={site} onSiteUpdate={onSiteUpdate} setError={setError} currentUser={currentUser} />
                </div>
            </div>
        </div>
    );
};