
import type { StripeConnection } from '../types';
import { supabase } from './supabaseClient';

export const verifyStripeConnection = async (
    connection: StripeConnection
): Promise<{ success: boolean; message: string; }> => {
    const { publicKey, secretKey } = connection;

    if (!publicKey.trim() || !secretKey.trim()) {
        return { success: false, message: 'Public Key and Secret Key are required.' };
    }

    const isPkValid = publicKey.startsWith('pk_test_') || publicKey.startsWith('pk_live_');
    const isSkValid = secretKey.startsWith('sk_test_') || secretKey.startsWith('sk_live_');

    if (!isPkValid || !isSkValid) {
        return { success: false, message: 'Invalid key format. Keys should start with pk_... and sk_...' };
    }
    
    try {
        const { data, error } = await supabase.functions.invoke('verify-integration', {
            body: { provider: 'stripe', connection }
        });

        if (error) throw new Error(error.message);
        if (!data.success) throw new Error(data.message || 'Verification failed');

        return { success: true, message: data.message };
    } catch (e: any) {
        return { success: false, message: `Verification error: ${e.message}` };
    }
};
