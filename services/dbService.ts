
import type { SupabaseConnection } from '../types';
import { supabase } from './supabaseClient';

export const verifySupabaseConnection = async (
    connection: SupabaseConnection
): Promise<{ success: boolean; message: string; }> => {
    if (!connection.url.trim() || !connection.anonKey.trim()) {
        return { success: false, message: 'URL and Anon Key are required.' };
    }

    try {
        console.log(`[DB Service] Verifying Supabase connection to ${connection.url}`);
        
        const { data, error } = await supabase.functions.invoke('verify-integration', {
            body: { provider: 'supabase', connection }
        });

        if (error) throw new Error(error.message);
        if (!data.success) throw new Error(data.message || 'Verification failed');

        return { success: true, message: data.message };

    } catch (e: any) {
        console.error("Supabase connection failed:", e);
        return { success: false, message: `Connection failed: ${e.message}` };
    }
};
