
import { createClient } from '@supabase/supabase-js';

// Configuration for the live Supabase backend
// In production, these must be set in your build environment (e.g., Vercel, Netlify)
// We check for both REACT_APP_ prefixed variables (Frontend) and standard variables (Backend/Node)
const envUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const envKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

// CRITICAL FIX: Prevent crash if variables are missing by using placeholders.
// The app will load, but network requests will fail until real keys are provided in .env
const supabaseUrl = envUrl || 'https://placeholder.supabase.co';
const supabaseAnonKey = envKey || 'placeholder-key';

if (!envUrl || !envKey) {
  // Only log error if we are not in a build step or similar environment where these might be missing intentionally
  if (typeof window !== 'undefined') {
      console.warn("Supabase URL or Anon Key is missing. Using placeholders to prevent crash. App will not function correctly until .env is configured.");
  }
}

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

// Helper to create a client with specific credentials (used for verifying external connections if needed)
export const createSupabaseClient = (url: string, key: string) => {
    return createClient(url, key);
};
