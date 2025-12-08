
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
        
        // Attempt to create a client with the provided credentials
        const client = createSupabaseClient(connection.url, connection.anonKey);
        
        // Try a lightweight request to verify credentials. 
        // We'll use auth.getSession() as it's a standard public endpoint.
        const { error } = await client.auth.getSession();

        if (error) {
             console.warn("Supabase verification error:", error);
             if (error.message.includes('Failed to fetch')) {
                 return { success: false, message: `Connection failed. The server could not be reached. Ensure the URL is correct and supports HTTPS (Mixed Content restriction).` };
             }
             return { success: false, message: `Connection established but returned error: ${error.message}` };
        }

        return { success: true, message: 'Successfully connected to Supabase.' };

    } catch (e: any) {
        console.error("Supabase connection failed:", e);
        return { success: false, message: `Connection failed: ${e.message}` };
    }
};
