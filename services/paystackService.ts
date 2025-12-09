
import type { PaystackConnection } from '../types';

const API_BASE = typeof window === 'undefined' ? 'http://localhost:3000/api' : '/api';

export const verifyPaystackConnection = async (
    connection: PaystackConnection
): Promise<{ success: boolean; message: string; }> => {
    const { publicKey, secretKey } = connection;

    if (!publicKey.trim() || !secretKey.trim()) {
        return { success: false, message: 'Public Key and Secret Key are required.' };
    }

    const isPkValid = publicKey.startsWith('pk_test_') || publicKey.startsWith('pk_live_');
    if (!isPkValid) {
        return { success: false, message: 'Invalid Public Key format. It should start with pk_...' };
    }
    
    try {
        const res = await fetch(`${API_BASE}/verify-integration`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'paystack', connection })
        });

        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Verification failed');

        return { success: true, message: data.message };
    } catch (e: any) {
        return { success: false, message: `Verification error: ${e.message}` };
    }
};
