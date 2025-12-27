/**
 * Secure WebSocket URL Generator for Gemini Voice Chat
 *
 * SECURITY ARCHITECTURE:
 * This endpoint returns a WebSocket URL with the API key embedded.
 * The key is exposed to the client - this is a known limitation.
 *
 * MITIGATIONS IN PLACE:
 * 1. Rate limiting (10 requests/minute per IP)
 * 2. Origin validation (only allow requests from our domain)
 * 3. No caching headers to prevent URL persistence
 *
 * REQUIRED: Configure API key restrictions in Google Cloud Console:
 * 1. Go to APIs & Services > Credentials
 * 2. Edit your Gemini API key
 * 3. Under "API restrictions", select "Restrict key" and choose only "Generative Language API"
 * 4. Under "Application restrictions", consider adding HTTP referrer restrictions
 * 5. Set quotas in APIs & Services > Quotas to limit daily usage
 *
 * LONG-TERM: Deploy a WebSocket proxy server for true security
 */

export const config = {
    runtime: 'edge',
};

// Rate limiting configuration
const rateLimitMap = new Map();

const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 10; // 10 requests per minute per IP

// Allowed origins
const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:4173',
    'https://app.chatwithserin.com',
    'https://serin-2v6mp35jg-pradeeshsuganthans-projects.vercel.app',
];

function getClientIP(req) {
    // Get the real client IP, handling proxies
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return req.headers.get('x-real-ip') || 'unknown';
}

function checkOrigin(req) {
    const origin = req.headers.get('origin');
    const referer = req.headers.get('referer');

    // In development, be more lenient
    if (process.env.NODE_ENV === 'development') {
        return true;
    }

    // Check origin header
    if (origin && ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed))) {
        return true;
    }

    // Fallback to referer check
    if (referer && ALLOWED_ORIGINS.some(allowed => referer.startsWith(allowed))) {
        return true;
    }

    return false;
}

function checkRateLimit(ip) {
    const now = Date.now();

    // Clean up expired records periodically (prevent memory leak)
    for (const [key, record] of rateLimitMap.entries()) {
        if (now > record.resetAt) {
            rateLimitMap.delete(key);
        }
    }

    // Per-minute rate limiting
    const record = rateLimitMap.get(ip);
    if (!record) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return { allowed: true };
    }

    if (now > record.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return { allowed: true };
    }

    if (record.count >= MAX_REQUESTS_PER_MINUTE) {
        return { allowed: false, retryAfter: Math.ceil((record.resetAt - now) / 1000) };
    }

    record.count++;
    return { allowed: true };
}

export default async function handler(req) {
    // Only allow POST
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Validate origin
    if (!checkOrigin(req)) {
        console.warn('Voice URL request from unauthorized origin:', req.headers.get('origin'));
        return new Response(
            JSON.stringify({ error: 'Unauthorized origin' }),
            {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }

    // Rate limiting by IP
    const ip = getClientIP(req);
    const rateLimitResult = checkRateLimit(ip);

    if (!rateLimitResult.allowed) {
        console.warn(`Rate limit exceeded for IP ${ip}`);

        return new Response(
            JSON.stringify({
                error: 'Rate limit exceeded',
                message: 'Too many requests. Please wait before starting a new voice session.',
                retryAfter: rateLimitResult.retryAfter
            }),
            {
                status: 429,
                headers: {
                    'Content-Type': 'application/json',
                    'Retry-After': String(rateLimitResult.retryAfter),
                }
            }
        );
    }

    // Get API key (server-side only)
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return new Response(
            JSON.stringify({ error: 'Voice service not configured' }),
            {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }

    try {
        // Generate the WebSocket URL
        const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;

        // Log usage for monitoring (don't log the actual key)
        console.log(`Voice URL generated for IP ${ip} at ${new Date().toISOString()}`);

        return new Response(
            JSON.stringify({ url: wsUrl }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                },
            }
        );
    } catch (error) {
        console.error('Error generating voice URL:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}
