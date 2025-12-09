
import type { WiseConnection } from '../types';
import { supabase } from './supabaseClient';

export const verifyWiseConnection = async (
    connection: WiseConnection
): Promise<{ success: boolean; message: string; }> => {
    const { apiKey } = connection;

    if (!apiKey.trim()) {
        return { success: false, message: 'API Key is required.' };
    }

    try {
        const { data, error } = await supabase.functions.invoke('verify-integration', {
            body: { provider: 'wise', connection }
        });

        if (error) throw new Error(error.message);
        if (!data.success) throw new Error(data.message || 'Verification failed');

        return { success: true, message: data.message };
    } catch (e: any) {
        return { success: false, message: `Verification error: ${e.message}` };
    }
};
