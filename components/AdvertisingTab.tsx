import React, { useState } from 'react';
import type { Site } from '../types';
import { ChartBarIcon, LinkIcon, GoogleIcon, LightbulbIcon, XIcon } from './Icons';

const TabGuide: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => {
    const [isVisible, setIsVisible] = useState(true);
    if (!isVisible) return null;
    return (
        <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/30 mb-8 flex items-start gap-4 animate-fade-in">
            <LightbulbIcon className="h-6 w-6 text-blue-300 flex-shrink-0 mt-1" />
            <div className="flex-1">
                <h3 className="font-bold text-white">{title}</h3>
                <div className="text-sm text-blue-200/80 mt-1">
                    {children}
                </div>
            </div>
            <button onClick={() => setIsVisible(false)} className="p-1.5 text-blue-200/60 hover:text-white rounded-full">
                <XIcon className="h-5 w-5" />
            </button>
        </div>
    );
};

export const AdvertisingTab: React.FC<{
    site: Site;
    setActiveTab: (tab: string, subTab?: string | null) => void;
}> = ({ site, setActiveTab }) => {
    const metaAdsConnection = site.socialMediaSettings.meta_ads?.[0];
    const googleAdsConnection = site.socialMediaSettings.google_ads?.[0];

    if (!metaAdsConnection?.isConnected && !googleAdsConnection?.isConnected) {
        return (
            <div className="max-w-4xl mx-auto space-y-8">
                <TabGuide title="Your Advertising Command Center">
                    <p>This is where you can connect your ad accounts. Future updates will unlock AI-powered campaign creation, audience suggestions, and ad spend optimization.</p>
                </TabGuide>
                <div className="text-center bg-panel/50 p-12 rounded-2xl border-2 border-dashed border-border max-w-2xl mx-auto">
                    <ChartBarIcon className="mx-auto h-12 w-12 text-text-secondary" />
                    <h3 className="mt-4 text-lg font-medium text-white">Connect Your Ad Accounts</h3>
                    <p className="mt-1 text-sm text-text-secondary">
                        Connect your Meta Ads or Google Ads accounts to manage campaigns and view performance data.
                    </p>
                    <button
                        onClick={() => setActiveTab('connections')}
                        className="mt-6 btn btn-primary flex items-center justify-center gap-2"
                    >
                        <LinkIcon className="h-5 w-5" />
                        Go to Connections
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <TabGuide title="Your Advertising Command Center">
                <p>View performance for your connected Meta & Google Ads accounts. Future updates will unlock AI-powered campaign creation, audience suggestions, and ad spend optimization.</p>
            </TabGuide>

            <div className="bg-panel/50 p-6 rounded-2xl border border-border">
                <h2 className="text-2xl font-bold text-white">Advertising Dashboard</h2>
                <p className="text-text-secondary mt-1">
                    Manage your enabled ad accounts below.
                </p>
            </div>

            {metaAdsConnection?.isConnected && (
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white">Meta Ad Accounts</h3>
                    <p className="text-sm text-text-secondary -mt-3">
                        Connected as <span className="font-semibold text-white">{metaAdsConnection.name}</span>.
                    </p>
                    {metaAdsConnection.adAccounts.length === 0 ? (
                        <p className="text-text-secondary">No ad accounts found for this Meta connection.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {metaAdsConnection.adAccounts.map(account => (
                                <div key={account.id} className="bg-panel p-6 rounded-xl border border-border-subtle">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-bold text-white text-lg">{account.name}</p>
                                            <p className="text-xs text-text-secondary font-mono mt-1">{account.id}</p>
                                        </div>
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${account.isEnabled ? 'bg-green-900/50 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                                            {account.isEnabled ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>
                                    <div className="mt-6 pt-4 border-t border-border-subtle flex gap-3">
                                        <button disabled className="w-full btn btn-secondary text-sm disabled:opacity-50">View Campaigns (soon)</button>
                                        <button disabled className="w-full btn btn-primary text-sm disabled:opacity-50">Create Ad (soon)</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {googleAdsConnection?.isConnected && (
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white">Google Ads Accounts</h3>
                     <p className="text-sm text-text-secondary -mt-3">
                        Connected as <span className="font-semibold text-white">{googleAdsConnection.name}</span>.
                    </p>
                    {googleAdsConnection.adAccounts.length === 0 ? (
                        <p className="text-text-secondary">No ad accounts found for this Google connection.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {googleAdsConnection.adAccounts.map(account => (
                                <div key={account.id} className="bg-panel p-6 rounded-xl border border-border-subtle">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-bold text-white text-lg">{account.name}</p>
                                            <p className="text-xs text-text-secondary font-mono mt-1">{account.id}</p>
                                        </div>
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${account.isEnabled ? 'bg-green-900/50 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                                            {account.isEnabled ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>
                                    <div className="mt-6 pt-4 border-t border-border-subtle flex gap-3">
                                        <button disabled className="w-full btn btn-secondary text-sm disabled:opacity-50">View Campaigns (soon)</button>
                                        <button disabled className="w-full btn btn-primary text-sm disabled:opacity-50">Create Ad (soon)</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};