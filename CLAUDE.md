# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

**Serin** is a mental health support platform designed for Gen-Z users. It features "Serin", an AI companion with a chaotic, funny, and empathetic personality that acts as a supportive friend (NOT a therapist).

### Core Mission
- Provide accessible mental health support through conversational AI
- Target audience: Gen-Z users (ages 18-30)
- Tone: Chaotic Good, empathetic but real, no toxic positivity
- Languages: English and French (never mixed)

## Build and Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (localhost:5173)
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run test         # Run Vitest tests
```

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite 7 |
| Routing | React Router v7 |
| Styling | Plain CSS (no framework) |
| Backend | Supabase (auth, database, RLS) |
| AI - Text | Google Gemini (primary), OpenAI GPT-4 (secondary) |
| AI - Voice | Gemini 2.5 Flash Native Audio (WebSocket) |
| Deployment | Vercel (Edge Functions) |
| Testing | Vitest + React Testing Library |

## Architecture

### Directory Structure

```
src/
├── admin/              # Admin dashboard (role-protected)
├── audio/              # Audio worklets and workers for voice chat
├── components/         # Reusable UI components
├── contexts/           # React contexts (Auth, Premium, Language, etc.)
├── hooks/              # Custom React hooks
├── i18n/               # Translations (English/French)
├── lib/                # Service modules (Supabase interactions)
├── utils/              # Utilities (prompts, colors, etc.)
├── __tests__/          # Test files
├── ChatPage.jsx        # Main chat interface
├── useVoiceToGemini.js # Voice chat hook (WebSocket to Gemini)
└── App.jsx             # Root component with routing

api/                    # Vercel Edge Functions (serverless)
├── chat.js             # Text chat proxy (Gemini/OpenAI)
├── get-voice-url.js    # Voice WebSocket URL generator
├── voice-stream.js     # HTTP streaming fallback
├── voice-proxy.js      # WebSocket proxy (not supported on Vercel)
└── voice-ws.js         # WebSocket handler (conceptual)

public/
├── fonts/              # Hangyaboly custom font
└── test-audio/         # Dev-only test audio files
```

### Key Services (src/lib/)

| Service | Purpose |
|---------|---------|
| `supabase.js` | Supabase client initialization |
| `aiModelClient.js` | Unified interface for AI model calls |
| `aiModelRegistry.js` | Available models and selection logic |
| `chatHistoryService.js` | Session/message CRUD operations |
| `coinService.js` | Gamification coin system |
| `premiumService.js` | Premium subscription management |
| `usageLimitService.js` | Free tier usage limits |
| `memoryService.js` | Mood/memory storage for personalization |
| `activityService.js` | Daily activity tracking (streaks) |

### React Contexts

| Context | Purpose |
|---------|---------|
| `AuthContext` | User authentication state, sign in/out |
| `PremiumContext` | Premium subscription status |
| `LanguageContext` | i18n translations (en/fr) |
| `ModelPreferenceContext` | User's preferred AI model |
| `LastChatContext` | Resume last conversation |

## Security Guidelines (CRITICAL)

### Environment Variables

**Safe for client (VITE_ prefix allowed):**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key
- `VITE_DEFAULT_TEXT_MODEL` - Default model selection

**Server-side only (NO VITE_ prefix):**
- `GEMINI_API_KEY` - Google Gemini API key
- `OPENAI_API_KEY` - OpenAI API key

### Security Rules
1. **Never expose API keys in client code** - All AI calls go through `/api/*` endpoints
2. **Never use VITE_ prefix for secrets** - Vite bundles these into client code
3. **Never commit .env files** - Use `.env.local.example` as template
4. **All database access uses Supabase RLS** - Row Level Security enforces ownership
5. **Admin routes protected by `RequireAdmin`** - Checks `adminRole.isAdmin`

### Known Security Considerations
- `/api/get-voice-url` returns WebSocket URL with embedded API key (mitigated with rate limiting and origin checks)
- API key restrictions MUST be configured in Google Cloud Console (see below)

### Google Cloud API Key Security (REQUIRED)

To protect the Gemini API key, configure these restrictions in Google Cloud Console:

1. **Go to** APIs & Services → Credentials
2. **Edit** your Gemini API key
3. **API restrictions**: Select "Restrict key" → Choose only "Generative Language API"
4. **Set quotas**: APIs & Services → Quotas → Set daily limits for Generative Language API
5. **Enable monitoring**: Set up billing alerts and usage notifications

The voice endpoint (`/api/get-voice-url`) also enforces:
- Origin validation (only allows requests from your domains)
- Per-IP rate limiting (10 requests/minute)
- Usage logging for monitoring

## Supabase Patterns

### Database Tables (inferred from code)
- `chat_sessions` - User chat sessions with title, channel, timestamps
- `chat_messages` - Messages within sessions (role, content)
- `mood_memories` - Detected mood transitions for personalization
- `daily_activity` - User activity tracking for streaks
- `user_coins` - Gamification coin balances
- `premium_subscriptions` - Premium status

### RLS Pattern
All queries include `user_id` checks:
```javascript
.eq('user_id', userId)  // Always filter by authenticated user
```

### Admin RPC Functions
- `admin_current_role` - Get current user's admin role
- `admin_total_users`, `admin_active_users`, etc. - Analytics

## AI Model Integration

### Text Chat Flow
1. User sends message in `ChatPage.jsx`
2. `generateTextResponse()` in `aiModelClient.js` called
3. Fetches `/api/chat` with provider, model, messages
4. Server-side handler uses appropriate SDK (Gemini/OpenAI)
5. Response returned and displayed

### Voice Chat Flow
1. User clicks mic button in `ChatPage.jsx`
2. `useVoiceToGemini` hook initiates recording
3. Fetches WebSocket URL from `/api/get-voice-url`
4. Opens WebSocket to Gemini's BidiGenerateContent API
5. Streams audio chunks, receives audio responses
6. AudioWorklet processes playback

### Serin's Personality (src/utils/serinPrompt.js)
- Chaotic, funny Gen-Z friend
- NEVER use therapist jargon ("I hear you", "It sounds like")
- Vary openers: "Yo", "Damn", "Wait", "Honestly", "Lowkey"
- Read the room: roast minor issues, validate serious ones
- Crisis protocol: recognize distress, provide resources (988 US, 3114 France)

## UI/UX Guidelines

### Brand Colors (src/utils/serinColors.js)
- **Sunbeam Yellow**: `#FFEB5B` - Primary buttons, accents
- **Deep Serin Purple**: `#6B1FAD` / `#3C2A73` - Text, borders
- **White**: `#FFFFFF` - Backgrounds, inputs

### Typography
- Font: **Hangyaboly** (custom, in `/public/fonts/`)
- Titles: Larger, bold, purple
- Body: Medium size, clean spacing

### Component Patterns
- Rounded corners on all interactive elements
- Primary button: Yellow bg, purple text
- Secondary button: White bg, purple border
- Inputs: White fill, purple border

## Testing

### Running Tests
```bash
npm run test           # Run all tests
npm run test -- --ui   # Vitest UI
```

### Test Location
Tests are in `src/__tests__/` with `.test.js` or `.test.jsx` extension.

### Mock Patterns
```javascript
// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: { /* mock implementation */ }
}))

// Mock AuthContext
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user' } })
}))
```

## Common Development Tasks

### Adding a New API Endpoint
1. Create file in `api/` directory
2. Export `config` for Edge runtime: `export const config = { runtime: 'edge' }`
3. Export default async handler function
4. Use `process.env.GEMINI_API_KEY` (NOT `VITE_` prefixed)
5. Add authentication check (currently TODO in codebase)

### Adding a New Service
1. Create file in `src/lib/`
2. Import supabase client: `import { supabase } from './supabase'`
3. Always include `user_id` in queries for RLS
4. Return `{ data, error }` pattern

### Adding Translations
1. Edit `src/i18n/translations.js`
2. Add keys to both `en` and `fr` objects
3. Use via `useLanguage()` hook: `const { t } = useLanguage()`

## Deployment (Vercel)

### Environment Variables to Set
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-key
OPENAI_API_KEY=your-openai-key
```

### Build Settings
- Framework: Vite
- Build Command: `npm run build`
- Output Directory: `dist`

## Important Caveats

1. **Voice chat limitation**: Vercel Edge doesn't support persistent WebSocket servers. Current solution returns pre-signed URL (security trade-off).

2. **Model availability**: OpenAI models are defined but currently disabled (`isModelAvailable` only returns true for Google models).

3. **Premium features**: Gated behind `usePremium()` hook and `FREE_DAILY_MESSAGE_LIMIT` constant.

4. **Session management**: Sessions auto-expire after `DEFAULT_LAST_CHAT_TTL_MS` of inactivity.
