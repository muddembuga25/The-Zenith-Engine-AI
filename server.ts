
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
import { runScheduler } from './services/automationService';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Increase limit for image uploads/generations
app.use(express.json({ limit: '50mb' }));
app.use(cors());

// --- Middleware & Clients ---
const getSupabase = (authHeader?: string) => {
  return createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_ANON_KEY || '',
    authHeader ? { global: { headers: { Authorization: authHeader } } } : undefined
  );
};

// --- API ROUTES ---

// 0. Health Check (Critical for Coolify/Docker deployments)
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// 1. OAuth Token Exchange
app.post('/api/oauth-token', async (req, res) => {
  try {
    const { code, platform, siteId, accountId, redirectUri, codeVerifier } = req.body;
    const authHeader = req.headers.authorization;
    const supabase = getSupabase(authHeader);

    // Fetch Site Settings
    const { data: siteData, error: siteError } = await supabase
      .from('sites')
      .select('data')
      .eq('id', siteId)
      .single();

    if (siteError || !siteData) throw new Error('Site not found');

    const settings = siteData.data.socialMediaSettings;
    let clientId = '', clientSecret = '';

    const findAccount = (plat: string) => {
        if (Array.isArray(settings[plat])) {
            return settings[plat].find((a: any) => a.id === accountId);
        }
        return undefined;
    };

    if (['meta', 'facebook', 'instagram'].includes(platform)) {
        clientId = settings.metaClientId;
        clientSecret = settings.metaClientSecret;
    } else if (platform === 'meta_ads') {
        clientId = settings.metaAdsClientId;
        clientSecret = settings.metaAdsClientSecret;
    } else if (platform === 'google_ads') {
        clientId = settings.googleAdsClientId;
        clientSecret = settings.googleAdsClientSecret;
    } else if (platform === 'google_analytics') {
        clientId = siteData.data.googleAnalyticsSettings?.clientId;
        clientSecret = siteData.data.googleAnalyticsSettings?.clientSecret;
    } else if (platform === 'google_calendar') {
        clientId = settings.googleCalendarClientId;
        clientSecret = settings.googleCalendarClientSecret;
    } else {
        const acc = findAccount(platform);
        if (acc) {
            clientId = acc.clientId;
            clientSecret = acc.clientSecret;
        }
    }

    if (!clientId || !clientSecret) throw new Error(`Credentials not configured for ${platform}`);

    let tokenUrl = '';
    const body = new URLSearchParams();
    body.append('client_id', clientId);
    body.append('client_secret', clientSecret);
    body.append('code', code);
    body.append('redirect_uri', redirectUri);
    body.append('grant_type', 'authorization_code');

    switch (platform) {
        case 'meta': case 'meta_ads': case 'facebook': case 'instagram':
            tokenUrl = 'https://graph.facebook.com/v20.0/oauth/access_token';
            break;
        case 'google_ads': case 'google_analytics': case 'google_calendar': case 'youtube':
            tokenUrl = 'https://oauth2.googleapis.com/token';
            break;
        case 'twitter':
            tokenUrl = 'https://api.twitter.com/2/oauth2/token';
            if (codeVerifier) body.append('code_verifier', codeVerifier);
            break;
        case 'linkedin':
            tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
            break;
        case 'tiktok':
            tokenUrl = 'https://open.tiktokapis.com/v2/oauth/token/';
            body.set('client_key', clientId);
            body.delete('client_id');
            body.delete('client_secret');
            body.append('client_secret', clientSecret);
            break;
        case 'pinterest':
            tokenUrl = 'https://api.pinterest.com/v5/oauth/token';
            break;
        case 'snapchat':
            tokenUrl = 'https://accounts.snapchat.com/login/oauth2/access_token';
            break;
        default:
            throw new Error(`Platform ${platform} not supported`);
    }

    const headers: any = { 'Content-Type': 'application/x-www-form-urlencoded' };
    if (platform === 'pinterest') {
        const auth = btoa(`${clientId}:${clientSecret}`);
        headers['Authorization'] = `Basic ${auth}`;
        body.delete('client_secret');
        body.delete('client_id');
    }

    const tokenRes = await fetch(tokenUrl, { method: 'POST', headers, body });
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) throw new Error(JSON.stringify(tokenData));
    res.json(tokenData);

  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 2. Verify Integration
app.post('/api/verify-integration', async (req, res) => {
  try {
    const { provider, connection } = req.body;
    let result = { success: false, message: 'Unknown error' };

    if (provider === 'paystack') {
        const r = await fetch('https://api.paystack.co/bank', { headers: { 'Authorization': `Bearer ${connection.secretKey}` } });
        const d = await r.json();
        if (r.ok && d.status) result = { success: true, message: 'Paystack keys are valid.' };
        else throw new Error(d.message);
    } else if (provider === 'wise') {
        const r = await fetch('https://api.wise.com/v1/profiles', { headers: { 'Authorization': `Bearer ${connection.apiKey}` } });
        if (r.ok) result = { success: true, message: 'Wise connection verified.' };
        else throw new Error('Invalid Wise API Key');
    } else if (provider === 'payfast') {
        const body = new URLSearchParams({ merchant_id: connection.merchantId, merchant_key: connection.merchantKey });
        const r = await fetch('https://www.payfast.co.za/eng/query/validate', { method: 'POST', body });
        const t = await r.text();
        if (t.trim() === 'VALID') result = { success: true, message: 'Payfast credentials verified.' };
        else throw new Error('Invalid Payfast credentials');
    } else if (provider === 'stripe') {
        const r = await fetch('https://api.stripe.com/v1/customers?limit=1', { headers: { 'Authorization': `Bearer ${connection.secretKey}` } });
        if (r.ok) result = { success: true, message: 'Stripe connection verified.' };
        else throw new Error('Invalid Stripe keys');
    } else if (provider === 'paypal') {
        const auth = btoa(`${connection.clientId}:${connection.clientSecret}`);
        const r = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
            method: 'POST',
            headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'grant_type=client_credentials'
        });
        const d = await r.json();
        if (r.ok && d.access_token) result = { success: true, message: 'PayPal connection verified.' };
        else throw new Error('Invalid PayPal credentials');
    } else if (provider === 'payoneer') {
        const auth = btoa(`${connection.partnerId}:${connection.apiKey}`);
        const r = await fetch('https://api.payoneer.com/v2/accounts/me', { headers: { 'Authorization': `Basic ${auth}` } });
        if (r.ok) result = { success: true, message: 'Payoneer credentials verified.' };
        else throw new Error('Invalid Payoneer credentials');
    } else if (provider === 'supabase') {
        const r = await fetch(`${connection.url}/rest/v1/`, { headers: { 'apikey': connection.anonKey } });
        if (r.ok || r.status === 200 || r.status === 404) result = { success: true, message: 'Supabase connection verified.' };
        else throw new Error(`Supabase Error: ${r.statusText}`);
    } else {
        throw new Error(`Provider ${provider} not supported`);
    }
    res.json(result);
  } catch (error: any) {
    res.json({ success: false, message: error.message });
  }
});

// 3. Post Social
app.post('/api/post-social', async (req, res) => {
  try {
    const { platform, account, content, media } = req.body;

    if (platform === 'whatsapp') {
        const url = `https://graph.facebook.com/v20.0/${account.phoneNumberId}/messages`;
        const body = {
            messaging_product: "whatsapp",
            to: account.destination,
            type: "text",
            text: { preview_url: false, body: `${content.content}\n${(content.hashtags || []).join(' ')}` }
        };
        const r = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${account.accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error?.message);
        res.json({ success: true, data: d });
    } else if (platform === 'telegram') {
        const url = `https://api.telegram.org/bot${account.botToken}/sendMessage`;
        let text = `${content.content}\n${(content.hashtags || []).join(' ')}`;
        if (media?.type === 'video') text += `\n\nVideo: ${media.data}`;
        const r = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: account.chatId, text })
        });
        const d = await r.json();
        if (!r.ok || !d.ok) throw new Error(d.description);
        res.json({ success: true, data: d });
    } else {
        throw new Error(`Platform ${platform} not supported for server-side posting`);
    }
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 4. Generate Content (GenAI)
app.post('/api/generate-content', async (req, res) => {
  try {
    const { type, model, prompt, config, userApiKey, systemInstruction, tools } = req.body;
    const apiKey = userApiKey || process.env.API_KEY;
    if (!apiKey) throw new Error("API Key not found");

    const ai = new GoogleGenAI({ apiKey });
    let result;

    if (type === 'text') {
        const generateConfig: any = { ...config };
        if (systemInstruction) generateConfig.systemInstruction = systemInstruction;
        if (tools) generateConfig.tools = tools;
        const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-flash',
            contents: prompt,
            config: generateConfig,
        });
        result = { text: response.text, candidates: response.candidates };
    } else if (type === 'image') {
        const response = await ai.models.generateImages({
            model: model || 'imagen-4.0-generate-001',
            prompt: prompt,
            config: config || { numberOfImages: 1, aspectRatio: '1:1' }
        });
        const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
        if (!imageBytes) throw new Error("No image generated.");
        result = { base64Image: imageBytes };
    } else if (type === 'video') {
        let operation = await ai.models.generateVideos({
            model: model || 'veo-3.1-fast-generate-preview',
            prompt: prompt,
            config: config || { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
        });
        const startTime = Date.now();
        while (!operation.done) {
            if (Date.now() - startTime > 300000) throw new Error("Video generation timed out.");
            await new Promise(resolve => setTimeout(resolve, 5000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }
        const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!videoUri) throw new Error("No URI returned.");
        result = { videoUri };
    } else {
        throw new Error(`Unknown type: ${type}`);
    }
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("GenAI Error:", error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// 5. Proxy Request
app.all('/api/proxy-request', async (req, res) => {
  try {
    const url = req.method === 'GET' ? req.query.url as string : req.body.url;
    const method = req.method === 'GET' ? 'GET' : req.body.method || 'GET';
    const headers = req.body.headers || {};
    const body = req.body.body;

    if (!url) throw new Error('URL is required');

    const safeHeaders = new Headers();
    Object.entries(headers).forEach(([key, value]) => {
        if (!['host', 'connection', 'content-length'].includes(key.toLowerCase())) {
            safeHeaders.set(key, value as string);
        }
    });

    const response = await fetch(url, {
        method,
        headers: safeHeaders,
        body: body ? JSON.stringify(body) : undefined,
    });

    const responseText = await response.text();
    let responseData;
    try { responseData = JSON.parse(responseText); } catch { responseData = responseText; }

    res.json({ success: response.ok, status: response.status, data: responseData });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// --- Serve Frontend ---
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// --- Start Server & Scheduler ---
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Starting Automation Scheduler...');
  setInterval(async () => {
      try { await runScheduler(); } catch(e) { console.error("Scheduler Error:", e); }
  }, 60000); // Run every minute
});
