
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenAI } from "https://esm.sh/@google/genai@0.1.1";

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
    const { type, model, prompt, config, userApiKey, systemInstruction, tools } = await req.json()

    // Priority: User's custom key -> Backend Env Key
    const apiKey = userApiKey || Deno.env.get('API_KEY');

    if (!apiKey) {
      throw new Error("API Key not found. Please configure a global key or provide a user key.");
    }

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
      
      // Serialize the response to return to client
      result = { 
        text: response.text,
        candidates: response.candidates,
        usageMetadata: response.usageMetadata
      };

    } else if (type === 'image') {
      const response = await ai.models.generateImages({
        model: model || 'imagen-4.0-generate-001',
        prompt: prompt,
        config: config || { numberOfImages: 1, aspectRatio: '1:1' }
      });
      
      // Return the base64 image data
      const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
      if (!imageBytes) throw new Error("No image generated.");
      
      result = { base64Image: imageBytes };

    } else if (type === 'video') {
      // For video, we might need to handle polling in the function or return the operation
      // For this implementation, we'll return the operation and let the client poll or handle short videos
      // Note: Long running edge functions can timeout. For Veo, we typically start the op.
      
      // However, to keep the client simple for now, we will assume this function initiates the request.
      // NOTE: Veo generation can take time. In a real prod environment, this should be async/webhook based.
      // Here we will try to wait for a reasonable amount of time or return the poller logic if supported by SDK via REST.
      
      // Current SDK implementation for Veo via `generateVideos` waits for the operation? 
      // The client-side code was polling `ai.operations.getVideosOperation`.
      // We cannot easily serialize the Operation object back to the client to poll there using a DIFFERENT instance.
      // Strategy: We will perform the polling HERE on the server (up to a limit) or returns a failure if it takes too long.
      // Edge Functions have a wall clock limit (usually 50s-400s depending on plan). Veo Fast is fast enough.
      
      let operation = await ai.models.generateVideos({
        model: model || 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config: config || { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
      });

      // Poll loop inside Edge Function
      const startTime = Date.now();
      while (!operation.done) {
        if (Date.now() - startTime > 120000) { // 2 minute timeout
            throw new Error("Video generation timed out on server.");
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!videoUri) throw new Error("Video generation completed but no URI returned.");

      result = { videoUri };
    } else {
        throw new Error(`Unknown generation type: ${type}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error("AI Generation Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})