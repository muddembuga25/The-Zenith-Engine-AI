
import type { StripeConnection } from '../types';

const API_BASE = typeof window === 'undefined' ? 'http://localhost:3000/api' : '/api';

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
    
    try {
        const res = await fetch(`${API_BASE}/verify-integration`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'stripe', connection })
        });

        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Verification failed');

        return { success: true, message: data.message };
    } catch (e: any) {
        return { success: false, message: `Verification error: ${e.message}` };
    }
};
