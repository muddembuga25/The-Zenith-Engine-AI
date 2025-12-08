

/**
 * Simulates a Media Content Protection (MCP) server for registering
 * and managing digital assets. In a real application, this would be a secure
 * backend service handling DRM, watermarking, or secure access.
 */
import type { McpServer, Site } from '../types';
import { GenerateContentResponse } from '@google/genai';
import { _callGeminiText, _callImagen, _callVeo } from './aiService';

/**
 * Simulates the registration of a new piece of media content with the MCP server.
 * @param mediaType The type of media being registered ('image' or 'video').
 * @param topic A descriptive topic or prompt for the content.
 * @param server Optional MCP server to use for registration.
 * @returns A promise that resolves with an object containing the unique MCP content ID.
 */
export const registerContent = async (
    mediaType: 'image' | 'video',
    topic: string,
    server?: McpServer
): Promise<{ mcpId: string }> => {
    if (server) {
        console.log(`[MCP Service] Registering content with specified MCP server: ${server.label} (${server.url})`);
    } else {
        console.log(`[MCP Service] Received registration request for new ${mediaType} content.`);
    }
    console.log(`[MCP Service]   - Topic: "${topic.substring(0, 100)}..."`);

    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network latency

    console.log('[MCP Service]   - Generating content signature...');
    const signature = `sig-${crypto.randomUUID()}`;
    console.log(`[MCP Service]   - Signature: ${signature}`);

    await new Promise(resolve => setTimeout(resolve, 200)); // Simulate processing

    const mcpId = `mcp-content-${crypto.randomUUID()}`;
    console.log(`[MCP Service] Registration successful. Assigned Content ID: ${mcpId}`);

    return { mcpId };
};

export const verifyMcpConnection = async (
    server: { url: string; accessToken: string; }
): Promise<{ success: boolean; message: string; }> => {
    if (!server.url.trim() || !server.accessToken.trim()) {
        return { success: false, message: 'URL and Access Token are required.' };
    }

    try {
        console.log(`[MCP Service Sim] Verifying connection to ${server.url}`);
        await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate network delay

        if (!server.url.startsWith('https://')) {
            return { success: false, message: 'URL must be secure (https).' };
        }

        // Simulate a random failure
        if (Math.random() < 0.2) {
            return { success: false, message: 'Connection failed: Invalid access token or server unreachable.' };
        }

        return { success: true, message: 'Successfully connected to MCP server.' };

    } catch (e: any) {
        return { success: false, message: `Connection failed: ${e.message}` };
    }
};

export const invokeMcpText = async (args: { prompt: string; server: McpServer; systemInstruction?: string; site: Site; jsonSchema?: any; }): Promise<{ response: GenerateContentResponse; cost: number; }> => {
    const { prompt, server, systemInstruction, site, jsonSchema } = args;
    console.log(`[MCP Service] ROUTING text generation to: ${server.label} (${server.url})`);
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate extra MCP latency

    // In a real scenario, you'd fetch from server.url here.
    // For this simulation, we call the underlying default AI provider.
    return _callGeminiText({ prompt, systemInstruction, site, jsonSchema, tools: undefined });
};

export const invokeMcpImage = async (args: { prompt: string; server: McpServer; aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9'; site: Site; }): Promise<{ base64Image: string; cost: number; }> => {
    const { prompt, server, aspectRatio, site } = args;
    console.log(`[MCP Service] ROUTING image generation to: ${server.label} (${server.url})`);
    await new Promise(resolve => setTimeout(resolve, 300));

    return _callImagen({ prompt, aspectRatio, site });
};

export const invokeMcpVideo = async (args: { prompt: string; server: McpServer; site: Site; image?: any; progressCb: (msg: string) => void; }): Promise<{ downloadLink: string; cost: number; }> => {
    const { prompt, server, site, image, progressCb } = args;
    const logMessage = `[MCP Service] ROUTING video generation to: ${server.label} (${server.url})`;
    console.log(logMessage);
    progressCb(`Routing to MCP: ${server.label}`);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return _callVeo({ prompt, site, image, progressCb, model: site.modelConfig.videoModel });
}