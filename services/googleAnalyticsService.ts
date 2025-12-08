import type { PostHistoryItem } from '../types';

const DATA_API_URL = 'https://analyticsdata.googleapis.com/v1beta';
const ADMIN_API_URL = 'https://analyticsadmin.googleapis.com/v1beta';

// --- HELPER FUNCTIONS ---

/**
 * Formats seconds into a string like "1m 23s".
 */
const formatEngagementTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '0s';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    if (minutes > 0) {
        return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
};


// --- API FUNCTIONS ---

/**
 * Fetches available conversion events for a given GA4 property.
 */
export const fetchAnalyticsGoals = async (accessToken: string, propertyId: string): Promise<{id: string, name: string}[]> => {
    // Note: The propertyId for admin API is just the number, e.g., 'properties/12345'
    const url = `${ADMIN_API_URL}/${propertyId}/conversionEvents`;
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Google Analytics Admin API error: ${errorData.error.message}`);
        }

        const data = await response.json();
        
        if (!data.conversionEvents) {
            return [];
        }

        return data.conversionEvents.map((event: any) => ({
            id: event.eventName,
            name: event.eventName,
        }));

    } catch (error) {
        console.error("Error fetching GA goals:", error);
        throw error;
    }
};

/**
 * Fetches core site-wide metrics for the last 30 days.
 */
export const getCoreMetrics = async (accessToken: string, propertyId: string) => {
    const url = `${DATA_API_URL}/${propertyId}:runReport`;

    const requestBody = {
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        metrics: [
            { name: 'sessions' },
            { name: 'newUsers' },
            { name: 'averageSessionDuration' }, // in seconds
            { name: 'conversions' },
        ],
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Google Analytics Data API error: ${errorData.error.message}`);
        }

        const data = await response.json();
        const totals = data.totals[0].metricValues;

        return {
            sessions: parseInt(totals[0].value, 10),
            newUsers: parseInt(totals[1].value, 10),
            avgEngagement: formatEngagementTime(parseFloat(totals[2].value)),
            conversions: parseInt(totals[3].value, 10),
        };
    } catch (error) {
        console.error("Error fetching GA core metrics:", error);
        throw error;
    }
};

/**
 * Fetches the top 5 performing posts by pageviews for the last 30 days.
 */
export const getTopPosts = async (accessToken: string, propertyId: string) => {
    const url = `${DATA_API_URL}/${propertyId}:runReport`;

    const requestBody = {
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'pageTitle' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{
            metric: { metricName: 'screenPageViews' },
            desc: true,
        }],
        limit: 5,
    };
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Google Analytics Data API error: ${errorData.error.message}`);
        }

        const data = await response.json();
        
        if (!data.rows) {
            return [];
        }

        return data.rows.map((row: any) => ({
            title: row.dimensionValues[0].value,
            value: `${parseInt(row.metricValues[0].value, 10).toLocaleString()} Views`,
        }));
    } catch (error) {
        console.error("Error fetching GA top posts:", error);
        throw error;
    }
};

/**
 * Fetches traffic source data for the last 30 days.
 */
export const getTrafficSources = async (accessToken: string, propertyId: string) => {
    const url = `${DATA_API_URL}/${propertyId}:runReport`;

    const requestBody = {
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }],
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Google Analytics Data API error: ${errorData.error.message}`);
        }

        const data = await response.json();

        if (!data.rows) {
            return [];
        }
        
        return data.rows.map((row: any) => ({
            name: row.dimensionValues[0].value,
            value: parseInt(row.metricValues[0].value, 10),
        }));
    } catch (error) {
        console.error("Error fetching GA traffic sources:", error);
        throw error;
    }
};

/**
 * Fetches metrics for a specific list of page paths.
 */
export const getBulkPageMetrics = async (accessToken: string, propertyId: string, pagePaths: string[]): Promise<Record<string, any>> => {
    if (pagePaths.length === 0) {
        return {};
    }
    const url = `${DATA_API_URL}/${propertyId}:runReport`;
    
    const requestBody = {
        dateRanges: [{ startDate: '90daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [
            { name: 'screenPageViews' },
            { name: 'totalUsers' },
            { name: 'averageSessionDuration' },
            { name: 'conversions' }
        ],
        dimensionFilter: {
            filter: {
                fieldName: 'pagePath',
                inListFilter: {
                    values: pagePaths,
                },
            },
        },
        limit: pagePaths.length,
    };
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Google Analytics Data API error: ${errorData.error.message}`);
        }
        
        const data = await response.json();
        const metricsByPath: Record<string, any> = {};

        if (data.rows) {
            data.rows.forEach((row: any) => {
                const path = row.dimensionValues[0].value;
                metricsByPath[path] = {
                    pageviews: parseInt(row.metricValues[0].value, 10),
                    visitors: parseInt(row.metricValues[1].value, 10),
                    engagement: Math.round(parseFloat(row.metricValues[2].value)), // in seconds
                    conversions: parseInt(row.metricValues[3].value, 10),
                };
            });
        }
        
        return metricsByPath;
    } catch (error) {
        console.error("Error fetching GA bulk metrics:", error);
        throw error;
    }
};