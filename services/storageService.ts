
import { supabase, supabaseRead } from './supabaseClient';
import type { Site, User, GlobalSettings } from '../types';

const OAUTH_STATE_KEY = 'zenith_oauth_state';
const PKCE_VERIFIER_KEY = 'zenith_pkce_verifier';
const GLOBAL_SETTINGS_KEY = 'zenith-engine-ai-global-settings';

export const storageService = {
  // --- SITE MANAGEMENT (Supabase Source of Truth) ---

  loadSitesAndLastId: async (user: User): Promise<{ sites: Site[]; lastSelectedId: string | null }> => {
    if (!user || !supabaseRead) return { sites: [], lastSelectedId: null };

    // Fetch sites from Supabase using READ client
    const { data, error } = await supabaseRead
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
      if (!supabaseRead) return [];
      // Use READ client for fetching sites
      const { data, error } = await supabaseRead
        .from('sites')
        .select('data, id')
        .eq('owner_id', userId);
      
      if(error) throw error;
      return data.map(r => ({ ...r.data, id: r.id }));
  },

  saveSites: async (sites: Site[], user: User) => {
    if (!user || sites.length === 0 || !supabase) return;
    
    // Upsert sites to Supabase using WRITE client
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
      // Use WRITE client
      if (!supabase) return;
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
    if (!supabase) return;
    // 1. Reset selection for this user (Write)
    const { error: resetError } = await supabase
        .from('sites')
        .update({ is_selected: false })
        .eq('owner_id', userId);
        
    if (resetError) console.error("Error resetting site selection:", resetError);

    // 2. Set new selection (Write)
    const { error: setError } = await supabase
        .from('sites')
        .update({ is_selected: true })
        .eq('id', siteId);

    if (setError) console.error("Error saving site selection:", setError);
  },

  clearAllSitesData: async (user: User) => {
      if (!user || !supabase) return;
      // Write operation
      const { error } = await supabase.from('sites').delete().eq('owner_id', user.uid);
      if (error) console.error("Error clearing sites remotely:", error);
  },

  // --- MIGRATION UTILITY ---
  // Can be called to push local data to Supabase if transitioning existing users
  migrateGuestDataToUser: async (user: User) => {
      if (!supabaseRead) return;
      try {
          const localSitesJson = localStorage.getItem(`zenith_sites_${user.uid}`);
          if (localSitesJson) {
              const localSites = JSON.parse(localSitesJson);
              if (Array.isArray(localSites) && localSites.length > 0) {
                  // Check remote count first (Read)
                  const { count } = await supabaseRead.from('sites').select('*', { count: 'exact', head: true }).eq('owner_id', user.uid);
                  
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

  // Global settings (Gateways, etc) - Ideally move to a 'system_settings' table in Supabase
  // but for now, we'll keep local or implement a simple remote fetch if needed.
  // For production, this should be in the DB accessible only by admins.
  loadGlobalSettings: (): GlobalSettings => {
      try {
          const settings = localStorage.getItem(GLOBAL_SETTINGS_KEY);
          return settings ? JSON.parse(settings) : {};
      } catch {
          return {};
      }
  },

  saveGlobalSettings: (settings: GlobalSettings) => {
      localStorage.setItem(GLOBAL_SETTINGS_KEY, JSON.stringify(settings));
  }
};
