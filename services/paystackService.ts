
import type { PaystackConnection } from '../types';
import { supabase } from './supabaseClient';

export const verifyPaystackConnection = async (
    connection: PaystackConnection
): Promise<{ success: boolean; message: string; }> => {
    const { publicKey, secretKey } = connection;

    if (!publicKey.trim() || !secretKey.trim()) {
        return { success: false, message: 'Public Key and Secret Key are required.' };
    }

    // Frontend validation: Check the format of the public key (this is safe to do client-side).
    const isPkValid = publicKey.startsWith('pk_test_') || publicKey.startsWith('pk_live_');
    if (!isPkValid) {
        return { success: false, message: 'Invalid Public Key format. It should start with pk_...' };
    }
    
    // Delegate the secret key verification to the Supabase Edge Function.
    try {
        const { data, error } = await supabase.functions.invoke('verify-integration', {
            body: { provider: 'paystack', connection }
        });

        if (error) throw new Error(error.message);
        if (!data.success) throw new Error(data.message || 'Verification failed');

        return { success: true, message: data.message };
    } catch (e: any) {
        return { success: false, message: `Verification error: ${e.message}` };
    }
};
