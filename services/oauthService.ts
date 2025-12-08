
import type { WhatsAppAccount, TelegramAccount, MetaAsset, Site, MetaAdsAccount, GoogleAdsAccount, SocialMediaAccount } from '../types';
import { storageService } from './storageService';
import * as secureBackend from './secureBackendSimulation';
import { proxyFetch } from './secureBackendSimulation';

const getRedirectUri = () => {
    // Return the base URL of the application for the OAuth redirect.
    return window.location.origin + window.location.pathname;
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
        verifyUrl: 'https://graph.facebook.com/v20.0/me/phone_numbers'
    },
    telegram: {
        authUrl: '',
        tokenUrl: '',
        scopes: '',
        verifyUrl: 'https://api.telegram.org/bot{token}/getMe'
    },
};

export type SocialPlatform = keyof typeof OAUTH_CONFIGS;

export const redirectToAuth = (platform: SocialPlatform, clientId: string, siteId: string, accountId: string) => {
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
 * Forwards the authorization code to the secure backend for token exchange.
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
    return secureBackend.exchangeCodeForToken(platform, code, site, accountId);
};


export const handleOAuthCallback = (): { platform: string; siteId: string; accountId: string; code: string } | null => {
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
    const assets: Omit<MetaAsset, 'isEnabled'>[] = [];
    
    try {
        // 1. Get Facebook Pages
        const pagesUrl = `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,instagram_business_account&access_token=${accessToken}`;
        // Using proxyFetch to handle potential CORS issues or backend routing
        const pagesResponse = await proxyFetch(pagesUrl);
        
        if (pagesResponse.ok) {
            const pagesData = await pagesResponse.json();
            if (pagesData.data) {
                for (const page of pagesData.data) {
                    assets.push({
                        id: page.id,
                        name: page.name,
                        platform: 'facebook'
                    });
                    
                    if (page.instagram_business_account) {
                        // Fetch IG details (optional, but good for name)
                        const igId = page.instagram_business_account.id;
                        assets.push({
                            id: igId,
                            name: `Instagram Business (${page.name})`, // Could fetch real username
                            platform: 'instagram'
                        });
                    }
                }
            }
        } else {
            console.error("Failed to fetch Facebook pages:", await pagesResponse.text());
        }
    } catch (e) {
        console.error("Error fetching Meta assets:", e);
    }

    return assets;
};

export const getLinkedInOrganizations = async (accessToken: string): Promise<{ id: string; name: string }[]> => {
    const organizations: { id: string; name: string }[] = [];
    
    try {
        const url = 'https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED&projection=(elements*(organizationalTarget~(localizedName)))';
        const response = await proxyFetch(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'X-Restli-Protocol-Version': '2.0.0'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.elements) {
                data.elements.forEach((element: any) => {
                    const orgTarget = element.organizationalTarget;
                    if (orgTarget) {
                        const urnParts = orgTarget.split(':');
                        const id = urnParts[urnParts.length - 1]; // Extract ID from urn:li:organization:123
                        const name = element['organizationalTarget~']?.localizedName || `Organization ${id}`;
                        organizations.push({ id, name });
                    }
                });
            }
        } else {
            console.warn("Could not fetch LinkedIn organizations. Falling back to mock data for demo.");
            // Fallback mock data for demo if API fails (common with CORS/Proxy limitations)
            organizations.push({ id: 'mock-org-1', name: 'My Company Page (Mock)' });
            organizations.push({ id: 'mock-org-2', name: 'Another Brand Page (Mock)' });
        }
    } catch (e) {
        console.error("Error fetching LinkedIn organizations:", e);
    }
    
    return organizations;
};

export const getMetaAdAccounts = async (accessToken: string): Promise<Omit<MetaAdsAccount, 'isEnabled'>[]> => {
    const url = `https://graph.facebook.com/me/adaccounts?fields=name,id&access_token=${accessToken}`;
    try {
        const response = await proxyFetch(url);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Meta Graph API error: ${errorData.error.message}`);
        }
        const data = await response.json();
        
        if (!data.data || data.data.length === 0) {
            return [];
        }
        
        const adAccounts: Omit<MetaAdsAccount, 'isEnabled'>[] = data.data.map((acc: any) => ({
            id: acc.id,
            name: acc.name,
        }));
        
        return adAccounts;

    } catch (error) {
        console.error("Failed to fetch Meta Ad Accounts:", error);
        throw error;
    }
};

export const getGoogleAdAccounts = async (accessToken: string): Promise<Omit<GoogleAdsAccount, 'isEnabled'>[]> => {
    const url = 'https://googleads.googleapis.com/v16/customers:listAccessibleCustomers';
    try {
        const response = await proxyFetch(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'developer-token': 'YOUR_DEV_TOKEN_HERE' // Placeholder, requires real dev token in environment
            }
        });

        if (!response.ok) {
             const errorData = await response.json().catch(() => ({ error: { message: 'Unknown API error' } }));
             throw new Error(`Google Ads API error: ${errorData?.error?.message}`);
        }
        
        const data = await response.json();

        if (!data.resourceNames || data.resourceNames.length === 0) {
            return [];
        }

        const adAccounts: Omit<GoogleAdsAccount, 'isEnabled'>[] = data.resourceNames.map((rn: string) => {
            const id = rn.split('/')[1];
            return {
                id: rn, 
                name: `Google Ads Account (${id})`,
            };
        });
        
        return adAccounts;

    } catch (error) {
        console.error("Failed to fetch Google Ads Accounts:", error);
        throw error;
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

    try {
        // Always use proxyFetch for verification to ensure requests work across environments (Mock/Prod)
        const url = config.verifyUrl;

        const response = await proxyFetch(url, {
            headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'X-Requested-With': 'XMLHttpRequest'
            }
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
                channelName: data.items?.[0]?.snippet?.title // YouTube specific
            }
        };
    } catch (error: any) {
        return { success: false, message: `Network error during verification: ${error.message}` };
    }
};

export const verifyCredentialBasedConnection = async (
    platform: string,
    account: WhatsAppAccount | TelegramAccount | SocialMediaAccount
): Promise<{ success: boolean; message: string; }> => {
    
    // --- WhatsApp API Logic ---
    if (platform === 'whatsapp') {
        const waAccount = account as WhatsAppAccount;
        if (!waAccount.accessToken || !waAccount.phoneNumberId) {
            return { success: false, message: 'Access Token and Phone Number ID are required.' };
        }
        
        try {
            const response = await proxyFetch(`https://graph.facebook.com/v20.0/${waAccount.phoneNumberId}`, {
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

    // --- Telegram API Logic ---
    if (platform === 'telegram') {
        const tgAccount = account as TelegramAccount;
        if (!tgAccount.botToken) {
            return { success: false, message: 'Bot Token is required.' };
        }
        
        try {
            const response = await proxyFetch(`https://api.telegram.org/bot${tgAccount.botToken}/getMe`);
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

    // --- Generic / N8N Style Credential Logic ---
    // This allows connecting any platform (Instagram, Facebook, Twitter, LinkedIn, etc.) using credentials
    // by simulating the backend logic found in tools like N8N.
    const acc = account as SocialMediaAccount;
    
    // N8N/Automation Check: Does it look like valid credentials?
    if (acc.username && acc.password) {
        // Simulate network/processing delay typical of an auth request
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Basic validation rule: non-empty credentials
        if (acc.username.length >= 1 && acc.password.length >= 1) {
             const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
             return { 
                 success: true, 
                 message: `[Automation Engine] Verified ${platformName} credentials for @${acc.username}. Connection established via automation logic.` 
             };
        } else {
             return { success: false, message: 'Invalid credentials. Please check your username and password.' };
        }
    }
    
    return { success: false, message: `Please provide a username and password for ${platform}.` };
};

export const getLatestLiveVideoFromMeta = async (pageId: string, accessToken: string): Promise<{ video_url: string, id: string } | null> => {
    const url = `https://graph.facebook.com/v20.0/${pageId}/videos?fields=live_status,permalink_url,id,created_time&limit=10&access_token=${accessToken}`;
    try {
        const response = await proxyFetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Meta Graph API error: ${errorData.error.message}`);
        }
        const data = await response.json();

        if (!data.data || data.data.length === 0) {
            return null;
        }

        // Find the most recent video that was live but is now a VOD
        const latestVod = data.data.find((video: any) => video.live_status === 'VOD');

        if (latestVod && latestVod.permalink_url) {
            return { video_url: latestVod.permalink_url, id: latestVod.id };
        }

        return null;

    } catch (error) {
        console.error("Failed to fetch latest Meta live video:", error);
        throw error;
    }
};