
import type { GoogleCalendar } from '../types';
import { proxyFetch } from './secureBackendSimulation';

const API_URL = 'https://www.googleapis.com/calendar/v3';

export const fetchCalendarList = async (accessToken: string): Promise<GoogleCalendar[]> => {
    const url = `${API_URL}/users/me/calendarList`;
    try {
        const response = await proxyFetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Google Calendar API error: ${errorData.error.message}`);
        }

        const data = await response.json();
        return data.items.map((item: any) => ({
            id: item.id,
            summary: item.summary,
            primary: item.primary || false,
        }));
    } catch (error) {
        console.error("Error fetching Google Calendar list:", error);
        throw error;
    }
};

/**
 * Creates an event in a Google Calendar.
 * This function would be called by the backend automation service when a job is scheduled.
 */
export const createCalendarEvent = async (
    accessToken: string,
    calendarId: string,
    event: {
        summary: string;
        description: string;
        start: { dateTime: string, timeZone: string }; // ISO 8601 format e.g., "2024-08-15T09:00:00-07:00"
        end: { dateTime: string, timeZone: string };
    }
): Promise<any> => {
    const url = `${API_URL}/calendars/${encodeURIComponent(calendarId)}/events`;
    try {
        const response = await proxyFetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Google Calendar API error: ${errorData.error.message}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Error creating Google Calendar event:", error);
        throw error;
    }
};
