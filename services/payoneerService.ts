
import type { PayoneerConnection } from '../types';
import { supabase } from './supabaseClient';

export const verifyPayoneerConnection = async (
    connection: PayoneerConnection
): Promise<{ success: boolean; message: string; }> => {
    const { partnerId, programId, apiKey } = connection;

    if (!partnerId.trim() || !programId.trim() || !apiKey.trim()) {
        return { success: false, message: 'Partner ID, Program ID, and API Key are required.' };
    }

    try {
        const { data, error } = await supabase.functions.invoke('verify-integration', {
            body: { provider: 'payoneer', connection }
        });

        if (error) throw new Error(error.message);
        if (!data.success) throw new Error(data.message || 'Verification failed');

        return { success: true, message: data.message };
    } catch (e: any) {
        return { success: false, message: `Verification error: ${e.message}` };
    }
};
