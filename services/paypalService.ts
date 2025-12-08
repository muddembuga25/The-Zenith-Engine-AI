import type { PayPalConnection } from '../types';
import * as secureBackend from './secureBackendSimulation';

export const verifyPayPalConnection = async (
    connection: PayPalConnection
): Promise<{ success: boolean; message: string; }> => {
    const { clientId, clientSecret } = connection;

    if (!clientId.trim() || !clientSecret.trim()) {
        return { success: false, message: 'Client ID and Client Secret are required.' };
    }

    // Delegate verification to the secure backend simulation for a live API call
    return secureBackend.verifyPayPalCredentials(connection);
};
