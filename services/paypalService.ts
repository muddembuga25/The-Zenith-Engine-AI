
import type { PayPalConnection } from '../types';
import { supabase } from './supabaseClient';

export const verifyPayPalConnection = async (
    connection: PayPalConnection
): Promise<{ success: boolean; message: string; }> => {
    const { clientId, clientSecret } = connection;

    if (!clientId.trim() || !clientSecret.trim()) {
        return { success: false, message: 'Client ID and Client Secret are required.' };
    }

    try {
        const { data, error } = await supabase.functions.invoke('verify-integration', {
            body: { provider: 'paypal', connection }
        });

        if (error) throw new Error(error.message);
        if (!data.success) throw new Error(data.message || 'Verification failed');

        return { success: true, message: data.message };
    } catch (e: any) {
        return { success: false, message: `Verification error: ${e.message}` };
    }
};
