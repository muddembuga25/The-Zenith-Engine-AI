
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
    const { url, method = 'GET', headers = {}, body } = await req.json()

    if (!url) {
      throw new Error('URL is required')
    }

    // Filter out forbidden headers
    const safeHeaders = new Headers()
    Object.entries(headers).forEach(([key, value]) => {
      if (!['host', 'connection', 'content-length'].includes(key.toLowerCase())) {
        safeHeaders.set(key, value as string)
      }
    })

    // Perform the fetch
    const response = await fetch(url, {
      method,
      headers: safeHeaders,
      body: body ? JSON.stringify(body) : undefined,
    })

    // Get response body
    const responseText = await response.text()
    
    // Attempt to parse JSON if possible, otherwise return text
    let responseData
    try {
        responseData = JSON.parse(responseText)
    } catch {
        responseData = responseText
    }

    return new Response(
      JSON.stringify({ 
        success: response.ok, 
        status: response.status, 
        data: responseData 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
