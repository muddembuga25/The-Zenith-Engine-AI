
import type { PayoneerConnection } from '../types';

const API_BASE = typeof window === 'undefined' ? 'http://localhost:3000/api' : '/api';

export const verifyPayoneerConnection = async (
    connection: PayoneerConnection
): Promise<{ success: boolean; message: string; }> => {
    const { partnerId, programId, apiKey } = connection;

    if (!partnerId.trim() || !programId.trim() || !apiKey.trim()) {
        return { success: false, message: 'Partner ID, Program ID, and API Key are required.' };
    }

    try {
        const res = await fetch(`${API_BASE}/verify-integration`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'payoneer', connection })
        });

        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Verification failed');

        return { success: true, message: data.message };
    } catch (e: any) {
        return { success: false, message: `Verification error: ${e.message}` };
    }
};
