import { GoogleGenerativeAI } from '@google/generative-ai'
import { buildMoodShiftPrompt } from '../utils/memoryPrompts'

const apiKey = import.meta.env.VITE_GEMINI_API_KEY
let model = null

const getModel = () => {
  if (!apiKey) {
    console.error('VITE_GEMINI_API_KEY is missing; cannot analyze mood shifts.')
    return null
  }

  if (!model) {
    const client = new GoogleGenerativeAI(apiKey)
    model = client.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 200
      }
    })
  }

  return model
}

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
    const moodModel = getModel()
    if (!moodModel) {
      return null
    }

    const prompt = buildMoodShiftPrompt(messages)
    if (!prompt) {
      return null
    }

    const result = await moodModel.generateContent(prompt)
    const text = result?.response?.text?.()

    return parseAnalysis(text)
  } catch (error) {
    console.error('Error while running mood analysis:', error)
    return null
  }
}
