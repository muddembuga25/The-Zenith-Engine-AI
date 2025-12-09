
import { supabase } from './supabaseClient';
import type { Site, User, GlobalSettings } from '../types';

const OAUTH_STATE_KEY = 'zenith_oauth_state';
const PKCE_VERIFIER_KEY = 'zenith_pkce_verifier';
const GLOBAL_SETTINGS_KEY = 'zenith-engine-ai-global-settings';
const GLOBAL_SETTINGS_DB_ID = 'global_config';

export const storageService = {
  // --- SITE MANAGEMENT (Supabase Source of Truth) ---

  loadSitesAndLastId: async (user: User): Promise<{ sites: Site[]; lastSelectedId: string | null }> => {
    if (!user) return { sites: [], lastSelectedId: null };

    // Fetch sites from Supabase
    const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('owner_id', user.uid)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error("Error loading sites from Supabase:", error);
        throw error;
    }

    // Map DB rows back to Site objects
    const remoteSites: Site[] = data.map(row => ({
        ...row.data, // The JSONB column contains the full site object
        id: row.id,  // Ensure ID matches PK
    }));

    // Find the site marked as last selected from DB
    const selectedSite = data.find(row => row.is_selected);
    let lastSelectedId = selectedSite ? selectedSite.id : (remoteSites.length > 0 ? remoteSites[0].id : null);

    return { sites: remoteSites, lastSelectedId };
  },

  getSites: async (userId: string): Promise<Site[]> => {
      const { data, error } = await supabase
        .from('sites')
        .select('data, id')
        .eq('owner_id', userId);
      
      if(error) throw error;
      return data.map(r => ({ ...r.data, id: r.id }));
  },

  saveSites: async (sites: Site[], user: User) => {
    if (!user || sites.length === 0) return;
    
    // Upsert sites to Supabase
    const upsertData = sites.map(site => ({
        id: site.id,
        owner_id: user.uid,
        name: site.name,
        data: site, // Store the full object as JSONB
        updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
        .from('sites')
        .upsert(upsertData, { onConflict: 'id' });

    if (error) throw error;
  },

  saveAllSites: async (userId: string, sites: Site[]) => {
      // Used by automation worker (Node.js context)
      const upsertData = sites.map(site => ({
          id: site.id,
          owner_id: userId,
          name: site.name,
          data: site,
          updated_at: new Date().toISOString()
      }));
      
      const { error } = await supabase.from('sites').upsert(upsertData);
      if(error) throw error;
  },

  saveLastSelectedSiteId: async (userId: string, siteId: string) => {
    // 1. Reset selection for this user
    const { error: resetError } = await supabase
        .from('sites')
        .update({ is_selected: false })
        .eq('owner_id', userId);
        
    if (resetError) console.error("Error resetting site selection:", resetError);

    // 2. Set new selection
    const { error: setError } = await supabase
        .from('sites')
        .update({ is_selected: true })
        .eq('id', siteId);

    if (setError) console.error("Error saving site selection:", setError);
  },

  clearAllSitesData: async (user: User) => {
      if (!user) return;
      const { error } = await supabase.from('sites').delete().eq('owner_id', user.uid);
      if (error) console.error("Error clearing sites remotely:", error);
  },

  // --- MIGRATION UTILITY ---
  // Can be called to push local data to Supabase if transitioning existing users
  migrateGuestDataToUser: async (user: User) => {
      try {
          const localSitesJson = localStorage.getItem(`zenith_sites_${user.uid}`);
          if (localSitesJson) {
              const localSites = JSON.parse(localSitesJson);
              if (Array.isArray(localSites) && localSites.length > 0) {
                  // Only migrate if remote has no sites? Or upsert?
                  // Let's check remote count first
                  const { count } = await supabase.from('sites').select('*', { count: 'exact', head: true }).eq('owner_id', user.uid);
                  
                  if (count === 0) {
                      console.log("Migrating local sites to Supabase for user:", user.email);
                      await storageService.saveSites(localSites, user);
                  }
              }
          }
      } catch (e) {
          console.error("Migration failed:", e);
      }
  },

  // --- LEGACY HELPERS ---
  loadLegacySiteSettings: () => {
    // Kept for initial import from v1 local storage
    try {
      const settingsJson = localStorage.getItem('zenith-engine-ai-settings');
      return settingsJson ? JSON.parse(settingsJson) : null;
    } catch (e) {
      return null;
    }
  },

  removeLegacySiteSettings: () => {
    localStorage.removeItem('zenith-engine-ai-settings');
  },

  // --- LOCAL HELPERS (OAuth, Settings) ---
  // OAuth state is transient and browser-specific, so we keep it in localStorage
  setOAuthState: (state: string) => {
    localStorage.setItem(OAUTH_STATE_KEY, state);
  },

  getOAuthState: () => {
    return localStorage.getItem(OAUTH_STATE_KEY);
  },

  removeOAuthState: () => {
    localStorage.removeItem(OAUTH_STATE_KEY);
  },

  setPkceVerifier: (verifier: string) => {
    localStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  },

  getPkceVerifier: () => {
    return localStorage.getItem(PKCE_VERIFIER_KEY);
  },

  removePkceVerifier: () => {
    localStorage.removeItem(PKCE_VERIFIER_KEY);
  },

  // --- GLOBAL SETTINGS (SECURE BACKEND STORAGE) ---
  
  loadGlobalSettings: async (): Promise<GlobalSettings> => {
      try {
          // 1. Attempt to fetch from Supabase first
          const { data, error } = await supabase
              .from('system_settings')
              .select('data')
              .eq('id', GLOBAL_SETTINGS_DB_ID)
              .single();

          if (!error && data) {
              return data.data as GlobalSettings;
          }

          // 2. Fallback / Migration: Check LocalStorage
          // If we have local settings but nothing in DB (or DB failed), try to use local
          // and attempt to migrate them to DB if possible.
          const localSettingsJson = localStorage.getItem(GLOBAL_SETTINGS_KEY);
          if (localSettingsJson) {
              console.log("Migrating Global Settings from LocalStorage to Supabase...");
              const parsedSettings = JSON.parse(localSettingsJson);
              
              // Attempt to save to DB immediately to complete migration
              await storageService.saveGlobalSettings(parsedSettings);
              
              // Optionally clear local to enforce security, or keep as backup? 
              // For security, we should eventually remove it, but keeping for safety during dev.
              // localStorage.removeItem(GLOBAL_SETTINGS_KEY); 
              
              return parsedSettings;
          }

          return {};
      } catch (e) {
          console.warn("Failed to load global settings:", e);
          return {};
      }
  },

  saveGlobalSettings: async (settings: GlobalSettings) => {
      try {
          // Save to Supabase
          const { error } = await supabase
              .from('system_settings')
              .upsert({ 
                  id: GLOBAL_SETTINGS_DB_ID, 
                  data: settings, 
                  updated_at: new Date().toISOString() 
              });

          if (error) {
              console.error("Failed to save global settings to DB:", error);
              // Fallback to local storage if DB write fails, to ensure app doesn't break
              localStorage.setItem(GLOBAL_SETTINGS_KEY, JSON.stringify(settings));
              throw error; 
          } else {
              // On successful DB save, we can remove local storage to ensure security
              localStorage.removeItem(GLOBAL_SETTINGS_KEY);
          }
      } catch (e) {
          throw e;
      }
  }
};
