const TEXT_MODELS = [
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    provider: 'google',
    apiName: 'gemini-2.5-flash',
    description: 'Balanced for fast reasoning and low latency across most prompts.',
  },
  {
    id: 'gemini-3-flash-preview',
    label: 'Gemini 3 Flash',
    provider: 'google',
    apiName: 'gemini-3-flash-preview',
    description: 'Next-generation high-speed model with enhanced reasoning.',
  },
  {
    id: 'gpt-4.1',
    label: 'GPT-4.1',
    provider: 'openai',
    apiName: 'gpt-4.1',
    description: 'Most capable GPT-4.1 model with high reasoning depth.',
  },
  {
    id: 'gpt-4.1-mini',
    label: 'GPT-4.1 Mini',
    provider: 'openai',
    apiName: 'gpt-4.1-mini',
    description: 'Cost effective GPT-4.1 variant tuned for speed.',
  },
]

const envHasValue = (key) => {
  // Keys are now managed on the server
  return true
}

export const getModelById = (modelId) => {
  if (!modelId) return undefined
  return TEXT_MODELS.find((model) => model.id === modelId)
}

export const isModelAvailable = (modelId) => {
  const model = getModelById(modelId)
  if (!model) return false
  // Only allow Google models for now
  if (model.provider !== 'google') return false
  return envHasValue(model.envKey)
}

export const getDefaultTextModelId = () => {
  const configured = import.meta.env?.VITE_DEFAULT_TEXT_MODEL

  if (configured) {
    const normalized = configured.trim()
    if (isModelAvailable(normalized)) {
      return normalized
    }
  }

  const fallback = TEXT_MODELS.find((model) => isModelAvailable(model.id))
  return fallback?.id ?? TEXT_MODELS[0]?.id ?? 'gemini-2.5-flash'
}

export const listTextModels = () => {
  return TEXT_MODELS
    .filter(model => model.provider === 'google')
    .map((model) => ({
      ...model,
      available: isModelAvailable(model.id),
    }))
}

export const getModelLabel = (modelId) => {
  return getModelById(modelId)?.label ?? modelId
}

