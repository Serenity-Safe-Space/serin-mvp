/**
 * Secure Voice Chat Proxy using HTTP Streaming
 *
 * This replaces the WebSocket connection with HTTP streaming to keep
 * the Gemini API key secure on the server-side.
 *
 * Security features:
 * - API key only on server (never exposed to client)
 * - Rate limiting (TODO)
 * - Session validation (TODO)
 */

export const config = {
    runtime: 'edge',
    maxDuration: 300, // 5 minutes max
};

export default async function handler(req) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
        return new Response(
            JSON.stringify({ error: 'Gemini API key not configured on server' }),
            { status: 500 }
        );
    }

    try {
        const { audioData, mimeType, systemInstruction, model } = await req.json();

        if (!audioData) {
            return new Response(
                JSON.stringify({ error: 'No audio data provided' }),
                { status: 400 }
            );
        }

        const modelName = model || 'models/gemini-2.5-flash-native-audio-preview-09-2025';

        // Call Gemini's REST API with audio
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`;

        const requestBody = {
            contents: [
                {
                    parts: [
                        {
                            inlineData: {
                                mimeType: mimeType || 'audio/pcm;rate=16000',
                                data: audioData,
                            },
                        },
                    ],
                },
            ],
            generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: 'Orus',
                        },
                    },
                },
            },
        };

        if (systemInstruction) {
            requestBody.systemInstruction = {
                parts: [{ text: systemInstruction }],
            };
        }

        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API error:', errorText);
            return new Response(
                JSON.stringify({ error: 'Gemini API request failed', details: errorText }),
                { status: response.status }
            );
        }

        const data = await response.json();

        return new Response(JSON.stringify(data), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
            },
        });
    } catch (error) {
        console.error('Voice stream error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500 }
        );
    }
}
