
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { provider, connection } = await req.json()

    if (!provider || !connection) {
        throw new Error("Missing provider or connection details");
    }

    let result = { success: false, message: 'Unknown error' };

    if (provider === 'paystack') {
        const res = await fetch('https://api.paystack.co/bank', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${connection.secretKey}` }
        });
        const data = await res.json();
        if (res.ok && data.status) {
            result = { success: true, message: 'Paystack keys are valid.' };
        } else {
            throw new Error(data.message || 'Invalid Paystack credentials');
        }
    } 
    else if (provider === 'wise') {
        const res = await fetch('https://api.wise.com/v1/profiles', {
            headers: { 'Authorization': `Bearer ${connection.apiKey}` }
        });
        if (res.ok) {
            result = { success: true, message: 'Wise connection verified.' };
        } else {
            throw new Error('Invalid Wise API Key');
        }
    }
    else if (provider === 'payfast') {
        // Payfast validation usually requires a ping or checking a specific transaction, 
        // here we validate the merchant ping endpoint if available, or just check format.
        // Using the 'validate' endpoint for query.
        const body = new URLSearchParams();
        body.append('merchant_id', connection.merchantId);
        body.append('merchant_key', connection.merchantKey);
        
        const res = await fetch('https://www.payfast.co.za/eng/query/validate', {
            method: 'POST',
            body: body
        });
        const text = await res.text();
        if (text.trim() === 'VALID') {
            result = { success: true, message: 'Payfast credentials verified.' };
        } else {
            // Even if invalid query, getting a response from Payfast means we reached them.
            // But strict validation requires 'VALID'.
            throw new Error(`Payfast validation response: ${text}`);
        }
    }
    else if (provider === 'stripe') {
        const res = await fetch('https://api.stripe.com/v1/customers?limit=1', {
            headers: { 'Authorization': `Bearer ${connection.secretKey}` }
        });
        if (res.ok) {
            result = { success: true, message: 'Stripe connection verified.' };
        } else {
            const data = await res.json();
            throw new Error(data.error?.message || 'Invalid Stripe keys');
        }
    }
    else if (provider === 'paypal') {
        const auth = btoa(`${connection.clientId}:${connection.clientSecret}`);
        const res = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });
        const data = await res.json();
        if (res.ok && data.access_token) {
            result = { success: true, message: 'PayPal connection verified.' };
        } else {
            throw new Error(data.error_description || 'Invalid PayPal credentials');
        }
    }
    else if (provider === 'payoneer') {
        const auth = btoa(`${connection.partnerId}:${connection.apiKey}`);
        const res = await fetch('https://api.payoneer.com/v2/accounts/me', {
             headers: { 'Authorization': `Basic ${auth}` }
        });
        if (res.ok) {
             result = { success: true, message: 'Payoneer credentials verified.' };
        } else {
             throw new Error('Payoneer verification failed. Ensure Partner ID and API Key are correct.');
        }
    }
    else if (provider === 'supabase') {
        // Simple health check by trying to list a system table or just checking if endpoint exists
        // Note: We use the provided url/anonKey to create a client or simple fetch
        const res = await fetch(`${connection.url}/rest/v1/`, {
            headers: { 'apikey': connection.anonKey }
        });
        // 200 OK means it listed tables (if exposed) or 404 means endpoint valid but no table specified.
        // 401 Unauthorized means key is wrong. 
        if (res.ok || res.status === 200 || res.status === 404) { 
             result = { success: true, message: 'Supabase connection verified.' };
        } else {
             throw new Error(`Supabase Error: ${res.statusText}`);
        }
    }
    else {
        throw new Error(`Provider ${provider} not supported`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
