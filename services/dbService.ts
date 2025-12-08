
import type { SupabaseConnection } from '../types';
import { createSupabaseClient } from './supabaseClient';

export const verifySupabaseConnection = async (
    connection: SupabaseConnection
): Promise<{ success: boolean; message: string; }> => {
    if (!connection.url.trim() || !connection.anonKey.trim()) {
        return { success: false, message: 'URL and Anon Key are required.' };
    }

    try {
        console.log(`[DB Service] Verifying Supabase connection to ${connection.url}`);
        
        // We perform a lightweight fetch to the REST endpoint to verify credentials
        // without needing to instantiate a full socket connection or rely on table existence.
        const restUrl = `${connection.url}/rest/v1/`;
        
        const response = await fetch(restUrl, {
            method: 'GET',
            headers: {
                'apikey': connection.anonKey,
                'Authorization': `Bearer ${connection.anonKey}`
            }
        });

        // Supabase returns 200 OK for the root REST endpoint if the key is valid.
        // It might return 404 depending on the specific configuration, but 401/403 denotes invalid auth.
        if (response.ok || response.status === 404) {
             return { success: true, message: 'Successfully connected to Supabase.' };
        } else {
             const data = await response.json().catch(() => ({}));
             return { success: false, message: `Connection refused: ${data.message || response.statusText} (${response.status})` };
        }

    } catch (e: any) {
        console.error("Supabase connection failed:", e);
        return { success: false, message: `Connection failed: ${e.message}` };
    }
};
