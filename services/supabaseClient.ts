
import { createClient } from '@supabase/supabase-js';

// Configuration for the live Supabase backend
const envUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const envKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const envReadUrl = process.env.SUPABASE_READ_URL;

// Local storage fallback for client-side configuration
const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('zenith_supabase_url') : null;
const storedKey = typeof window !== 'undefined' ? localStorage.getItem('zenith_supabase_key') : null;

// Logic: Env vars > Local Storage.
export const supabaseUrl = envUrl || storedUrl || '';
export const supabaseAnonKey = envKey || storedKey || '';

// Helper to check if we are in "configured" mode
export const isBackendConfigured = (): boolean => {
    return !!supabaseUrl && !!supabaseAnonKey && 
           supabaseUrl !== 'https://placeholder.supabase.co' && 
           supabaseAnonKey !== 'placeholder-key';
};

// Primary Client (Write Operations)
export const supabase = isBackendConfigured() 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: typeof window !== 'undefined'
      }
    })
  : null as any; // Allow app to load to show config wizard if null

// Secondary Client (Read Operations)
export const supabaseRead = (isBackendConfigured() && envReadUrl)
    ? createClient(envReadUrl, supabaseAnonKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
      })
    : supabase;

// Helper to create a client with specific credentials (used for verifying connections)
export const createSupabaseClient = (url: string, key: string) => {
    return createClient(url, key);
};

export const saveBackendConfig = (url: string, key: string) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('zenith_supabase_url', url);
        localStorage.setItem('zenith_supabase_key', key);
        // Reload to re-initialize client constants
        window.location.reload();
    }
};
