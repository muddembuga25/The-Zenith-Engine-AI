
import type { PayfastConnection } from '../types';

const API_BASE = typeof window === 'undefined' ? 'http://localhost:3000/api' : '/api';

export const verifyPayfastConnection = async (
    connection: PayfastConnection
): Promise<{ success: boolean; message: string; }> => {
    const { merchantId, merchantKey } = connection;

    if (!merchantId.trim() || !merchantKey.trim()) {
        return { success: false, message: 'Merchant ID and Merchant Key are required.' };
    }

    try {
        const res = await fetch(`${API_BASE}/verify-integration`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'payfast', connection })
        });

        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Verification failed');

        return { success: true, message: data.message };
    } catch (e: any) {
        return { success: false, message: `Verification error: ${e.message}` };
    }
};
