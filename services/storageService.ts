
import { supabase } from './supabaseClient';
import type { Site, User, GlobalSettings } from '../types';

const OAUTH_STATE_KEY = 'zenith_oauth_state';
const PKCE_VERIFIER_KEY = 'zenith_pkce_verifier';
const GLOBAL_SETTINGS_KEY = 'zenith-engine-ai-global-settings';

// Helper for local site storage fallback
const getLocalSites = (userId: string): Site[] => {
    try {
        return JSON.parse(localStorage.getItem(`zenith_sites_${userId}`) || '[]');
    } catch { return []; }
};

const saveLocalSites = (userId: string, sites: Site[]) => {
    localStorage.setItem(`zenith_sites_${userId}`, JSON.stringify(sites));
};

export const storageService = {
  // --- SITE MANAGEMENT (Supabase + Local Fallback) ---

  loadSitesAndLastId: async (user: User): Promise<{ sites: Site[]; lastSelectedId: string | null }> => {
    if (!user) return { sites: [], lastSelectedId: null };

    // Attempt to load from local storage first (fastest)
    const localSites = getLocalSites(user.uid);
    let lastSelectedId = localStorage.getItem(`zenith_last_site_${user.uid}`);

    try {
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('owner_id', user.uid)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Map DB rows back to Site objects
      const remoteSites: Site[] = data.map(row => ({
        ...row.data, // The JSONB column
        id: row.id,  // Ensure ID matches PK
      }));

      // Update local backup with fresh data
      saveLocalSites(user.uid, remoteSites);

      // Find the one marked as last selected from DB
      const selectedSite = data.find(row => row.is_selected);
      if (selectedSite) {
          lastSelectedId = selectedSite.id;
          localStorage.setItem(`zenith_last_site_${user.uid}`, lastSelectedId);
      } else if (remoteSites.length > 0) {
          lastSelectedId = remoteSites[0].id;
      } else {
          lastSelectedId = null;
      }

      return { sites: remoteSites, lastSelectedId };
    } catch (e) {
      // Quietly fall back to local data if remote fails
      return { sites: localSites, lastSelectedId: lastSelectedId || (localSites.length > 0 ? localSites[0].id : null) };
    }
  },

  getSites: async (userId: string): Promise<Site[]> => {
      try {
          const { data, error } = await supabase
            .from('sites')
            .select('data, id')
            .eq('owner_id', userId);
          
          if(error) throw error;
          const sites = data.map(r => ({ ...r.data, id: r.id }));
          saveLocalSites(userId, sites);
          return sites;
      } catch (e) {
          return getLocalSites(userId);
      }
  },

  saveSites: async (sites: Site[], user: User) => {
    if (!user || sites.length === 0) return;
    
    // Always save to local storage (immediate backup)
    saveLocalSites(user.uid, sites);

    try {
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
    } catch (e) {
        // Suppress error, we saved locally
    }
  },

  saveAllSites: async (userId: string, sites: Site[]) => {
      // Used by automation worker
      saveLocalSites(userId, sites);
      try {
        const upsertData = sites.map(site => ({
            id: site.id,
            owner_id: userId,
            name: site.name,
            data: site,
            updated_at: new Date().toISOString()
        }));
        await supabase.from('sites').upsert(upsertData);
      } catch (e) {
          // Suppress error
      }
  },

  saveLastSelectedSiteId: async (userId: string, siteId: string) => {
    localStorage.setItem(`zenith_last_site_${userId}`, siteId);
    try {
        await supabase.from('sites').update({ is_selected: false }).eq('owner_id', userId);
        await supabase.from('sites').update({ is_selected: true }).eq('id', siteId);
    } catch (e) {
        // Suppress error
    }
  },

  clearAllSitesData: async (user: User) => {
      if (!user) return;
      localStorage.removeItem(`zenith_sites_${user.uid}`);
      localStorage.removeItem(`zenith_last_site_${user.uid}`);
      try {
        await supabase.from('sites').delete().eq('owner_id', user.uid);
      } catch (e) {
          // Suppress error
      }
  },

  // --- LEGACY / LOCAL MIGRATION HELPERS ---
  loadLegacySiteSettings: () => {
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

  migrateGuestDataToUser: async (user: User) => {
      // Migration logic handled in App.tsx
  },

  // --- LOCAL HELPERS (OAuth, Settings) ---

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
