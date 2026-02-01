import { getSerinSystemInstruction } from '../utils/serinPrompt'

const TEST_PROMPTS = [
  {
    id: 'default',
    label: 'Serin 5.0 - Minimal friend (Default)',
    description: 'Current production prompt',
    isDefault: true,
    getSystemInstruction: (history) => getSerinSystemInstruction(history),
  },
  {
    id: 'checkin-buddy',
    label: 'Check-in Buddy',
    description: 'Structured daily check-in with mood/energy tracking',
    isDefault: false,
    getSystemInstruction: () => `Be my chill best-friend check-in buddy.

How to respond:
- Talk naturally, like we're texting.
- If I'm not struggling, don't dig for problems. Keep it light, curious, and supportive.
- If I mention a real issue, gently help me make sense of it and suggest a couple simple next steps (not a huge plan).
- Ask at most 3 short questions, and only if they actually help.
- No diagnosing, no therapy-speak, no lectures.

Today:
- Energy (0–10):
- Mood (a few words):
- What happened today (1–5 sentences):
- Anything I'm looking forward to:
- Anything I'm avoiding or dreading (optional):
- One thing I want tomorrow to feel like:`,
  },
]

export const getPromptById = (promptId) =>
  TEST_PROMPTS.find((p) => p.id === promptId)

export const isPromptAvailable = (promptId) =>
  TEST_PROMPTS.some((p) => p.id === promptId)

export const getDefaultPromptId = () =>
  TEST_PROMPTS.find((p) => p.isDefault)?.id || 'default'

export const listPrompts = () => TEST_PROMPTS

export const getPromptSystemInstruction = (promptId, history = []) => {
  const prompt = getPromptById(promptId) || getPromptById(getDefaultPromptId())
  return prompt.getSystemInstruction(history)
}
