
import type { SocialMediaAccount, SocialMediaPost, WhatsAppAccount, TelegramAccount, Site, MetaAsset } from '../types';
import type { SocialPlatform } from './oauthService';
import * as secureBackend from './secureBackendSimulation';
import { proxyFetch } from './secureBackendSimulation';

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
            connectionMethod: 'oauth',
            accessToken: metaConnection.userAccessToken,
            destinationId: asset.id,
            destinationType: 'page',
            metaConnectionId: metaConnection.id
        }));
        
        destinations.push(...mappedAssets);
    }
    
    const uniqueDestinations = Array.from(new Map(destinations.map(item => [item.id, item])).values());
    
    return uniqueDestinations;
}


export const postToSocialMedia = async (
    platform: SocialPlatform,
    account: SocialMediaAccount | WhatsAppAccount | TelegramAccount,
    post: SocialMediaPost,
    media?: { type: 'image' | 'video'; data: string } 
): Promise<{ success: boolean; message?: string }> => {
    
    if (platform === 'whatsapp') {
        return secureBackend.postToWhatsApp(account as WhatsAppAccount, post);
    }
    
    if (platform === 'telegram') {
        return secureBackend.postToTelegram(account as TelegramAccount, post, media);
    }

    try {
        if (platform === 'twitter') {
            const acc = account as SocialMediaAccount;
            const url = `https://api.twitter.com/2/tweets`;
            const response = await proxyFetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${acc.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: post.content })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || data.title || 'Twitter API Error');
            return { success: true };
        }

        if (platform === 'facebook') {
            const acc = account as SocialMediaAccount;
            const pageId = acc.destinationId || acc.id; 
            const url = `https://graph.facebook.com/${pageId}/feed`;
            const response = await proxyFetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: post.content,
                    access_token: acc.accessToken
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || 'Facebook API Error');
            return { success: true };
        }

        if (platform === 'linkedin') {
            const acc = account as SocialMediaAccount;
            const url = `https://api.linkedin.com/v2/ugcPosts`;
            
            // Determine if posting to organization or person based on destinationId
            const author = acc.destinationId 
                ? (acc.destinationId.startsWith('urn:') ? acc.destinationId : `urn:li:organization:${acc.destinationId}`)
                : `urn:li:person:${acc.id}`; 
            
            const body = {
                author: author,
                lifecycleState: "PUBLISHED",
                specificContent: {
                    "com.linkedin.ugc.ShareContent": {
                        shareCommentary: { text: post.content },
                        shareMediaCategory: "NONE"
                    }
                },
                visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" }
            };

            const response = await proxyFetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${acc.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'LinkedIn API Error');
            return { success: true };
        }

        console.warn(`Live posting to ${platform} with media is not fully supported in this environment.`);
        return { success: false, message: `Live posting to ${platform} is limited in this environment.` };

    } catch (error: any) {
        console.error(`Post to ${platform} failed:`, error);
        return { 
            success: false, 
            message: `Failed to post to ${platform}: ${error.message}` 
        };
    }
};