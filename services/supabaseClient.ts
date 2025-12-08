
import { createClient } from '@supabase/supabase-js';
import { config } from './config';

// Initialize Supabase only if keys are present.
// This prevents the app from crashing in environments where DB is not yet set up,
// allowing the "Offline Mode" (localStorage) logic in authService to take over.

export const isSupabaseConfigured = !!(config.supabaseUrl && config.supabaseAnonKey && config.supabaseUrl !== 'https://placeholder.supabase.co');

if (!isSupabaseConfigured) {
  console.debug("Supabase environment variables missing or default. Application will run in Offline Mode (Local Storage).");
}

export const supabase = createClient(
  config.supabaseUrl || 'https://placeholder.supabase.co',
  config.supabaseAnonKey || 'placeholder',
  {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    }
  }
);

// Helper to create a client with specific credentials (used for verifying external connections in Settings)
export const createSupabaseClient = (url: string, key: string) => {
    return createClient(url, key);
};
