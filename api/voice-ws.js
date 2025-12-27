/**
 * WebSocket Proxy for Gemini Voice Chat (Node.js Runtime)
 *
 * Security: Keeps Gemini API key server-side only
 *
 * NOTE: Vercel's serverless functions don't support persistent WebSocket connections.
 * This is a conceptual implementation. For production, you need:
 *
 * Option 1: Use Gemini's HTTP streaming API instead of WebSocket
 * Option 2: Deploy a separate WebSocket server on Railway/Render/Fly.io
 * Option 3: Use a WebSocket-compatible platform like Cloudflare Workers with Durable Objects
 */

import { WebSocket } from 'ws';

export const config = {
    api: {
        bodyParser: false,
        externalResolver: true,
    },
};

const GEMINI_WS_URL_BASE = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent';

export default async function handler(req, res) {
    // SECURITY: Only use server-side env var - NEVER use VITE_ prefix for API keys
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        res.status(500).json({ error: 'Gemini API key not configured on server' });
        return;
    }

    // Vercel doesn't support WebSocket server endpoints
    // Return error with migration instructions
    res.status(501).json({
        error: 'WebSocket proxy not available',
        reason: 'Vercel serverless functions do not support persistent WebSocket connections',
        solution: {
            option1: 'Migrate to HTTP-based streaming (Gemini supports this)',
            option2: 'Deploy WebSocket server separately on Railway/Render/Fly.io',
            option3: 'Use Cloudflare Workers with Durable Objects',
        },
        documentation: 'https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/gemini',
    });
}
