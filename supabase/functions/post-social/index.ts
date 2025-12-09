
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
    const { platform, account, content, media } = await req.json()

    if (platform === 'whatsapp') {
        const url = `https://graph.facebook.com/v20.0/${account.phoneNumberId}/messages`;
        const body = {
            messaging_product: "whatsapp",
            to: account.destination,
            type: "text",
            text: {
                preview_url: false,
                body: `${content.content}\n${(content.hashtags || []).join(' ')}`
            }
        };
        
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${account.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || 'WhatsApp API Error');
        
        return new Response(JSON.stringify({ success: true, data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (platform === 'telegram') {
        const url = `https://api.telegram.org/bot${account.botToken}/sendMessage`;
        let text = `${content.content}\n${(content.hashtags || []).join(' ')}`;
        if (media?.type === 'video') text += `\n\nVideo: ${media.data}`; // Basic text append for now

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: account.chatId,
                text: text
            })
        });

        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.description || 'Telegram API Error');

        return new Response(JSON.stringify({ success: true, data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    throw new Error(`Platform ${platform} not supported for server-side posting yet.`);

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
