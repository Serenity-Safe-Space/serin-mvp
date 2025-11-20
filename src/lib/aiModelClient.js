import { getSerinPrompt } from '../utils/serinPrompt'
import { getModelById, getDefaultTextModelId } from './aiModelRegistry'

const extractTextFromOpenAIResponse = (response) => {
  if (response?.choices && response.choices.length > 0) {
    return response.choices[0].message?.content || ''
  }
  // Fallback for non-standard responses if any
  return ''
}

export const generateTextResponse = async ({ modelId, history = [], userMessage }) => {
  const fallbackModelId = getDefaultTextModelId()
  const selectedModel = getModelById(modelId) ?? getModelById(fallbackModelId)

  if (!selectedModel) {
    throw new Error('No text model is configured.')
  }

  const systemInstruction = getSerinPrompt(history, userMessage).split('Previous Conversation:')[0].trim();

  // Prepare messages for the API
  const messages = [
    { role: 'system', content: systemInstruction },
    ...history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    })),
    { role: 'user', content: userMessage }
  ]

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider: selectedModel.provider,
        model: selectedModel.apiName,
        messages: messages,
        prompt: prompt // Fallback or for models that prefer raw prompt
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `API request failed with status ${response.status}`)
    }

    const data = await response.json()

    if (selectedModel.provider === 'google') {
      return {
        text: data.text || '',
        modelId: selectedModel.id,
      }
    }

    if (selectedModel.provider === 'openai') {
      const text = extractTextFromOpenAIResponse(data)
      return {
        text,
        modelId: selectedModel.id,
        usage: data.usage,
      }
    }

    throw new Error(`Unsupported provider response for model ${selectedModel.id}`)

  } catch (error) {
    console.error('AI Model Client Error:', error)
    throw error
  }
}
