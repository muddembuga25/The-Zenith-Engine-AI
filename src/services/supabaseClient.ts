import { createClient } from '@supabase/supabase-js';

// This is a placeholder client. In a real app, you would initialize this
// with environment variables or user-provided credentials from the global settings.

export const supabase = createClient(
  'https://placeholder-project.supabase.co',
  'placeholder-anon-key'
);

// Helper to create a client with specific credentials
export const createSupabaseClient = (url: string, key: string) => {
    return createClient(url, key);
};