
export const config = {
  // AI Keys
  googleApiKey: process.env.API_KEY || '',
  
  // Database
  supabaseUrl: process.env.REACT_APP_SUPABASE_URL || '',
  supabaseAnonKey: process.env.REACT_APP_SUPABASE_ANON_KEY || '',

  // Backend Configuration
  // If a backend URL is provided in env, we assume production mode. 
  // Otherwise, we fall back to the client-side simulation (Mock Mode).
  backendUrl: process.env.REACT_APP_BACKEND_URL || '',
  useMockBackend: !process.env.REACT_APP_BACKEND_URL,
  
  // Development Tools
  corsProxyUrl: 'https://cors-anywhere.herokuapp.com/',
};

export const getHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  // Add auth tokens here if using a real backend
  return headers;
};
