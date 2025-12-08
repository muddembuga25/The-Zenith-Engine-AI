
import type { WiseConnection } from '../types';
import * as secureBackend from './secureBackendSimulation';

export const verifyWiseConnection = async (
    connection: WiseConnection
): Promise<{ success: boolean; message: string; }> => {
    const { apiKey } = connection;

    if (!apiKey.trim()) {
        return { success: false, message: 'API Key is required.' };
    }

    // Delegate the secret key verification to the simulated secure backend.
    return secureBackend.verifyWiseApiKey(connection);
};
