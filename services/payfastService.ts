
import type { PayfastConnection } from '../types';
import { supabase } from './supabaseClient';

export const verifyPayfastConnection = async (
    connection: PayfastConnection
): Promise<{ success: boolean; message: string; }> => {
    const { merchantId, merchantKey } = connection;

    if (!merchantId.trim() || !merchantKey.trim()) {
        return { success: false, message: 'Merchant ID and Merchant Key are required.' };
    }

    try {
        const { data, error } = await supabase.functions.invoke('verify-integration', {
            body: { provider: 'payfast', connection }
        });

        if (error) throw new Error(error.message);
        if (!data.success) throw new Error(data.message || 'Verification failed');

        return { success: true, message: data.message };
    } catch (e: any) {
        return { success: false, message: `Verification error: ${e.message}` };
    }
};
