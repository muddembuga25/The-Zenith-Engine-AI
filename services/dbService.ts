
import type { SupabaseConnection } from '../types';

const API_BASE = typeof window === 'undefined' ? 'http://localhost:3000/api' : '/api';

export const verifySupabaseConnection = async (
    connection: SupabaseConnection
): Promise<{ success: boolean; message: string; }> => {
    if (!connection.url.trim() || !connection.anonKey.trim()) {
        return { success: false, message: 'URL and Anon Key are required.' };
    }

    try {
        const res = await fetch(`${API_BASE}/verify-integration`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'supabase', connection })
        });

        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Verification failed');

        return { success: true, message: data.message };

    } catch (e: any) {
        return { success: false, message: `Connection failed: ${e.message}` };
    }
};
