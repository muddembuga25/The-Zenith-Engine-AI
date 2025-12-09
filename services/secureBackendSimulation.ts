
/**
 * DEPRECATED
 * 
 * This file has been deprecated. All functionality has been moved to:
 * - services/oauthService.ts (Authentication)
 * - supabase/functions/verify-integration (Credentials Verification)
 * - supabase/functions/post-social (Social Media Posting)
 * - services/aiService.ts -> supabase/functions/generate-content (AI Generation)
 * 
 * Please do not import from this file. It remains temporarily to prevent build errors during migration 
 * but exports empty stubs or throws errors.
 */

import type { PaystackConnection, WiseConnection, WhatsAppAccount, TelegramAccount, SocialMediaPost, PayfastConnection, StripeConnection, PayPalConnection, PayoneerConnection } from '../types';

export const verifyPaystackSecretKey = async (connection: PaystackConnection): Promise<{ success: boolean; message: string; }> => {
    throw new Error("This method is deprecated. Use services/paystackService.ts");
};

export const verifyWiseApiKey = async (connection: WiseConnection): Promise<{ success: boolean; message: string; }> => {
    throw new Error("This method is deprecated. Use services/wiseService.ts");
};

export const verifyPayfastCredentials = async (connection: PayfastConnection): Promise<{ success: boolean; message: string; }> => {
    throw new Error("This method is deprecated. Use services/payfastService.ts");
};

export const verifyStripeSecretKey = async (connection: StripeConnection): Promise<{ success: boolean; message: string; }> => {
    throw new Error("This method is deprecated. Use services/stripeService.ts");
};

export const verifyPayPalCredentials = async (connection: PayPalConnection): Promise<{ success: boolean; message: string; }> => {
    throw new Error("This method is deprecated. Use services/paypalService.ts");
};

export const verifyPayoneerCredentials = async (connection: PayoneerConnection): Promise<{ success: boolean; message: string; }> => {
    throw new Error("This method is deprecated. Use services/payoneerService.ts");
};

export const postToWhatsApp = async (account: WhatsAppAccount, post: SocialMediaPost): Promise<{ success: boolean; message?: string }> => {
    throw new Error("This method is deprecated. Use services/socialMediaService.ts");
};

export const postToTelegram = async (account: TelegramAccount, post: SocialMediaPost, media?: { type: 'image' | 'video'; data: string }): Promise<{ success: boolean; message?: string }> => {
    throw new Error("This method is deprecated. Use services/socialMediaService.ts");
};
