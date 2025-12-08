
import type { PaystackConnection } from '../types';
import * as secureBackend from './secureBackendSimulation';

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
    
    // Delegate the secret key verification to the simulated secure backend.
    return secureBackend.verifyPaystackSecretKey(connection);
};
