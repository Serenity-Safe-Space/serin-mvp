import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'
import { getSerinPrompt } from '../utils/serinPrompt'
import { getModelById, getDefaultTextModelId } from './aiModelRegistry'

let geminiClient = null
let openAIClient = null

const sleep = (ms) => new Promise((resolve) => {
  const delay = Number(ms)
  const safeDelay = Number.isFinite(delay) && delay > 0 ? delay : 0
  setTimeout(resolve, safeDelay)
})

const getGeminiClient = () => {
  if (geminiClient) {
    return geminiClient
  }

  const apiKey = import.meta.env?.VITE_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('Gemini API key is not configured.')
  }

  geminiClient = new GoogleGenerativeAI(apiKey)
  return geminiClient
}

const getOpenAIClient = () => {
  if (openAIClient) {
    return openAIClient
  }

  const apiKey = import.meta.env?.VITE_OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured.')
  }

  openAIClient = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  })
  return openAIClient
}

const isRateLimitError = (error) => {
  const status = error?.status ?? error?.response?.status
  return Number(status) === 429
}

const readHeaderValue = (headers, name) => {
  if (!headers || !name) {
    return null
  }

  if (typeof headers.get === 'function') {
    return headers.get(name)
  }

  const lower = name.toLowerCase()
  return headers[name] ?? headers[lower]
}

const getRetryAfterMs = (error) => {
  const raw = readHeaderValue(error?.headers, 'retry-after')
    ?? readHeaderValue(error?.response?.headers, 'retry-after')

  if (!raw) {
    return null
  }

  const seconds = Number(raw)
  if (Number.isFinite(seconds) && seconds > 0) {
    return seconds * 1000
  }

  return null
}

const extractTextFromOpenAIResponse = (response) => {
  if (!response?.output || !Array.isArray(response.output)) {
    return ''
  }

  return response.output
    .flatMap((item) => Array.isArray(item?.content) ? item.content : [])
    .filter((content) => content?.type === 'output_text' || content?.type === 'text')
    .map((content) => (content?.text ?? '').trim())
    .filter(Boolean)
    .join('\n')
    .trim()
}

export const generateTextResponse = async ({ modelId, history = [], userMessage }) => {
  const fallbackModelId = getDefaultTextModelId()
  const selectedModel = getModelById(modelId) ?? getModelById(fallbackModelId)

  if (!selectedModel) {
    throw new Error('No text model is configured. Please check environment variables.')
  }

  const prompt = getSerinPrompt(history, userMessage)

  if (selectedModel.provider === 'google') {
    const client = getGeminiClient()
    const model = client.getGenerativeModel({ model: selectedModel.apiName })
    const result = await model.generateContent(prompt)
    const text = result?.response?.text?.() ?? ''
    return {
      text: text.trim(),
      modelId: selectedModel.id,
    }
  }

  if (selectedModel.provider === 'openai') {
    const client = getOpenAIClient()
    const maxAttempts = 2
    let attempt = 0
    let lastError = null

    while (attempt < maxAttempts) {
      try {
        const response = await client.responses.create({
          model: selectedModel.apiName,
          input: prompt,
        })

        const text = extractTextFromOpenAIResponse(response)
        return {
          text,
          modelId: selectedModel.id,
          usage: response?.usage,
        }
      } catch (error) {
        lastError = error
        if (isRateLimitError(error) && attempt < maxAttempts - 1) {
          const retryMs = getRetryAfterMs(error) ?? 2000
          await sleep(retryMs)
          attempt += 1
          continue
        }

        if (isRateLimitError(error)) {
          const friendly = new Error('OpenAI rate limit hit for this model. Wait a few seconds or switch models.')
          friendly.code = 'OPENAI_RATE_LIMIT'
          friendly.cause = error
          throw friendly
        }

        throw error
      }
    }

    if (lastError) {
      throw lastError
    }
  }

  throw new Error(`Unsupported provider for model ${selectedModel.id}`)
}
