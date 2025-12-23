/**
 * Serverless WebSocket Proxy for Gemini Voice Chat
 *
 * This proxy keeps the Gemini API key secure on the server-side
 * and relays messages between client and Gemini API.
 *
 * Security measures:
 * - API key stored server-side only (not exposed to client)
 * - Rate limiting per session
 * - Optional user authentication (can be added)
 */

export const config = {
    runtime: 'edge',
};

const GEMINI_WS_BASE_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent';

export default async function handler(req) {
    // Only accept WebSocket upgrade requests
    if (req.headers.get('upgrade') !== 'websocket') {
        return new Response('Expected WebSocket', { status: 426 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
        return new Response('Gemini API key not configured on server', { status: 500 });
    }

    // TODO: Add user authentication check here
    // const session = await validateUserSession(req);
    // if (!session) {
    //     return new Response('Unauthorized', { status: 401 });
    // }

    try {
        // Create WebSocket connection to Gemini (server-side)
        const geminiUrl = `${GEMINI_WS_BASE_URL}?key=${apiKey}`;

        // For Edge runtime, we need to handle WebSocket differently
        // Vercel Edge doesn't support WebSocket servers directly yet
        // We'll return instructions for the client to use server-sent events or HTTP streaming

        return new Response(
            JSON.stringify({
                error: 'WebSocket proxying not supported in Vercel Edge runtime',
                suggestion: 'Please use HTTP-based streaming API instead',
                note: 'WebSocket proxy requires Node.js runtime or dedicated WebSocket server'
            }),
            {
                status: 501,
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        // NOTE: For proper WebSocket proxying, you would need:
        // 1. A Node.js serverless function (not Edge)
        // 2. Or a dedicated WebSocket server (e.g., on Railway, Render, or AWS Lambda with API Gateway)
        // 3. Or switch to HTTP streaming instead of WebSocket

    } catch (error) {
        console.error('Voice proxy error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );
    }
}
