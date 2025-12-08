
import React, { useEffect, useState } from 'react';
import type { Site, ApiKeys } from '../types';
import { ChartBarIcon, ArrowPathIcon } from './Icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as googleAnalyticsService from '../services/googleAnalyticsService';

interface ApiManagementTabProps {
    site: Site;
    setActiveTab: (tab: string, subTab?: string | null) => void;
    onSiteUpdate: (field: keyof Site, value: any) => void;
    logApiUsage: (provider: keyof ApiKeys, cost: number) => void;
}

export const ApiManagementTab: React.FC<ApiManagementTabProps> = ({ site }) => {
    const [trafficData, setTrafficData] = useState<any[]>([]);
    const [coreMetrics, setCoreMetrics] = useState<{pageviews: number, visitors: number, engagement: string} | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        if (!site.googleAnalyticsSettings.isConnected || !site.googleAnalyticsSettings.accessToken || !site.googleAnalyticsSettings.propertyId) {
            return; // Not connected
        }
        
        setIsLoading(true);
        setError(null);
        
        try {
            const accessToken = site.googleAnalyticsSettings.accessToken;
            const propertyId = site.googleAnalyticsSettings.propertyId;

            // Parallel fetch
            const [history, metrics] = await Promise.all([
                googleAnalyticsService.getAnalyticsHistory(accessToken, propertyId),
                googleAnalyticsService.getCoreMetrics(accessToken, propertyId)
            ]);

            setTrafficData(history);
            setCoreMetrics({
                pageviews: metrics.sessions, // Using sessions as proxy for main metric if pageviews unavailable in core
                visitors: metrics.newUsers,
                engagement: metrics.avgEngagement
            });

        } catch (e: any) {
            console.error("Failed to load analytics:", e);
            setError(e.message || "Failed to load Google Analytics data.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [site.googleAnalyticsSettings]);

    if (!site.googleAnalyticsSettings.isConnected) {
        return (
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="bg-panel/50 p-12 rounded-2xl border-2 border-dashed border-border text-center">
                    <ChartBarIcon className="h-12 w-12 text-text-secondary mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-main">Connect Google Analytics</h3>
                    <p className="text-text-secondary mt-2">Connect your GA4 account in the Connections tab to view real-time site performance.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="bg-panel/50 p-6 rounded-2xl border border-border">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-main">Analytics & Performance</h2>
                        <p className="text-text-secondary mt-1">Live data from Google Analytics 4 (Last 30 Days).</p>
                    </div>
                    <button onClick={fetchData} disabled={isLoading} className="btn btn-secondary flex items-center gap-2">
                        <ArrowPathIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh Data
                    </button>
                </div>
                {error && <div className="mt-4 p-3 bg-red-900/30 border border-red-500/30 rounded text-red-200 text-sm">{error}</div>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-panel p-6 rounded-xl border border-border-subtle">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-brand-primary/10 text-brand-primary">
                            <ChartBarIcon className="h-6 w-6" />
                        </div>
                        <h3 className="font-semibold text-main">Sessions</h3>
                    </div>
                    <p className="text-3xl font-bold text-main">{isLoading ? '-' : (coreMetrics?.pageviews.toLocaleString() || 0)}</p>
                </div>
                <div className="bg-panel p-6 rounded-xl border border-border-subtle">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-brand-primary/10 text-brand-primary">
                            <ChartBarIcon className="h-6 w-6" />
                        </div>
                        <h3 className="font-semibold text-main">New Users</h3>
                    </div>
                    <p className="text-3xl font-bold text-main">{isLoading ? '-' : (coreMetrics?.visitors.toLocaleString() || 0)}</p>
                </div>
                <div className="bg-panel p-6 rounded-xl border border-border-subtle">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-brand-primary/10 text-brand-primary">
                            <ChartBarIcon className="h-6 w-6" />
                        </div>
                        <h3 className="font-semibold text-main">Avg. Duration</h3>
                    </div>
                    <p className="text-3xl font-bold text-main">{isLoading ? '-' : (coreMetrics?.engagement || '0s')}</p>
                </div>
            </div>

            <div className="bg-panel p-6 rounded-xl border border-border-subtle">
                <h3 className="text-lg font-bold text-main mb-6">Traffic Overview (30 Days)</h3>
                <div className="h-80 w-full">
                    {trafficData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trafficData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                                <XAxis dataKey="name" stroke="var(--color-text-secondary)" tick={{ fontSize: 12 }} />
                                <YAxis stroke="var(--color-text-secondary)" tick={{ fontSize: 12 }} />
                                <Tooltip contentStyle={{ backgroundColor: 'var(--color-panel)', border: '1px solid var(--color-border)' }} />
                                <Line type="monotone" dataKey="pageviews" stroke="#8b5cf6" strokeWidth={2} dot={false} activeDot={{ r: 6 }} name="Pageviews" />
                                <Line type="monotone" dataKey="visitors" stroke="#7c3aed" strokeWidth={2} dot={false} name="Users" />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-text-secondary">
                            {isLoading ? 'Loading chart...' : 'No historical data available for this period.'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};