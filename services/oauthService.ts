
import type { WhatsAppAccount, TelegramAccount, MetaAsset, Site, MetaAdsAccount, GoogleAdsAccount } from '../types';
import { storageService } from './storageService';

const isBrowser = typeof window !== 'undefined';
const CORS_PROXY_URL = isBrowser ? 'https://cors-anywhere.herokuapp.com/' : '';
const API_BASE = isBrowser ? '/api' : (process.env.INTERNAL_API_BASE_URL || 'http://localhost:3000/api');

const getRedirectUri = () => {
    if (typeof window !== 'undefined') {
        return window.location.origin + window.location.pathname;
    }
    return process.env.APP_BASE_URL || 'http://localhost:3000';
};

export const OAUTH_CONFIGS = {
    twitter: { authUrl: 'https://twitter.com/i/oauth2/authorize', scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'].join(' '), verifyUrl: 'https://api.twitter.com/2/users/me' },
    facebook: { authUrl: 'https://www.facebook.com/v20.0/dialog/oauth', scopes: 'pages_show_list,pages_manage_posts,public_profile', verifyUrl: 'https://graph.facebook.com/me' },
    instagram: { authUrl: 'https://www.facebook.com/v20.0/dialog/oauth', scopes: 'instagram_basic,instagram_content_publish,pages_show_list', verifyUrl: 'https://graph.facebook.com/me' },
    meta: { authUrl: 'https://www.facebook.com/v20.0/dialog/oauth', scopes: ['email', 'pages_show_list', 'pages_manage_posts', 'instagram_basic', 'instagram_content_publish', 'pages_read_engagement'].join(','), verifyUrl: 'https://graph.facebook.com/me?fields=id,name,email' },
    meta_ads: { authUrl: 'https://www.facebook.com/v20.0/dialog/oauth', scopes: ['email', 'ads_management', 'ads_read', 'business_management'].join(','), verifyUrl: 'https://graph.facebook.com/me?fields=id,name,email' },
    google_ads: { authUrl: 'https://accounts.google.com/o/oauth2/v2/auth', scopes: 'https://www.googleapis.com/auth/adwords', verifyUrl: 'https://www.googleapis.com/oauth2/v3/userinfo' },
    linkedin: { authUrl: 'https://www.linkedin.com/oauth/v2/authorization', scopes: ['profile', 'email', 'w_member_social', 'w_organization_social'].join(' '), verifyUrl: 'https://api.linkedin.com/v2/userinfo' },
    youtube: { authUrl: 'https://accounts.google.com/o/oauth2/v2/auth', scopes: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/spreadsheets.readonly'].join(' '), verifyUrl: 'https://www.googleapis.com/oauth2/v3/userinfo' },
    google_analytics: { authUrl: 'https://accounts.google.com/o/oauth2/v2/auth', scopes: 'https://www.googleapis.com/auth/analytics.readonly', verifyUrl: 'https://www.googleapis.com/oauth2/v3/userinfo' },
    google_calendar: { authUrl: 'https://accounts.google.com/o/oauth2/v2/auth', scopes: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly', verifyUrl: 'https://www.googleapis.com/oauth2/v3/userinfo' },
    tiktok: { authUrl: 'https://www.tiktok.com/v2/auth/authorize', scopes: ['video.upload', 'user.info.basic'].join(','), verifyUrl: 'https://open.tiktokapis.com/v2/user/info/' },
    snapchat: { authUrl: 'https://accounts.snapchat.com/login/oauth2/authorize', scopes: ['snapchat-marketing-api'].join(' '), verifyUrl: 'https://adsapi.snapchat.com/v1/me' },
    pinterest: { authUrl: 'https://www.pinterest.com/oauth/', scopes: ['pins:read', 'pins:write', 'boards:read', 'boards:write'].join(','), verifyUrl: 'https://api.pinterest.com/v5/user_account' },
    whatsapp: { authUrl: '', scopes: '', verifyUrl: 'https://graph.facebook.com/v20.0/me/phone_numbers' },
    telegram: { authUrl: '', scopes: '', verifyUrl: 'https://api.telegram.org/bot{token}/getMe' },
};

export type SocialPlatform = keyof typeof OAUTH_CONFIGS;

export const redirectToAuth = (platform: SocialPlatform, clientId: string, siteId: string, accountId: string) => {
    if (typeof window === 'undefined') return;

    const config = OAUTH_CONFIGS[platform];
    if (!config || !config.authUrl) {
        alert(`OAuth is not configured for ${platform} in this demo app.`);
        return;
    }

    const state = crypto.randomUUID();
    storageService.setOAuthState(JSON.stringify({ state, platform, siteId, accountId }));

    const redirectUri = getRedirectUri();
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: config.scopes,
        state: state,
    });
    
    if (platform === 'twitter') {
        const codeVerifier = crypto.randomUUID() + crypto.randomUUID();
        storageService.setPkceVerifier(codeVerifier);
        
        const createChallenge = async () => {
            const encoder = new TextEncoder();
            const data = encoder.encode(codeVerifier);
            const digest = await crypto.subtle.digest('SHA-256', data);
            const base64url = btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
            params.append('code_challenge', base64url);
            params.append('code_challenge_method', 'S256');
            window.top.location.href = `${config.authUrl}?${params.toString()}`;
        };
        createChallenge();
        return;
    }
    
    if (platform === 'tiktok') {
        params.set('client_key', clientId);
        params.delete('client_id');
    }

    if (platform === 'youtube' || platform === 'google_analytics' || platform === 'google_ads' || platform === 'google_calendar') {
        params.append('access_type', 'offline');
        params.append('prompt', 'consent');
    }

    window.top.location.href = `${config.authUrl}?${params.toString()}`;
};

export const exchangeCodeForToken = async (
    platform: SocialPlatform,
    code: string,
    site: Site,
    accountId: string
): Promise<{ accessToken: string }> => {
    console.log(`[OAuth Service] Exchanging code for token via Node Server...`);
    const codeVerifier = storageService.getPkceVerifier();
    storageService.removePkceVerifier();

    const response = await fetch(`${API_BASE}/oauth-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            code,
            platform,
            siteId: site.id,
            accountId,
            redirectUri: getRedirectUri(),
            codeVerifier
        })
    });

    const data = await response.json();

    if (!response.ok) {
        console.error("Backend Error:", data);
        throw new Error(`Token exchange failed: ${data.error || 'Unknown backend error'}`);
    }

    const accessToken = data.access_token || data.accessToken;
    if (!accessToken) throw new Error("No access token returned from provider.");

    return { accessToken };
};

export const handleOAuthCallback = (): { platform: string; siteId: string; accountId: string; code: string } | null => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    
    if (!code || !state) return null;

    const storedStateJSON = storageService.getOAuthState();
    if (!storedStateJSON) return null;

    try {
        const storedState = JSON.parse(storedStateJSON);
        if (storedState.state !== state) return null;
        window.history.replaceState({}, document.title, window.location.pathname);
        return { platform: storedState.platform, siteId: storedState.siteId, accountId: storedState.accountId, code };
    } catch (e) {
        return null;
    } finally {
        storageService.removeOAuthState();
    }
};

export const getMetaAssets = async (accessToken: string): Promise<Omit<MetaAsset, 'isEnabled'>[]> => {
    // Simulated
    await new Promise(resolve => setTimeout(resolve, 1500));
    return [
        { id: 'page_12345', name: "My Awesome Company Page", platform: 'facebook' },
        { id: 'ig_67890', name: "@my_brand_on_ig", platform: 'instagram' },
    ];
};

export const getMetaAdAccounts = async (accessToken: string): Promise<Omit<MetaAdsAccount, 'isEnabled'>[]> => {
    const url = `https://graph.facebook.com/me/adaccounts?fields=name,id&access_token=${accessToken}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Meta Graph API error: ${errorData.error.message}`);
        }
        const data = await response.json();
        return (data.data || []).map((acc: any) => ({ id: acc.id, name: acc.name }));
    } catch (error) {
        console.error("Failed to fetch Meta Ad Accounts:", error);
        throw error;
    }
};

export const getGoogleAdAccounts = async (accessToken: string): Promise<Omit<GoogleAdsAccount, 'isEnabled'>[]> => {
    const url = 'https://googleads.googleapis.com/v16/customers:listAccessibleCustomers';
    try {
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!response.ok) {
             const errorData = await response.json().catch(() => ({ error: { message: 'Unknown API error' } }));
             throw new Error(`Google Ads API error: ${errorData?.error?.message}`);
        }
        const data = await response.json();
        return (data.resourceNames || []).map((rn: string) => ({ id: rn, name: `Google Ads Account (${rn.split('/')[1]})` }));
    } catch (error) {
        console.error("Failed to fetch Google Ads Accounts:", error);
        throw error;
    }
};

export const verifyConnection = async (platform: SocialPlatform, accessToken: string): Promise<{ success: boolean; message: string; data?: any; }> => {
    const config = OAUTH_CONFIGS[platform];
    if (!config || !config.verifyUrl) return { success: false, message: 'Verification not supported for this platform.' };

    if (['meta', 'meta_ads', 'google_ads', 'google_analytics', 'google_calendar'].includes(platform)) {
        try {
            const response = await fetch(`${config.verifyUrl}`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return { success: false, message: `Token verification failed: ${errorData?.error?.message || response.statusText}` };
            }
            const data = await response.json();
            return { success: true, message: `${platform} connection verified.`, data: { id: data.id || data.sub, name: data.name, email: data.email } };
        } catch (error: any) {
            return { success: false, message: `Network error during verification: ${error.message}` };
        }
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: true, message: 'Connection verified successfully.' };
};

export const verifyCredentialBasedConnection = async (platform: 'whatsapp' | 'telegram', account: WhatsAppAccount | TelegramAccount): Promise<{ success: boolean; message: string; }> => {
    if (platform === 'whatsapp') {
        const waAccount = account as WhatsAppAccount;
        if (!waAccount.accessToken || !waAccount.phoneNumberId) return { success: false, message: 'Access Token and Phone Number ID are required.' };
        try {
            const response = await fetch(`https://graph.facebook.com/v20.0/${waAccount.phoneNumberId}`, { headers: { 'Authorization': `Bearer ${waAccount.accessToken}` } });
            const data = await response.json();
            if (!response.ok) return { success: false, message: data?.error?.message || `WhatsApp API error` };
            if (data.display_phone_number) return { success: true, message: `Connected to number: ${data.display_phone_number}` };
            return { success: false, message: 'Verification failed.' };
        } catch (error: any) { return { success: false, message: `Network error: ${error.message}` }; }
    }
    if (platform === 'telegram') {
        const tgAccount = account as TelegramAccount;
        if (!tgAccount.botToken) return { success: false, message: 'Bot Token is required.' };
        try {
            const response = await fetch(`https://api.telegram.org/bot${tgAccount.botToken}/getMe`);
            const data = await response.json();
            if (!response.ok || !data.ok) return { success: false, message: `Telegram API error: ${data.description}` };
            if (data.result?.username) return { success: true, message: `Connected as bot: @${data.result.username}` };
            return { success: false, message: 'Verification failed.' };
        } catch (error: any) { return { success: false, message: `Network error: ${error.message}` }; }
    }
    return { success: false, message: 'Unsupported platform.' };
};

export const getLatestLiveVideoFromMeta = async (pageId: string, accessToken: string): Promise<{ video_url: string, id: string } | null> => {
    const url = `${CORS_PROXY_URL}https://graph.facebook.com/v20.0/${pageId}/videos?fields=live_status,permalink_url,id,created_time&limit=10&access_token=${accessToken}`;
    try {
        const response = await fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
        if (!response.ok) throw new Error(`Meta Graph API error`);
        const data = await response.json();
        const latestVod = data.data?.find((video: any) => video.live_status === 'VOD');
        if (latestVod && latestVod.permalink_url) return { video_url: latestVod.permalink_url, id: latestVod.id };
        return null;
    } catch (error) {
        console.error("Failed to fetch latest Meta live video:", error);
        throw error;
    }
};
