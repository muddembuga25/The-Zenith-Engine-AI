
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Declare Deno to avoid TypeScript errors if types are not available
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { code, platform, siteId, accountId, redirectUri, codeVerifier } = await req.json()

    if (!siteId) throw new Error('Site ID is required');

    // 1. Fetch Site Settings to get Client ID/Secret
    // Use the service role key if row level security prevents access, 
    // but here we rely on the user's auth context passed in headers.
    const { data: siteData, error: siteError } = await supabase
      .from('sites')
      .select('data')
      .eq('id', siteId)
      .single()

    if (siteError || !siteData) {
      throw new Error('Site not found or access denied')
    }

    const settings = siteData.data.socialMediaSettings
    let clientId = ''
    let clientSecret = ''

    // Helper to find specific account config
    const findAccount = (plat: string) => {
        if (Array.isArray(settings[plat])) {
            return settings[plat].find((a: any) => a.id === accountId);
        }
        return undefined;
    }

    if (platform === 'meta' || platform === 'facebook' || platform === 'instagram') {
        clientId = settings.metaClientId
        clientSecret = settings.metaClientSecret
    } else if (platform === 'meta_ads') {
        clientId = settings.metaAdsClientId
        clientSecret = settings.metaAdsClientSecret
    } else if (platform === 'google_ads') {
        clientId = settings.googleAdsClientId
        clientSecret = settings.googleAdsClientSecret
    } else if (platform === 'google_analytics') {
        // Analytics settings might be in a different structure
        clientId = siteData.data.googleAnalyticsSettings?.clientId
        clientSecret = siteData.data.googleAnalyticsSettings?.clientSecret
    } else if (platform === 'google_calendar') {
        clientId = settings.googleCalendarClientId
        clientSecret = settings.googleCalendarClientSecret
    } else {
        // Individual account settings (Twitter, LinkedIn, etc.)
        const acc = findAccount(platform)
        if (acc) {
            clientId = acc.clientId
            clientSecret = acc.clientSecret
        }
    }

    if (!clientId || !clientSecret) {
        throw new Error(`Credentials (Client ID/Secret) not configured for ${platform}`)
    }

    // 2. Configure Token Request
    let tokenUrl = ''
    let body = new URLSearchParams()
    body.append('client_id', clientId)
    body.append('client_secret', clientSecret)
    body.append('code', code)
    body.append('redirect_uri', redirectUri)
    body.append('grant_type', 'authorization_code')

    // Platform specific overrides
    switch (platform) {
        case 'meta':
        case 'meta_ads':
        case 'facebook':
        case 'instagram':
            tokenUrl = 'https://graph.facebook.com/v20.0/oauth/access_token'
            break
        case 'google_ads':
        case 'google_analytics':
        case 'google_calendar':
        case 'youtube':
            tokenUrl = 'https://oauth2.googleapis.com/token'
            break
        case 'twitter':
            tokenUrl = 'https://api.twitter.com/2/oauth2/token'
            if (codeVerifier) body.append('code_verifier', codeVerifier)
            break
        case 'linkedin':
            tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken'
            break
        case 'tiktok':
            tokenUrl = 'https://open.tiktokapis.com/v2/oauth/token/'
            body.set('client_key', clientId)
            body.delete('client_id')
            body.delete('client_secret')
            body.append('client_secret', clientSecret)
            break
        case 'pinterest':
            tokenUrl = 'https://api.pinterest.com/v5/oauth/token'
            break
        case 'snapchat':
            tokenUrl = 'https://accounts.snapchat.com/login/oauth2/access_token'
            break
        default:
            throw new Error(`Platform ${platform} not supported in backend`)
    }

    // Handle Headers (Some require Basic Auth)
    const headers: any = { 'Content-Type': 'application/x-www-form-urlencoded' }
    
    if (platform === 'pinterest') {
        const auth = btoa(`${clientId}:${clientSecret}`)
        headers['Authorization'] = `Basic ${auth}`
        body.delete('client_secret')
        body.delete('client_id') 
    }

    // 3. Execute Fetch
    console.log(`Exchanging token for ${platform}...`)
    const tokenRes = await fetch(tokenUrl, {
        method: 'POST',
        headers,
        body
    })

    const tokenData = await tokenRes.json()

    if (!tokenRes.ok) {
        console.error('Provider Error:', tokenData)
        throw new Error(tokenData.error_description || tokenData.error?.message || JSON.stringify(tokenData))
    }

    // Return the token data securely
    return new Response(
      JSON.stringify(tokenData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})