import { buildMoodShiftPrompt } from '../utils/memoryPrompts'

const parseAnalysis = (rawText) => {
  if (!rawText) {
    return null
  }

  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()

  try {
    const parsed = JSON.parse(cleaned)
    if (typeof parsed.transitionDetected !== 'boolean') {
      return null
    }

    return {
      transitionDetected: parsed.transitionDetected,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
      triggerSummary: parsed.triggerSummary?.trim?.() || '',
      supportingUserQuote: parsed.supportingUserQuote?.trim?.() || '',
      keywords: Array.isArray(parsed.keywords)
        ? parsed.keywords.filter(Boolean).map((keyword) => `${keyword}`.trim()).slice(0, 6)
        : []
    }
  } catch (error) {
    console.warn('Failed to parse mood analysis response:', error)
    return null
  }
}

export const analyzeMoodShift = async (messages) => {
  if (!Array.isArray(messages) || messages.length < 3) {
    return null
  }

  try {
    const prompt = buildMoodShiftPrompt(messages)
    if (!prompt) {
      return null
    }

    // Use the secure backend API
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider: 'google',
        model: 'gemini-2.5-flash',
        prompt: prompt
      }),
    })

    if (!response.ok) {
      console.error('Mood analysis API failed:', response.status)
      return null
    }

    const data = await response.json()
    const text = data.text

    return parseAnalysis(text)
  } catch (error) {
    console.error('Error while running mood analysis:', error)
    return null
  }
}
