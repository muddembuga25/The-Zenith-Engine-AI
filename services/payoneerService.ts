import type { PayoneerConnection } from '../types';
import * as secureBackend from './secureBackendSimulation';

export const verifyPayoneerConnection = async (
    connection: PayoneerConnection
): Promise<{ success: boolean; message: string; }> => {
    const { partnerId, programId, apiKey } = connection;

    if (!partnerId.trim() || !programId.trim() || !apiKey.trim()) {
        return { success: false, message: 'Partner ID, Program ID, and API Key are required.' };
    }

    // Delegate verification to the secure backend simulation for a live API call
    return secureBackend.verifyPayoneerCredentials(connection);
};
