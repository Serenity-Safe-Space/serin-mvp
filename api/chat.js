import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    try {
        const { provider, model, messages, prompt } = await req.json();

        if (provider === 'openai') {
            const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
            if (!apiKey) {
                return new Response(JSON.stringify({ error: 'OpenAI API key not configured on server' }), { status: 500 });
            }

            const openai = new OpenAI({ apiKey });

            // Convert messages if needed or pass directly
            // Assuming messages is an array of { role, content }
            const completion = await openai.chat.completions.create({
                model: model || 'gpt-4o',
                messages: messages,
            });

            return new Response(JSON.stringify(completion), {
                headers: { 'Content-Type': 'application/json' },
            });

        } else if (provider === 'google') {
            const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
            if (!apiKey) {
                return new Response(JSON.stringify({ error: 'Gemini API key not configured on server' }), { status: 500 });
            }

            // Extract system instruction if present
            let systemInstruction = undefined;
            let chatHistory = [];
            let lastMessage = '';

            if (messages && messages.length > 0) {
                const systemMsg = messages.find(m => m.role === 'system');
                if (systemMsg) {
                    systemInstruction = systemMsg.content;
                }

                // Filter out system message for history and map to Gemini format
                chatHistory = messages
                    .filter(m => m.role !== 'system')
                    .slice(0, -1)
                    .map(m => ({
                        role: m.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: m.content }]
                    }));

                const lastMsgObj = messages[messages.length - 1];
                if (lastMsgObj && lastMsgObj.role !== 'system') {
                    lastMessage = lastMsgObj.content;
                }
            }

            const genAI = new GoogleGenerativeAI(apiKey);
            const geminiModel = genAI.getGenerativeModel({
                model: model || 'gemini-1.5-flash',
                systemInstruction: systemInstruction
            });

            let result;
            if (lastMessage) {
                const chat = geminiModel.startChat({
                    history: chatHistory,
                });
                result = await chat.sendMessage(lastMessage);
            } else if (prompt) {
                result = await geminiModel.generateContent(prompt);
            } else {
                return new Response(JSON.stringify({ error: 'No prompt or messages provided' }), { status: 400 });
            }

            const response = await result.response;
            const text = response.text();

            return new Response(JSON.stringify({ text }), {
                headers: { 'Content-Type': 'application/json' },
            });
        } else {
            return new Response(JSON.stringify({ error: 'Invalid provider' }), { status: 400 });
        }

    } catch (error) {
        console.error('API Error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
