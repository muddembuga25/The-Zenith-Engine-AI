
import type { SocialMediaAccount, SocialMediaPost, WhatsAppAccount, TelegramAccount, Site, MetaAsset } from '../types';
import type { SocialPlatform } from './oauthService';
import { supabase } from './supabaseClient';

// A union type for any kind of account for easier handling.
type AnyAccount = SocialMediaAccount | WhatsAppAccount | TelegramAccount;

/**
 * Creates a unified list of all enabled social media destinations for a specific platform.
 * This function is the single source of truth for the automation engine. It combines
 * individually connected accounts with assets managed via the Meta Business Suite.
 * @param site The site configuration object.
 * @param platform The social media platform (e.g., 'facebook', 'instagram', 'whatsapp').
 * @returns An array of account-like objects ready for posting.
 */
export function getEnabledDestinations(site: Site, platform: string): (AnyAccount & { metaConnectionId?: string })[] {
    const destinations: (AnyAccount & { metaConnectionId?: string })[] = [];
    const platformKey = platform as keyof typeof site.socialMediaSettings;

    // 1. Get individually connected accounts that are enabled and have a 'connected' status.
    const individualAccounts = (site.socialMediaSettings[platformKey] as AnyAccount[] | undefined) || [];
    destinations.push(...individualAccounts.filter(acc => acc.isAutomationEnabled && acc.status === 'connected'));

    // 2. Get accounts from the Meta Business Suite connection, if it exists and is connected.
    const metaConnection = site.socialMediaSettings.meta?.[0];
    if (metaConnection && metaConnection.status === 'connected' && (platform === 'facebook' || platform === 'instagram')) {
        const metaAssetsForPlatform = metaConnection.assets.filter(asset => asset.platform === platform && asset.isEnabled);
        
        // Map MetaAsset to a structure compatible with SocialMediaAccount for the posting service.
        const mappedAssets: (SocialMediaAccount & { metaConnectionId?: string })[] = metaAssetsForPlatform.map(asset => ({
            id: asset.id,
            name: asset.name,
            isAutomationEnabled: true, // If the asset is enabled in the UI, it's enabled for automation.
            isConnected: true, // Redundant but good for compatibility. The real check is the parent's status.
            status: 'connected',
            accessToken: metaConnection.userAccessToken, // Use the main user access token from the Meta connection.
            destinationId: asset.id, // The asset ID is the destination for posting.
            destinationType: 'page', // Assume Meta assets are pages or business accounts.
            metaConnectionId: metaConnection.id // Add a reference back to the parent Meta connection.
        }));
        
        destinations.push(...mappedAssets);
    }
    
    // Return a unique list based on account/asset ID to prevent duplicates if connected in multiple ways.
    const uniqueDestinations = Array.from(new Map(destinations.map(item => [item.id, item])).values());
    
    return uniqueDestinations;
}


export const postToSocialMedia = async (
    platform: SocialPlatform,
    account: SocialMediaAccount | WhatsAppAccount | TelegramAccount,
    post: SocialMediaPost,
    media?: { type: 'image' | 'video'; data: string } // data can be base64 or URL
): Promise<{ success: boolean; message?: string }> => {
    
    // For WhatsApp and Telegram, we use the secure Edge Function.
    if (platform === 'whatsapp' || platform === 'telegram') {
        try {
            const { data, error } = await supabase.functions.invoke('post-social', {
                body: { platform, account, content: post, media }
            });

            if (error) throw new Error(error.message);
            if (!data.success) throw new Error(data.error || 'Unknown error');

            return { success: true };
        } catch (e: any) {
            console.error(`Error posting to ${platform}:`, e);
            return { success: false, message: e.message };
        }
    }

    // Keep simulation for other platforms due to frontend security constraints (client secrets)
    // or lack of public API for direct client-side posting.
    let channelInfo = '';
    if (platform === 'youtube') {
        const ytAccount = account as SocialMediaAccount;
        channelInfo = `\nChannel: ${ytAccount.extraData?.channelName || 'Default'} (ID: ${ytAccount.destinationId || 'Not specified'})`;
    }

    const mediaLog = media ? `\nMedia Type: ${media.type}\nMedia Data: ${media.data.substring(0, 70)}...` : '';

    console.log(`
        --- [Social Media Post Simulation] ---
        Attempting to post to ${platform} for account "${account.name}".${channelInfo}
        Content: "${post.content.substring(0, 50)}..."${mediaLog}
        
        This simulation has a chance to fail to demonstrate how the app handles
        posting errors, like an expired token.
        -------------------------------------------
    `);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Randomly fail about 15% of the time to simulate an API error
    if (Math.random() < 0.15) {
        return { 
            success: false, 
            message: `Failed to post to ${platform}. The API token may have expired or permissions were revoked. Please reconnect.` 
        };
    }

    return { success: true };
};
