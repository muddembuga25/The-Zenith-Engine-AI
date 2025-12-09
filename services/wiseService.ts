
import type { WiseConnection } from '../types';

const API_BASE = typeof window === 'undefined' ? 'http://localhost:3000/api' : '/api';

export const verifyWiseConnection = async (
    connection: WiseConnection
): Promise<{ success: boolean; message: string; }> => {
    const { apiKey } = connection;

    if (!apiKey.trim()) {
        return { success: false, message: 'API Key is required.' };
    }

    try {
        const res = await fetch(`${API_BASE}/verify-integration`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'wise', connection })
        });

        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Verification failed');

        return { success: true, message: data.message };
    } catch (e: any) {
        return { success: false, message: `Verification error: ${e.message}` };
    }
};
