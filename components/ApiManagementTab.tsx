
import React from 'react';
import type { Site, ApiKeys } from '../types';
import { ChartBarIcon, ArrowPathIcon } from './Icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ApiManagementTabProps {
    site: Site;
    setActiveTab: (tab: string, subTab?: string | null) => void;
    onSiteUpdate: (field: keyof Site, value: any) => void;
    logApiUsage: (provider: keyof ApiKeys, cost: number) => void;
}

const COLORS = ['#1DA1F2', '#4ABBF9', '#78D5FF', '#0C85D0', '#0769A6', '#034E7D', '#023454'];

export const ApiManagementTab: React.FC<ApiManagementTabProps> = ({ site, setActiveTab }) => {
    // Simulated data for analytics
    const trafficData = Array.from({ length: 30 }, (_, i) => ({
        name: `Day ${i + 1}`,
        visitors: Math.floor(Math.random() * 500) + 100,
        pageviews: Math.floor(Math.random() * 1000) + 200,
    }));

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="bg-panel/50 p-6 rounded-2xl border border-border">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-main">Analytics & Performance</h2>
                        <p className="text-text-secondary mt-1">Monitor your site's growth and engagement metrics.</p>
                    </div>
                    <button className="btn btn-secondary flex items-center gap-2">
                        <ArrowPathIcon className="h-5 w-5" /> Refresh Data
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-panel p-6 rounded-xl border border-border-subtle">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                            <ChartBarIcon className="h-6 w-6" />
                        </div>
                        <h3 className="font-semibold text-main">Total Pageviews</h3>
                    </div>
                    <p className="text-3xl font-bold text-main">12,453</p>
                    <p className="text-sm text-green-400 mt-1 flex items-center gap-1">
                        +12.5% <span className="text-text-secondary">vs last month</span>
                    </p>
                </div>
                <div className="bg-panel p-6 rounded-xl border border-border-subtle">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                            <ChartBarIcon className="h-6 w-6" />
                        </div>
                        <h3 className="font-semibold text-main">Unique Visitors</h3>
                    </div>
                    <p className="text-3xl font-bold text-main">4,289</p>
                    <p className="text-sm text-green-400 mt-1 flex items-center gap-1">
                        +8.2% <span className="text-text-secondary">vs last month</span>
                    </p>
                </div>
                <div className="bg-panel p-6 rounded-xl border border-border-subtle">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                            <ChartBarIcon className="h-6 w-6" />
                        </div>
                        <h3 className="font-semibold text-main">Avg. Engagement</h3>
                    </div>
                    <p className="text-3xl font-bold text-main">1m 45s</p>
                    <p className="text-sm text-text-secondary mt-1">
                        Steady
                    </p>
                </div>
            </div>

            <div className="bg-panel p-6 rounded-xl border border-border-subtle">
                <h3 className="text-lg font-bold text-main mb-6">Traffic Overview</h3>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trafficData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                            <XAxis dataKey="name" stroke="var(--color-text-secondary)" tick={{ fontSize: 12 }} />
                            <YAxis stroke="var(--color-text-secondary)" tick={{ fontSize: 12 }} />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--color-panel)', border: '1px solid var(--color-border)' }} />
                            <Line type="monotone" dataKey="pageviews" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 6 }} name="Pageviews" />
                            <Line type="monotone" dataKey="visitors" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Visitors" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
