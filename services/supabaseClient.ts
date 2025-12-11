
import { createClient } from '@supabase/supabase-js';

// Configuration for the live Supabase backend
const envUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const envKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const envReadUrl = process.env.SUPABASE_READ_URL;

// Dynamic Configuration: Check localStorage for client-side overrides
const localConfigStr = typeof window !== 'undefined' ? localStorage.getItem('zenith_supabase_config') : null;
const localConfig = localConfigStr ? JSON.parse(localConfigStr) : null;

// Logic: Env vars > Local Storage > Placeholder
// We use placeholders to prevent crash if no config is found anywhere.
export const supabaseUrl = envUrl || localConfig?.url || 'https://placeholder.supabase.co';
export const supabaseAnonKey = envKey || localConfig?.key || 'placeholder-key';

// Helper to check if we are in "configured" mode or "setup" mode
export const isBackendConfigured = (): boolean => {
    return supabaseUrl !== 'https://placeholder.supabase.co' && supabaseAnonKey !== 'placeholder-key';
};

// Helper to save configuration (Client-side simulation of backend connection)
export const saveBackendConfig = (url: string, key: string) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('zenith_supabase_config', JSON.stringify({ url, key }));
        // Reload is usually required to re-initialize top-level consts in other modules
        window.location.reload();
    }
};

export const resetBackendConfig = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('zenith_supabase_config');
        window.location.reload();
    }
}

// Primary Client (Write Operations)
export const supabase = createClient(
  supabaseUrl, 
  supabaseAnonKey,
  {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: typeof window !== 'undefined' // Only detect URL session in browser
    }
  }
);

// Secondary Client (Read Operations)
export const supabaseRead = envReadUrl 
    ? createClient(envReadUrl, supabaseAnonKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
      })
    : supabase;

// Helper to create a client with specific credentials
export const createSupabaseClient = (url: string, key: string) => {
    return createClient(url, key);
};
