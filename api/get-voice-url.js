/**
 * Secure WebSocket URL Generator for Gemini Voice Chat
 *
 * TEMPORARY SOLUTION: Returns a pre-signed WebSocket URL with API key
 * This keeps the key server-side but the URL is still exposed once generated.
 *
 * SECURITY NOTES:
 * - URL includes the API key (still a risk if intercepted)
 * - Rate limit this endpoint to prevent abuse
 * - Add short expiration via session tokens
 * - LONG-TERM: Deploy a proper WebSocket proxy server
 *
 * For production, consider:
 * - Separate WebSocket server on Railway/Render/Fly.io
 * - Or use a platform that supports WebSocket proxying (Cloudflare Workers)
 */

export const config = {
    runtime: 'edge',
};

// Simple in-memory rate limiting (resets on cold start)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute per IP

function checkRateLimit(identifier) {
    const now = Date.now();
    const record = rateLimitMap.get(identifier);

    if (!record) {
        rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return true;
    }

    if (now > record.resetAt) {
        rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return true;
    }

    if (record.count >= MAX_REQUESTS_PER_WINDOW) {
        return false;
    }

    record.count++;
    return true;
}

export default async function handler(req) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    // Rate limiting by IP
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    if (!checkRateLimit(ip)) {
        return new Response(
            JSON.stringify({
                error: 'Rate limit exceeded',
                message: 'Too many requests. Please wait before starting a new voice session.'
            }),
            {
                status: 429,
                headers: {
                    'Retry-After': '60',
                }
            }
        );
    }

    // SECURITY: Only use server-side env var - NEVER use VITE_ prefix for API keys
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return new Response(
            JSON.stringify({ error: 'Gemini API key not configured on server' }),
            { status: 500 }
        );
    }

    // TODO: Validate user session here
    // const { userId } = await validateSession(req);
    // if (!userId) {
    //     return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    // }

    try {
        // Generate the WebSocket URL with the API key
        const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;

        return new Response(
            JSON.stringify({
                url: wsUrl,
                warning: 'TEMPORARY: This URL contains the API key. Long-term solution requires WebSocket proxy server.',
            }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                },
            }
        );
    } catch (error) {
        console.error('Error generating voice URL:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500 }
        );
    }
}
