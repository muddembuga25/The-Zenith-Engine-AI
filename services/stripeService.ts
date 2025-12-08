import type { StripeConnection } from '../types';
import * as secureBackend from './secureBackendSimulation';

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
    
    // Delegate secret key verification to the secure backend simulation for a live API call
    return secureBackend.verifyStripeSecretKey(connection);
};
