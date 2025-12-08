
import type { Site, SocialMediaAccount, PaystackConnection, WiseConnection, WhatsAppAccount, TelegramAccount, SocialMediaPost, PayfastConnection, StripeConnection, PayPalConnection, PayoneerConnection } from '../types';
import { SocialPlatform } from './oauthService';

const CORS_PROXY_URL = 'https://cors-anywhere.herokuapp.com/';
const WISE_API_URL = 'https://api.wise.com';

// This file acts as a client-side proxy for direct API calls that don't require a dedicated backend route yet,
// or for services where the "secure" aspect is handled via user-provided keys in the frontend.
// Note: OAuth Token Exchange has been moved to Supabase Edge Functions (services/oauthService.ts).

/**
 * Makes a live API call to verify a Paystack secret key.
 */
export const verifyPaystackSecretKey = async (connection: PaystackConnection): Promise<{ success: boolean; message: string; }> => {
    console.log(`[API PROXY] Verifying Paystack secret key...`);
    const { secretKey } = connection;
    try {
        const response = await fetch(`${CORS_PROXY_URL}https://api.paystack.co/bank`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${secretKey}`,
                'X-Requested-With': 'XMLHttpRequest'
            },
        });

        const data = await response.json();

        if (response.ok && data.status === true) {
            return { success: true, message: 'Paystack keys are valid and connection is successful.' };
        } else {
            return { success: false, message: `Paystack API error: ${data.message || 'Invalid credentials or network issue.'}` };
        }
    } catch (e: any) {
        return { success: false, message: `A network error occurred. This could be a CORS issue. Error: ${e.message}` };
    }
};

/**
 * Makes a live API call to verify a Wise API key.
 */
export const verifyWiseApiKey = async (connection: WiseConnection): Promise<{ success: boolean; message: string; }> => {
    console.log(`[API PROXY] Verifying Wise API key...`);
    const { apiKey } = connection;
     try {
        const response = await fetch(`${CORS_PROXY_URL}${WISE_API_URL}/v1/profiles`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'X-Requested-With': 'XMLHttpRequest'
            },
        });

        const data = await response.json();

        if (response.ok) {
            return { success: true, message: 'Wise API Key is valid and connection is successful.' };
        } else {
            const errorMessage = data.errors?.[0]?.message || data.message || 'Invalid credentials or network issue.';
            return { success: false, message: `Wise API error: ${errorMessage}` };
        }
    } catch (e: any) {
        return { success: false, message: `A network error occurred. This could be a CORS issue. Error: ${e.message}` };
    }
};

/**
 * Makes a live API call to verify Payfast credentials.
 */
export const verifyPayfastCredentials = async (connection: PayfastConnection): Promise<{ success: boolean; message: string; }> => {
    console.log(`[API PROXY] Verifying Payfast credentials...`);
    const { merchantId, merchantKey } = connection;
    
    const data = new URLSearchParams();
    data.append('merchant_id', merchantId);
    data.append('merchant_key', merchantKey);

    try {
        const response = await fetch(`${CORS_PROXY_URL}https://www.payfast.co.za/eng/query/validate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: data.toString(),
        });

        const textResponse = await response.text();
        
        if (response.ok && textResponse.trim().toUpperCase() === 'VALID') {
            return { success: true, message: 'Payfast credentials are valid.' };
        } else {
            return { success: false, message: `Payfast validation failed. The API responded with: ${textResponse.trim() || 'No Response'}` };
        }
    } catch (e: any) {
        return { success: false, message: `A network error occurred. This could be a CORS issue. Error: ${e.message}` };
    }
};

/**
 * Makes a live API call to verify a Stripe secret key.
 */
export const verifyStripeSecretKey = async (connection: StripeConnection): Promise<{ success: boolean; message: string; }> => {
    console.log(`[API PROXY] Verifying Stripe secret key...`);
    const { secretKey } = connection;
    try {
        const response = await fetch(`${CORS_PROXY_URL}https://api.stripe.com/v1/customers?limit=1`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${secretKey}`,
                'X-Requested-With': 'XMLHttpRequest'
            },
        });
        
        const data = await response.json();

        if (response.ok) {
            return { success: true, message: 'Stripe API key is valid.' };
        } else {
            return { success: false, message: `Stripe API error: ${data.error.message || 'Invalid credentials.'}` };
        }
    } catch (e: any) {
        return { success: false, message: `A network error occurred. Error: ${e.message}` };
    }
};

/**
 * Makes a live API call to verify PayPal credentials.
 */
export const verifyPayPalCredentials = async (connection: PayPalConnection): Promise<{ success: boolean; message: string; }> => {
    console.log(`[API PROXY] Verifying PayPal credentials...`);
    const { clientId, clientSecret } = connection;
    const encodedCredentials = btoa(`${clientId}:${clientSecret}`);

    try {
        const response = await fetch(`${CORS_PROXY_URL}https://api-m.paypal.com/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${encodedCredentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: 'grant_type=client_credentials'
        });

        const data = await response.json();

        if (response.ok && data.access_token) {
            return { success: true, message: 'PayPal credentials are valid.' };
        } else {
            return { success: false, message: `PayPal API error: ${data.error_description || 'Invalid credentials.'}` };
        }
    } catch (e: any) {
        return { success: false, message: `A network error occurred. Error: ${e.message}` };
    }
};

/**
 * Makes a live API call to verify Payoneer credentials.
 */
export const verifyPayoneerCredentials = async (connection: PayoneerConnection): Promise<{ success: boolean; message: string; }> => {
    console.log(`[API PROXY] Verifying Payoneer credentials...`);
    const { partnerId, apiKey } = connection;

    try {
        const encodedCredentials = btoa(`${partnerId}:${apiKey}`);
        const response = await fetch(`${CORS_PROXY_URL}https://api.payoneer.com/v2/accounts/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${encodedCredentials}`,
                'X-Requested-With': 'XMLHttpRequest'
            },
        });

        const data = await response.json();
        
        if (response.ok) {
            return { success: true, message: 'Payoneer credentials appear to be valid.' };
        } else {
            return { success: false, message: `Payoneer API error: ${data.error_description || data.message || 'Invalid credentials.'}` };
        }
    } catch (e: any) {
        return { success: false, message: `A network error occurred. Error: ${e.message}` };
    }
};


/**
 * Makes a live API call to post a message to WhatsApp.
 */
export const postToWhatsApp = async (account: WhatsAppAccount, post: SocialMediaPost): Promise<{ success: boolean; message?: string }> => {
    console.log(`[API PROXY] Posting to WhatsApp for account "${account.name}"`);
    const url = `https://graph.facebook.com/v20.0/${account.phoneNumberId}/messages`;
    
    const body = {
        messaging_product: "whatsapp",
        to: account.destination,
        type: "text",
        text: {
            preview_url: false,
            body: `${post.content}\n${post.hashtags.join(' ')}`
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${account.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
             const errorMessage = data?.error?.message || `WhatsApp API error: ${response.statusText}`;
            return { success: false, message: errorMessage };
        }
        return { success: true };

    } catch (error: any) {
        return { success: false, message: `Network error: ${error.message}` };
    }
};

/**
 * Makes a live API call to post a message to Telegram.
 */
export const postToTelegram = async (account: TelegramAccount, post: SocialMediaPost, media?: { type: 'image' | 'video'; data: string }): Promise<{ success: boolean; message?: string }> => {
    console.log(`[API PROXY] Posting to Telegram for account "${account.name}"`);
    const url = `https://api.telegram.org/bot${account.botToken}/sendMessage`;
    let text = `${post.content}\n${post.hashtags.join(' ')}`;
    
    if (media?.type === 'video') {
        text += `\n\nVideo available at: ${media.data}`;
    }
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chat_id: account.chatId,
                text: text
            })
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
            return { success: false, message: `Telegram API error: ${data.description || 'Failed to send message'}` };
        }
        return { success: true };

    } catch (error: any) {
        return { success: false, message: `Network error: ${error.message}` };
    }
};
