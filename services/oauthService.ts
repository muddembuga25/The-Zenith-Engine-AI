
import type { WhatsAppAccount, TelegramAccount, MetaAsset, Site, MetaAdsAccount, GoogleAdsAccount } from '../types';
import { storageService } from './storageService';
import { supabase } from './supabaseClient';

const CORS_PROXY_URL = 'https://cors-anywhere.herokuapp.com/';

const getRedirectUri = () => {
    // Return the base URL of the application for the OAuth redirect.
    if (typeof window !== 'undefined') {
        return window.location.origin + window.location.pathname;
    }
    // Fallback for server-side (Node.js) execution
    return process.env.APP_BASE_URL || 'http://localhost:3000';
};

// Export for use in the simulated backend
export const OAUTH_CONFIGS = {
    twitter: {
        authUrl: 'https://twitter.com/i/oauth2/authorize',
        tokenUrl: 'https://api.twitter.com/2/oauth2/token',
        scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'].join(' '),
        verifyUrl: 'https://api.twitter.com/2/users/me',
    },
    facebook: {
        authUrl: 'https://www.facebook.com/v20.0/dialog/oauth',
        tokenUrl: 'https://graph.facebook.com/v20.0/oauth/access_token',
        scopes: 'pages_show_list,pages_manage_posts,public_profile',
        verifyUrl: 'https://graph.facebook.com/me',
    },
    instagram: {
        authUrl: 'https://www.facebook.com/v20.0/dialog/oauth',
        tokenUrl: 'https://graph.facebook.com/v20.0/oauth/access_token',
        scopes: 'instagram_basic,instagram_content_publish,pages_show_list',
        verifyUrl: 'https://graph.facebook.com/me',
    },
    meta: {
        authUrl: 'https://www.facebook.com/v20.0/dialog/oauth',
        tokenUrl: 'https://graph.facebook.com/v20.0/oauth/access_token',
        scopes: [
            'email',
            'pages_show_list',
            'pages_manage_posts',
            'instagram_basic',
            'instagram_content_publish',
            'pages_read_engagement',
        ].join(','),
        verifyUrl: 'https://graph.facebook.com/me?fields=id,name,email',
    },
    meta_ads: {
        authUrl: 'https://www.facebook.com/v20.0/dialog/oauth',
        tokenUrl: 'https://graph.facebook.com/v20.0/oauth/access_token',
        scopes: [
            'email',
            'ads_management',
            'ads_read',
            'business_management'
        ].join(','),
        verifyUrl: 'https://graph.facebook.com/me?fields=id,name,email',
    },
    google_ads: {
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        scopes: 'https://www.googleapis.com/auth/adwords',
        verifyUrl: 'https://www.googleapis.com/oauth2/v3/userinfo'
    },
    linkedin: {
        authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
        tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
        scopes: ['profile', 'email', 'w_member_social', 'w_organization_social'].join(' '),
        verifyUrl: 'https://api.linkedin.com/v2/userinfo',
    },
    youtube: {
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        scopes: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/spreadsheets.readonly'].join(' '),
        verifyUrl: 'https://www.googleapis.com/oauth2/v3/userinfo'
    },
    google_analytics: {
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        scopes: 'https://www.googleapis.com/auth/analytics.readonly',
        verifyUrl: 'https://www.googleapis.com/oauth2/v3/userinfo'
    },
    google_calendar: {
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        scopes: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly',
        verifyUrl: 'https://www.googleapis.com/oauth2/v3/userinfo'
    },
    tiktok: {
        authUrl: 'https://www.tiktok.com/v2/auth/authorize',
        tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
        scopes: ['video.upload', 'user.info.basic'].join(','),
        verifyUrl: 'https://open.tiktokapis.com/v2/user/info/'
    },
    snapchat: {
        authUrl: 'https://accounts.snapchat.com/login/oauth2/authorize',
        tokenUrl: 'https://accounts.snapchat.com/login/oauth2/access_token',
        scopes: ['snapchat-marketing-api'].join(' '),
        verifyUrl: 'https://adsapi.snapchat.com/v1/me'
    },
    pinterest: {
        authUrl: 'https://www.pinterest.com/oauth/',
        tokenUrl: 'https://api.pinterest.com/v5/oauth/token',
        scopes: ['pins:read', 'pins:write', 'boards:read', 'boards:write'].join(','),
        verifyUrl: 'https://api.pinterest.com/v5/user_account'
    },
    whatsapp: {
        authUrl: '',
        tokenUrl: '',
        scopes: '',
        verifyUrl: 'https://graph.facebook.com/v20.0/me/phone_numbers' // Placeholder
    },
    telegram: {
        authUrl: '',
        tokenUrl: '',
        scopes: '',
        verifyUrl: 'https://api.telegram.org/bot{token}/getMe' // Placeholder, requires token in URL
    },
};

// Export for use in the simulated backend and other services
export type SocialPlatform = keyof typeof OAUTH_CONFIGS;

export const redirectToAuth = (platform: SocialPlatform, clientId: string, siteId: string, accountId: string) => {
    if (typeof window === 'undefined') return;

    const config = OAUTH_CONFIGS[platform];
    if (!config || !config.authUrl) {
        alert(`OAuth is not configured for ${platform} in this demo app.`);
        console.error(`OAuth not configured for platform: ${platform}`);
        return;
    }

    const state = crypto.randomUUID();
    // Store necessary info to handle the callback, now including accountId
    storageService.setOAuthState(JSON.stringify({ state, platform, siteId, accountId }));

    const redirectUri = getRedirectUri();
    
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: config.scopes,
        state: state,
    });
    
    // Twitter requires a PKCE challenge
    if (platform === 'twitter') {
        const codeVerifier = crypto.randomUUID() + crypto.randomUUID();
        storageService.setPkceVerifier(codeVerifier);
        
        const createChallenge = async () => {
            const encoder = new TextEncoder();
            const data = encoder.encode(codeVerifier);
            const digest = await crypto.subtle.digest('SHA-256', data);
            const base64url = btoa(String.fromCharCode(...new Uint8Array(digest)))
                .replace(/=/g, '')
                .replace(/\+/g, '-')
                .replace(/\//g, '_');

            params.append('code_challenge', base64url);
            params.append('code_challenge_method', 'S256');
            
            window.top.location.href = `${config.authUrl}?${params.toString()}`;
        };
        
        createChallenge();
        return;
    }
    
    // TikTok requires a specific parameter name
    if (platform === 'tiktok') {
        params.set('client_key', clientId);
        params.delete('client_id');
    }

    // Google/YouTube specific parameter
    if (platform === 'youtube' || platform === 'google_analytics' || platform === 'google_ads' || platform === 'google_calendar') {
        params.append('access_type', 'offline');
        params.append('prompt', 'consent');
    }


    window.top.location.href = `${config.authUrl}?${params.toString()}`;
};


/**
 * Forwards the authorization code to the Supabase Edge Function for token exchange.
 * The frontend no longer handles client secrets.
 * @param platform The social media platform.
 * @param code The authorization code from the OAuth provider.
 * @param site The site object containing all configurations.
 * @param accountId The specific ID of the account being connected.
 * @returns A promise that resolves with the access token from the backend.
 */
export const exchangeCodeForToken = async (
    platform: SocialPlatform,
    code: string,
    site: Site,
    accountId: string
): Promise<{ accessToken: string }> => {
    console.log(`[OAuth Service] Exchanging code for token via Supabase Edge Function...`);
    
    const codeVerifier = storageService.getPkceVerifier();
    storageService.removePkceVerifier();

    const { data, error } = await supabase.functions.invoke('oauth-token', {
        body: {
            code,
            platform,
            siteId: site.id,
            accountId,
            redirectUri: getRedirectUri(),
            codeVerifier
        }
    });

    if (error) {
        console.error("Edge Function Error:", error);
        throw new Error(`Token exchange failed: ${error.message || 'Unknown backend error'}`);
    }

    if (data?.error) {
        console.error("Provider Error:", data.error);
        throw new Error(`Provider refused token: ${data.error}`);
    }

    // Handle different provider response structures
    const accessToken = data.access_token || data.accessToken;
    
    if (!accessToken) {
        throw new Error("No access token returned from provider.");
    }

    return { accessToken };
};


export const handleOAuthCallback = (): { platform: string; siteId: string; accountId: string; code: string } | null => {
    if (typeof window === 'undefined') return null;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    
    if (!code || !state) {
        return null;
    }

    const storedStateJSON = storageService.getOAuthState();
    if (!storedStateJSON) {
        return null;
    }

    try {
        const storedState = JSON.parse(storedStateJSON);
        if (storedState.state !== state) {
            console.error("OAuth state mismatch. Possible CSRF attack.");
            return null;
        }

        window.history.replaceState({}, document.title, window.location.pathname);
        
        return {
            platform: storedState.platform,
            siteId: storedState.siteId,
            accountId: storedState.accountId,
            code: code,
        };
    } catch (e) {
        console.error("Error parsing stored OAuth state.", e);
        return null;
    } finally {
        storageService.removeOAuthState();
    }
};

export const getMetaAssets = async (accessToken: string): Promise<Omit<MetaAsset, 'isEnabled'>[]> => {
    // In a real app, you would make two calls:
    // 1. GET https://graph.facebook.com/me/accounts?access_token=${accessToken} to get Facebook Pages
    // 2. For each page, GET https://graph.facebook.com/{page-id}?fields=instagram_business_account&access_token=${accessToken} to get linked IG account

    console.log(`[OAuth Asset Fetch Sim] Fetching Facebook pages and Instagram accounts...`);
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simulated data
    const assets: Omit<MetaAsset, 'isEnabled'>[] = [
        { id: 'page_12345', name: "My Awesome Company Page", platform: 'facebook' },
        { id: 'ig_67890', name: "@my_brand_on_ig", platform: 'instagram' },
        { id: 'page_54321', name: "My Other Fun Page", platform: 'facebook' },
    ];

    console.log(`[OAuth Asset Fetch Sim] Found ${assets.length} assets.`);
    return assets;
};

export const getMetaAdAccounts = async (accessToken: string): Promise<Omit<MetaAdsAccount, 'isEnabled'>[]> => {
    const url = `https://graph.facebook.com/me/adaccounts?fields=name,id&access_token=${accessToken}`;
    console.log(`[OAuth Service] Fetching live Meta Ad Accounts from Graph API...`);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Meta Graph API error: ${errorData.error.message}`);
        }
        const data = await response.json();
        
        if (!data.data || data.data.length === 0) {
            console.warn("No ad accounts found for this Meta user.");
            return [];
        }
        
        const adAccounts: Omit<MetaAdsAccount, 'isEnabled'>[] = data.data.map((acc: any) => ({
            id: acc.id,
            name: acc.name,
        }));
        
        console.log(`[OAuth Service] Found ${adAccounts.length} ad accounts.`);
        return adAccounts;

    } catch (error) {
        console.error("Failed to fetch Meta Ad Accounts:", error);
        throw error;
    }
};

export const getGoogleAdAccounts = async (accessToken: string): Promise<Omit<GoogleAdsAccount, 'isEnabled'>[]> => {
    const url = 'https://googleads.googleapis.com/v16/customers:listAccessibleCustomers';
    console.log(`[OAuth Service] Attempting to fetch live Google Ads customers...`);

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                // A valid 'developer-token' header is required for this call to succeed.
            }
        });

        if (!response.ok) {
             const errorData = await response.json().catch(() => ({ error: { message: 'Unknown API error' } }));
             const message = errorData?.error?.message || 'Could not parse error';
             if (message.toLowerCase().includes('developer token')) {
                 throw new Error(`Could not fetch Google Ads accounts: A Google Ads API developer token is required but not configured in this application.`);
             }
             throw new Error(`Google Ads API error: ${message}`);
        }
        
        const data = await response.json();

        if (!data.resourceNames || data.resourceNames.length === 0) {
            return []; // No accounts found is a valid, non-error state.
        }

        const adAccounts: Omit<GoogleAdsAccount, 'isEnabled'>[] = data.resourceNames.map((rn: string) => {
            const id = rn.split('/')[1];
            return {
                id: rn, // e.g., "customers/1234567890"
                name: `Google Ads Account (${id})`,
            };
        });
        
        console.log(`[OAuth Service] Found ${adAccounts.length} accessible ad accounts.`);
        return adAccounts;

    } catch (error) {
        console.error("Failed to fetch Google Ads Accounts:", error);
        throw error; // Re-throw the error to be handled by the UI.
    }
};

export const verifyConnection = async (
    platform: SocialPlatform,
    accessToken: string
): Promise<{ success: boolean; message: string; data?: any; }> => {
    const config = OAUTH_CONFIGS[platform];
    if (!config || !config.verifyUrl) {
        return { success: false, message: 'Verification not supported for this platform.' };
    }

    // Use live API calls for ads platforms instead of simulation
    if (platform === 'meta' || platform === 'meta_ads' || platform === 'google_ads' || platform === 'google_analytics' || platform === 'google_calendar') {
        try {
            const response = await fetch(`${config.verifyUrl}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return { success: false, message: `Token verification failed: ${errorData?.error?.message || response.statusText}` };
            }
            const data = await response.json();
            const platformName = platform.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

            return {
                success: true,
                message: `${platformName} connection verified.`,
                data: {
                    id: data.id || data.sub, // Google uses 'sub' for user ID
                    name: data.name,
                    email: data.email,
                }
            };
        } catch (error: any) {
            return { success: false, message: `Network error during verification: ${error.message}` };
        }
    }
    
    console.log(`[Connection Verification Simulation] Simulating check for ${platform}...`);

    await new Promise(resolve => setTimeout(resolve, 1000));

    if (Math.random() < 0.2) {
        return { 
            success: false, 
            message: 'The API token seems to be invalid or has expired. Please reconnect the account.' 
        };
    }
    
    if (platform === 'facebook' || platform === 'instagram') {
        console.log(`[OAuth Verify Sim] Verifying ${platform} token...`);
        return {
            success: true,
            message: `${platform.charAt(0).toUpperCase() + platform.slice(1)} connection verified.`
        };
    }

    if (platform === 'youtube') {
        return {
            success: true,
            message: 'Connection verified for channel "My Awesome Vlogs".',
            data: { channelName: 'My Awesome Vlogs', channelId: 'UCxxxxxxxxxxxxxx-xxxx' }
        };
    }
    
    return { success: true, message: 'Connection verified successfully.' };
};

export const verifyCredentialBasedConnection = async (
    platform: 'whatsapp' | 'telegram',
    account: WhatsAppAccount | TelegramAccount
): Promise<{ success: boolean; message: string; }> => {
    
    if (platform === 'whatsapp') {
        const waAccount = account as WhatsAppAccount;
        if (!waAccount.accessToken || !waAccount.phoneNumberId) {
            return { success: false, message: 'Access Token and Phone Number ID are required.' };
        }
        
        try {
            const response = await fetch(`https://graph.facebook.com/v20.0/${waAccount.phoneNumberId}`, {
                headers: {
                    'Authorization': `Bearer ${waAccount.accessToken}`
                }
            });
            
            const data = await response.json();

            if (!response.ok) {
                const errorMessage = data?.error?.message || `WhatsApp API error: ${response.statusText}`;
                return { success: false, message: errorMessage };
            }

            if (data.display_phone_number) {
                 return { success: true, message: `Connected to number: ${data.display_phone_number}` };
            } else {
                 return { success: false, message: 'Verification failed. The response was unexpected.' };
            }

        } catch (error: any) {
            return { success: false, message: `Network error: ${error.message}` };
        }
    }

    if (platform === 'telegram') {
        const tgAccount = account as TelegramAccount;
        if (!tgAccount.botToken) {
            return { success: false, message: 'Bot Token is required.' };
        }
        
        try {
            const response = await fetch(`https://api.telegram.org/bot${tgAccount.botToken}/getMe`);
            const data = await response.json();

            if (!response.ok || !data.ok) {
                return { success: false, message: `Telegram API error: ${data.description || 'Invalid token'}` };
            }
            
            if (data.result?.username) {
                return { success: true, message: `Connected as bot: @${data.result.username}` };
            } else {
                 return { success: false, message: 'Verification failed. The response was unexpected.' };
            }

        } catch (error: any) {
            return { success: false, message: `Network error: ${error.message}` };
        }
    }
    
    return { success: false, message: 'Unsupported platform for credential verification.' };
};

export const getLatestLiveVideoFromMeta = async (pageId: string, accessToken: string): Promise<{ video_url: string, id: string } | null> => {
    const url = `${CORS_PROXY_URL}https://graph.facebook.com/v20.0/${pageId}/videos?fields=live_status,permalink_url,id,created_time&limit=10&access_token=${accessToken}`;
    console.log(`[OAuth Service] Fetching latest live videos from Meta Page ID: ${pageId}`);

    try {
        const response = await fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Meta Graph API error: ${errorData.error.message}`);
        }
        const data = await response.json();

        if (!data.data || data.data.length === 0) {
            console.warn("No videos found for this Meta page.");
            return null;
        }

        const latestVod = data.data.find((video: any) => video.live_status === 'VOD');

        if (latestVod && latestVod.permalink_url) {
             console.log(`[OAuth Service] Found latest completed live video: ${latestVod.id}`);
            return { video_url: latestVod.permalink_url, id: latestVod.id };
        }

        console.log(`[OAuth Service] No recently completed live videos found.`);
        return null;

    } catch (error) {
        console.error("Failed to fetch latest Meta live video:", error);
        throw error;
    }
};
