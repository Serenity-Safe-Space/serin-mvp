const STORAGE_KEY = 'serin:session-models'

const safeParse = (raw) => {
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      return parsed
    }
  } catch (error) {
    console.warn('Failed to parse session-model storage payload:', error)
  }
  return {}
}

const readMap = () => {
  if (typeof window === 'undefined') {
    return {}
  }

  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    return {}
  }

  return safeParse(stored)
}

const writeMap = (map) => {
  if (typeof window === 'undefined') {
     return
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch (error) {
    console.warn('Failed to persist session-model mapping:', error)
  }
}

export const rememberSessionModel = (sessionId, modelId) => {
  if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
    return
  }
  if (typeof modelId !== 'string' || modelId.trim().length === 0) {
    return
  }

  const map = readMap()
  map[sessionId] = modelId
  writeMap(map)
}

export const getSessionModel = (sessionId) => {
  if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
    return null
  }

  const map = readMap()
  return typeof map[sessionId] === 'string' ? map[sessionId] : null
}

export const clearSessionModel = (sessionId) => {
  if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
    return
  }

  const map = readMap()
  if (Object.prototype.hasOwnProperty.call(map, sessionId)) {
    delete map[sessionId]
    writeMap(map)
  }
}

export const clearAllSessionModels = () => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.warn('Failed to clear session-model mapping:', error)
  }
}

