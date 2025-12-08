import type { PayfastConnection } from '../types';
import * as secureBackend from './secureBackendSimulation';

export const verifyPayfastConnection = async (
    connection: PayfastConnection
): Promise<{ success: boolean; message: string; }> => {
    const { merchantId, merchantKey } = connection;

    if (!merchantId.trim() || !merchantKey.trim()) {
        return { success: false, message: 'Merchant ID and Merchant Key are required.' };
    }

    // Delegate verification to the secure backend simulation for a live API call
    return secureBackend.verifyPayfastCredentials(connection);
};
