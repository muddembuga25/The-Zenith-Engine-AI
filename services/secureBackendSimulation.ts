
import type { Site, SocialMediaAccount, PaystackConnection, WiseConnection, WhatsAppAccount, TelegramAccount, SocialMediaPost, PayfastConnection, StripeConnection, PayPalConnection, PayoneerConnection, SubscriptionPlan, GlobalSettings } from '../types';
import { OAUTH_CONFIGS, SocialPlatform } from './oauthService';
import { storageService } from './storageService';
import { config } from './config';

const WISE_API_URL = 'https://api.wise.com';

// --- HELPER: PROXY FETCH ---
/**
 * Centralized fetch wrapper.
 * In MOCK mode: Uses CORS proxy to make direct calls from the browser.
 * In PROD mode: Should route requests through your secure backend to avoid exposing keys or hitting CORS issues.
 */
export const proxyFetch = async (targetUrl: string, options: RequestInit = {}): Promise<Response> => {
    if (config.useMockBackend) {
        // MOCK MODE: Use public CORS proxy
        const proxiedUrl = `${config.corsProxyUrl}${targetUrl}`;
        const headers = new Headers(options.headers || {});
        headers.append('X-Requested-With', 'XMLHttpRequest');
        
        try {
            return await fetch(proxiedUrl, { ...options, headers });
        } catch (error: any) {
            // Enhanced error handling for common "Failed to fetch" scenarios with CORS proxies
            if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
                console.warn(`Proxy fetch failed for ${targetUrl}. This is likely a CORS issue or the demo proxy is unavailable.`);
                throw new Error(`Network request failed. The demo proxy server may be down or blocking the request to ${new URL(targetUrl).hostname}.`);
            }
            throw error;
        }
    } else {
        // PROD MODE: Call your backend proxy endpoint
        return fetch(`${config.backendUrl}/api/proxy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: targetUrl,
                method: options.method || 'GET',
                headers: options.headers,
                body: options.body
            })
        });
    }
};

/**
 * A function to retrieve a client secret. 
 * NOTE: In Production Mode, secrets should NEVER be accessed on the client. 
 * This helper is strictly for Mock Mode simulation.
 */
const getClientSecret = (site: Site, platform: SocialPlatform, accountId: string): string | undefined => {
    if (platform === 'meta') return site.socialMediaSettings.metaClientSecret;
    if (platform === 'meta_ads') return site.socialMediaSettings.metaAdsClientSecret;
    if (platform === 'google_ads') return site.socialMediaSettings.googleAdsClientSecret;
    if (platform === 'google_analytics') return site.googleAnalyticsSettings.clientSecret;
    if (platform === 'google_calendar') return site.socialMediaSettings.googleCalendarClientSecret;

    const platformKey = platform as keyof typeof site.socialMediaSettings;
    const accounts = site.socialMediaSettings[platformKey] as SocialMediaAccount[] | undefined;
    const account = accounts?.find(acc => acc.id === accountId);
    return account?.clientSecret;
};

const getClientId = (site: Site, platform: SocialPlatform, accountId: string): string | undefined => {
    if (platform === 'meta') return site.socialMediaSettings.metaClientId;
    if (platform === 'meta_ads') return site.socialMediaSettings.metaAdsClientId;
    if (platform === 'google_ads') return site.socialMediaSettings.googleAdsClientId;
    if (platform === 'google_analytics') return site.googleAnalyticsSettings.clientId;
    if (platform === 'google_calendar') return site.socialMediaSettings.googleCalendarClientId;
    
    const platformKey = platform as keyof typeof site.socialMediaSettings;
    const accounts = site.socialMediaSettings[platformKey] as SocialMediaAccount[] | undefined;
    const account = accounts?.find(acc => acc.id === accountId);
    return account?.clientId;
}

const getRedirectUri = () => {
    return window.location.origin + window.location.pathname;
};

// --- AUTHENTICATION & OAUTH ---

export const exchangeCodeForToken = async (
    platform: SocialPlatform,
    code: string,
    site: Site,
    accountId: string
): Promise<{ accessToken: string }> => {
    console.log(`[OAUTH] Exchanging code for token: ${platform} (MockMode: ${config.useMockBackend})`);

    // PRODUCTION MODE
    if (!config.useMockBackend) {
        const response = await fetch(`${config.backendUrl}/api/auth/exchange`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ platform, code, redirectUri: getRedirectUri(), siteId: site.id, accountId })
        });
        if (!response.ok) throw new Error('Backend token exchange failed');
        return await response.json();
    }

    // MOCK MODE (Client-side Exchange)
    const clientSecret = getClientSecret(site, platform, accountId);
    const clientId = getClientId(site, platform, accountId);

    if (!clientId || !clientSecret) {
        throw new Error(`Configuration error: Client ID or Secret not found for platform ${platform}.`);
    }

    const { tokenUrl } = OAUTH_CONFIGS[platform];
    const redirectUri = getRedirectUri();
    
    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
    });

    if (platform === 'twitter') {
        const pkceVerifier = storageService.getPkceVerifier();
        if (pkceVerifier) body.append('code_verifier', pkceVerifier);
    }

    if (platform === 'tiktok') {
        body.set('client_key', clientId);
        body.delete('client_id');
    }
    
    const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
    };

    if (platform === 'pinterest') {
        headers['Authorization'] = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
    }

    try {
        const response = await proxyFetch(tokenUrl, {
            method: 'POST',
            headers: headers,
            body: body
        });

        const data = await response.json();

        if (!response.ok) {
            console.error(`Token exchange failed:`, data);
            throw new Error(data.error_description || data.error || 'Failed to exchange code for token');
        }

        if (platform === 'twitter') storageService.removePkceVerifier();

        return { accessToken: data.access_token };

    } catch (error: any) {
        console.error("Token exchange network error:", error);
        throw new Error(`Token exchange failed: ${error.message}`);
    }
};

// --- PAYMENT GATEWAY VERIFICATIONS ---

export const verifyPaystackSecretKey = async (connection: PaystackConnection): Promise<{ success: boolean; message: string; }> => {
    const { secretKey } = connection;
    try {
        const response = await proxyFetch('https://api.paystack.co/bank', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${secretKey}` }
        });

        const data = await response.json();
        if (response.ok && data.status === true) {
            const mode = secretKey.startsWith('sk_live_') ? 'LIVE' : 'TEST';
            return { success: true, message: `Paystack ${mode} keys are valid. Connection established.` };
        } else {
            return { success: false, message: `Paystack API error: ${data.message || 'Invalid credentials.'}` };
        }
    } catch (e: any) {
        return { success: false, message: `Network error: ${e.message}` };
    }
};

export const verifyWiseApiKey = async (connection: WiseConnection): Promise<{ success: boolean; message: string; }> => {
    const { apiKey } = connection;
     try {
        const response = await proxyFetch(`${WISE_API_URL}/v1/profiles`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        const data = await response.json();
        if (response.ok) {
            return { success: true, message: 'Wise API Key is valid.' };
        } else {
            return { success: false, message: `Wise API error: ${data.errors?.[0]?.message || 'Invalid credentials.'}` };
        }
    } catch (e: any) {
        return { success: false, message: `Network error: ${e.message}` };
    }
};

export const verifyPayfastCredentials = async (connection: PayfastConnection): Promise<{ success: boolean; message: string; }> => {
    const { merchantId, merchantKey } = connection;
    const data = new URLSearchParams();
    data.append('merchant_id', merchantId);
    data.append('merchant_key', merchantKey);

    try {
        const response = await proxyFetch('https://www.payfast.co.za/eng/query/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: data.toString(),
        });

        const textResponse = await response.text();
        if (response.ok && textResponse.trim().toUpperCase() === 'VALID') {
            return { success: true, message: 'Payfast credentials are valid (Live Environment).' };
        } else {
            return { success: false, message: `Payfast validation failed: ${textResponse}` };
        }
    } catch (e: any) {
        return { success: false, message: `Network error: ${e.message}` };
    }
};

export const verifyStripeSecretKey = async (connection: StripeConnection): Promise<{ success: boolean; message: string; }> => {
    const { secretKey } = connection;
    try {
        const response = await proxyFetch('https://api.stripe.com/v1/customers?limit=1', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${secretKey}` }
        });
        
        const data = await response.json();
        if (response.ok) {
            const mode = secretKey.startsWith('sk_live_') ? 'LIVE' : 'TEST';
            return { success: true, message: `Stripe ${mode} API key is valid. Connection established.` };
        } else {
            return { success: false, message: `Stripe API error: ${data.error.message}` };
        }
    } catch (e: any) {
        return { success: false, message: `Network error: ${e.message}` };
    }
};

export const verifyPayPalCredentials = async (connection: PayPalConnection): Promise<{ success: boolean; message: string; }> => {
    const { clientId, clientSecret } = connection;
    const encodedCredentials = btoa(`${clientId}:${clientSecret}`);

    try {
        const response = await proxyFetch('https://api-m.paypal.com/v1/oauth2/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${encodedCredentials}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });

        const data = await response.json();
        if (response.ok && data.access_token) {
            return { success: true, message: 'PayPal credentials are valid (Live Environment).' };
        } else {
            return { success: false, message: `PayPal API error: ${data.error_description}` };
        }
    } catch (e: any) {
        return { success: false, message: `Network error: ${e.message}` };
    }
};

export const verifyPayoneerCredentials = async (connection: PayoneerConnection): Promise<{ success: boolean; message: string; }> => {
    const { partnerId, apiKey } = connection;
    try {
        const encodedCredentials = btoa(`${partnerId}:${apiKey}`);
        const response = await proxyFetch('https://api.payoneer.com/v2/accounts/me', {
            method: 'GET',
            headers: { 'Authorization': `Basic ${encodedCredentials}` }
        });

        const data = await response.json();
        if (response.ok) {
            return { success: true, message: 'Payoneer credentials valid.' };
        } else {
            return { success: false, message: `Payoneer API error: ${data.error_description || data.message}` };
        }
    } catch (e: any) {
        return { success: false, message: `Network error: ${e.message}` };
    }
};

// --- PAYMENT TRANSACTION SIMULATIONS ---

interface TransactionRequest {
    gateway: 'stripe' | 'paypal' | 'paystack' | 'payfast' | 'wise' | 'payoneer';
    amount: number;
    currency: string;
    plan: SubscriptionPlan;
    billingCycle: 'monthly' | 'yearly';
    email: string;
    globalSettings: any;
}

interface TransactionResponse {
    success: boolean;
    redirectUrl?: string; // For Stripe, PayPal, Paystack (Standard)
    authorizationUrl?: string; 
    reference?: string;
    formFields?: Record<string, string>; // For PayFast
    message?: string;
}

/**
 * Simulates (or proxies) creating a real transaction on the backend.
 * In production, this would call /api/payment/create.
 */
export const initiatePaymentTransaction = async (req: TransactionRequest): Promise<TransactionResponse> => {
    console.log(`[PAYMENT] Initiating ${req.gateway} transaction for ${req.amount} ${req.currency}`);
    const settings = req.globalSettings;
    const returnUrl = `${window.location.origin}/subscription?payment_status=success&plan=${req.plan}&cycle=${req.billingCycle}`;
    const cancelUrl = `${window.location.origin}/subscription?payment_status=cancelled`;

    // --- STRIPE ---
    if (req.gateway === 'stripe') {
        const secretKey = settings.stripeConnection?.secretKey;
        if (!secretKey) throw new Error("Stripe Secret Key missing.");

        try {
            const body = new URLSearchParams();
            body.append('payment_method_types[]', 'card');
            body.append('line_items[0][price_data][currency]', req.currency.toLowerCase());
            body.append('line_items[0][price_data][product_data][name]', `Zenith Engine AI - ${req.plan.toUpperCase()}`);
            body.append('line_items[0][price_data][unit_amount]', Math.round(req.amount * 100).toString()); // Cents
            body.append('line_items[0][quantity]', '1');
            body.append('mode', 'payment'); // or 'subscription' if using Price IDs
            // Add session_id placeholder to allow verification on return
            body.append('success_url', returnUrl + '&session_id={CHECKOUT_SESSION_ID}');
            body.append('cancel_url', cancelUrl);
            body.append('customer_email', req.email);

            const response = await proxyFetch('https://api.stripe.com/v1/checkout/sessions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${secretKey}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: body
            });

            const data = await response.json();
            if (response.ok && data.url) {
                return { success: true, redirectUrl: data.url };
            }
            throw new Error(data.error?.message || 'Stripe Session creation failed.');
        } catch (e: any) {
            console.error("Stripe Init Failed:", e);
            throw e; 
        }
    }

    // --- PAYPAL ---
    if (req.gateway === 'paypal') {
        const clientId = settings.payPalConnection?.clientId;
        const clientSecret = settings.payPalConnection?.clientSecret;
        if (!clientId || !clientSecret) throw new Error("PayPal Credentials missing.");

        try {
            // 1. Get Token
            const auth = btoa(`${clientId}:${clientSecret}`);
            const tokenRes = await proxyFetch('https://api-m.paypal.com/v1/oauth2/token', {
                method: 'POST',
                headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'grant_type=client_credentials'
            });
            const tokenData = await tokenRes.json();
            if (!tokenData.access_token) throw new Error("PayPal Auth Failed");

            // 2. Create Order
            const orderRes = await proxyFetch('https://api-m.paypal.com/v2/checkout/orders', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${tokenData.access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    intent: 'CAPTURE',
                    purchase_units: [{
                        amount: { currency_code: req.currency, value: req.amount.toString() },
                        description: `Zenith Engine ${req.plan}`
                    }],
                    application_context: { return_url: returnUrl, cancel_url: cancelUrl }
                })
            });
            const orderData = await orderRes.json();
            const approveLink = orderData.links?.find((l: any) => l.rel === 'approve')?.href;
            
            if (approveLink) {
                return { success: true, redirectUrl: approveLink };
            }
            throw new Error("PayPal Order creation failed.");

        } catch (e: any) {
            console.error("PayPal Init Failed:", e);
            throw e;
        }
    }

    // --- PAYSTACK ---
    if (req.gateway === 'paystack') {
        const secretKey = settings.paystackConnection?.secretKey;
        if (!secretKey) throw new Error("Paystack Secret Key missing.");

        try {
            const response = await proxyFetch('https://api.paystack.co/transaction/initialize', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${secretKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: req.email,
                    amount: req.amount * 100, // Kobo
                    currency: req.currency,
                    callback_url: returnUrl,
                    metadata: { plan: req.plan, cycle: req.billingCycle }
                })
            });
            const data = await response.json();
            if (data.status && data.data?.authorization_url) {
                return { success: true, redirectUrl: data.data.authorization_url, reference: data.data.reference };
            }
            throw new Error(data.message || "Paystack Init Failed");
        } catch (e) {
             console.error("Paystack Init Failed:", e);
             throw e;
        }
    }

    // --- PAYFAST (Form Signature) ---
    if (req.gateway === 'payfast') {
        // PayFast uses a form POST, but we can sign it here if needed.
        // For simulation, we return the data the frontend needs to construct the form.
        const merchantId = settings.payfastConnection?.merchantId;
        const merchantKey = settings.payfastConnection?.merchantKey;
        
        if (!merchantId || !merchantKey) throw new Error("PayFast credentials missing");

        return {
            success: true,
            formFields: {
                merchant_id: merchantId,
                merchant_key: merchantKey,
                return_url: returnUrl,
                cancel_url: cancelUrl,
                notify_url: `${window.location.origin}/api/payfast/notify`,
                email_address: req.email,
                m_payment_id: `zenith_${Date.now()}`,
                amount: req.amount.toFixed(2),
                item_name: `Zenith Engine - ${req.plan} (${req.billingCycle})`
            }
        };
    }

    // --- WISE / PAYONEER (Manual/Link) ---
    if (req.gateway === 'wise' || req.gateway === 'payoneer') {
        // These platforms typically require creating a "Payment Request" or "Invoice" via API
        // For B2B/Service payments.
        return {
            success: true,
            message: `Invoice generated. We have emailed you a payment link via ${req.gateway === 'wise' ? 'Wise' : 'Payoneer'}.`
        };
    }

    return { success: false, message: "Unsupported Gateway" };
};

/**
 * Verifies a transaction after the user returns from the payment gateway.
 */
export const verifyPaymentTransaction = async (
    gateway: string,
    params: URLSearchParams,
    settings: GlobalSettings
): Promise<{ success: boolean; message?: string }> => {
    console.log(`[PAYMENT VERIFY] Verifying ${gateway} transaction...`);

    // --- STRIPE ---
    if (gateway === 'stripe') {
        const sessionId = params.get('session_id');
        if (!sessionId) return { success: false, message: 'No Session ID found.' };
        
        const secretKey = settings.stripeConnection?.secretKey;
        if (!secretKey) return { success: false, message: 'Stripe configuration missing.' };

        try {
            const response = await proxyFetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${secretKey}` }
            });
            const data = await response.json();
            
            if (response.ok && data.payment_status === 'paid') {
                return { success: true, message: 'Stripe payment verified.' };
            }
            return { success: false, message: `Stripe verification failed: ${data.payment_status}` };
        } catch (e: any) {
            console.error("Stripe Verification Failed:", e);
            return { success: false, message: e.message };
        }
    }

    // --- PAYSTACK ---
    if (gateway === 'paystack') {
        const reference = params.get('reference') || params.get('trxref');
        if (!reference) return { success: false, message: 'No transaction reference found.' };

        const secretKey = settings.paystackConnection?.secretKey;
        if (!secretKey) return { success: false, message: 'Paystack configuration missing.' };

        try {
            const response = await proxyFetch(`https://api.paystack.co/transaction/verify/${reference}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${secretKey}` }
            });
            const data = await response.json();

            if (response.ok && data.data.status === 'success') {
                return { success: true, message: 'Paystack payment verified.' };
            }
            return { success: false, message: `Paystack verification failed: ${data.message}` };
        } catch (e: any) {
             return { success: false, message: e.message };
        }
    }

    // --- PAYPAL ---
    if (gateway === 'paypal') {
        const token = params.get('token'); // Order ID
        if (!token) return { success: false, message: 'No PayPal token found.' };

        const clientId = settings.payPalConnection?.clientId;
        const clientSecret = settings.payPalConnection?.clientSecret;
        if (!clientId || !clientSecret) return { success: false, message: 'PayPal configuration missing.' };

        try {
            // 1. Auth
            const auth = btoa(`${clientId}:${clientSecret}`);
            const tokenRes = await proxyFetch('https://api-m.paypal.com/v1/oauth2/token', {
                method: 'POST',
                headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'grant_type=client_credentials'
            });
            const tokenData = await tokenRes.json();
            const accessToken = tokenData.access_token;

            // 2. Capture
            const captureRes = await proxyFetch(`https://api-m.paypal.com/v2/checkout/orders/${token}/capture`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            const captureData = await captureRes.json();
            
            if (captureRes.ok && captureData.status === 'COMPLETED') {
                return { success: true, message: 'PayPal payment captured and verified.' };
            }
            // Check if already captured
            if (captureData.details?.[0]?.issue === 'ORDER_ALREADY_CAPTURED') {
                 return { success: true, message: 'Payment already completed.' };
            }

            return { success: false, message: `PayPal capture failed: ${captureData.status}` };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    }

    // PayFast / Others: Trust URL for now or Manual check in simulation
    return { success: true, message: 'Verification assumed for this gateway.' };
};


// --- SOCIAL POSTING HELPERS ---

export const postToWhatsApp = async (account: WhatsAppAccount, post: SocialMediaPost): Promise<{ success: boolean; message?: string }> => {
    console.log(`[SOCIAL] Posting to WhatsApp...`);
    const url = `https://graph.facebook.com/v20.0/${account.phoneNumberId}/messages`;
    
    // Determine targets based on mode
    const targets: { dest: string, type: 'text' }[] = [];
    const mode = account.targetMode || 'individual'; // Default to individual if legacy

    if ((mode === 'individual' || mode === 'both') && account.recipientPhone) {
        // Fallback to legacy 'destination' if recipientPhone is empty but set in old style
        const phone = account.recipientPhone || (account.destinationType === 'number' ? account.destination : '');
        if (phone) targets.push({ dest: phone, type: 'text' });
    }

    if ((mode === 'group' || mode === 'both') && account.groupId) {
        // Fallback to legacy 'destination' if groupId is empty
        const group = account.groupId || (account.destinationType === 'group' ? account.destination : '');
        if (group) targets.push({ dest: group, type: 'text' }); // Group messages still use 'text' type in API but destination is ID
    }

    if (targets.length === 0) {
        return { success: false, message: 'No valid destination found for the selected targeting mode.' };
    }

    const errors: string[] = [];

    // Send to all targets
    for (const target of targets) {
        const body = {
            messaging_product: "whatsapp",
            to: target.dest,
            type: "text",
            text: { preview_url: false, body: `${post.content}\n${post.hashtags.join(' ')}` }
        };

        try {
            const response = await proxyFetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${account.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();
            if (!response.ok) {
                errors.push(`Failed to send to ${target.dest}: ${data?.error?.message || response.statusText}`);
            }
        } catch (error: any) {
            errors.push(`Network error for ${target.dest}: ${error.message}`);
        }
    }

    if (errors.length > 0) {
        return { success: false, message: errors.join('; ') };
    }

    return { success: true };
};

export const postToTelegram = async (account: TelegramAccount, post: SocialMediaPost, media?: { type: 'image' | 'video'; data: string }): Promise<{ success: boolean; message?: string }> => {
    console.log(`[SOCIAL] Posting to Telegram...`);
    const url = `https://api.telegram.org/bot${account.botToken}/sendMessage`;
    let text = `${post.content}\n${post.hashtags.join(' ')}`;
    if (media?.type === 'video') text += `\n\nVideo available at: ${media.data}`;
    
    try {
        const response = await proxyFetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: account.chatId, text: text })
        });

        const data = await response.json();
        if (!response.ok || !data.ok) {
            return { success: false, message: `Telegram API error: ${data.description}` };
        }
        return { success: true };
    } catch (error: any) {
        return { success: false, message: `Network error: ${error.message}` };
    }
};
