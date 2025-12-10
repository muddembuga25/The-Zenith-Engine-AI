
import type { SocialMediaAccount, SocialMediaPost, WhatsAppAccount, TelegramAccount, Site, MetaAsset } from '../types';
import type { SocialPlatform } from './oauthService';

const API_BASE = typeof window === 'undefined' 
    ? (process.env.INTERNAL_API_BASE_URL || 'http://localhost:3000/api') 
    : '/api';

type AnyAccount = SocialMediaAccount | WhatsAppAccount | TelegramAccount;

export function getEnabledDestinations(site: Site, platform: string): (AnyAccount & { metaConnectionId?: string })[] {
    const destinations: (AnyAccount & { metaConnectionId?: string })[] = [];
    const platformKey = platform as keyof typeof site.socialMediaSettings;

    const individualAccounts = (site.socialMediaSettings[platformKey] as AnyAccount[] | undefined) || [];
    destinations.push(...individualAccounts.filter(acc => acc.isAutomationEnabled && acc.status === 'connected'));

    const metaConnection = site.socialMediaSettings.meta?.[0];
    if (metaConnection && metaConnection.status === 'connected' && (platform === 'facebook' || platform === 'instagram')) {
        const metaAssetsForPlatform = metaConnection.assets.filter(asset => asset.platform === platform && asset.isEnabled);
        const mappedAssets: (SocialMediaAccount & { metaConnectionId?: string })[] = metaAssetsForPlatform.map(asset => ({
            id: asset.id,
            name: asset.name,
            isAutomationEnabled: true,
            isConnected: true,
            status: 'connected',
            accessToken: metaConnection.userAccessToken,
            destinationId: asset.id,
            destinationType: 'page',
            metaConnectionId: metaConnection.id
        }));
        destinations.push(...mappedAssets);
    }
    
    return Array.from(new Map(destinations.map(item => [item.id, item])).values());
}

export const postToSocialMedia = async (
    platform: SocialPlatform,
    account: SocialMediaAccount | WhatsAppAccount | TelegramAccount,
    post: SocialMediaPost,
    media?: { type: 'image' | 'video'; data: string }
): Promise<{ success: boolean; message?: string }> => {
    
    if (platform === 'whatsapp' || platform === 'telegram') {
        try {
            const res = await fetch(`${API_BASE}/post-social`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platform, account, content: post, media })
            });

            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Unknown error');

            return { success: true };
        } catch (e: any) {
            console.error(`Error posting to ${platform}:`, e);
            return { success: false, message: e.message };
        }
    }

    // Client-side simulation for others (same as before)
    console.log(`[Social Media Post Sim] Posting to ${platform} for ${account.name}...`);
    await new Promise(resolve => setTimeout(resolve, 1500));
    if (Math.random() < 0.15) {
        return { success: false, message: `Failed to post to ${platform}. API token may have expired.` };
    }
    return { success: true };
};
