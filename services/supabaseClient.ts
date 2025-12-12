
import { createClient } from '@supabase/supabase-js';

// Configuration for the live Supabase backend
const envUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const envKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const envReadUrl = process.env.SUPABASE_READ_URL;

// Logic: Env vars ONLY. No local storage fallback for production security.
export const supabaseUrl = envUrl || '';
export const supabaseAnonKey = envKey || '';

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
  : null as any; // Allow app to load to show config error screen

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
    // This functionality is deprecated in favor of Environment Variables.
    // Kept to prevent build errors in legacy components like BackendSetupWizard.
    console.warn("Attempted to save backend config via UI. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.");
};
