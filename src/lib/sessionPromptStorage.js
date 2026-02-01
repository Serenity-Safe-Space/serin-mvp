const STORAGE_KEY = 'serin:session-prompts'

const safeParse = (raw) => {
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      return parsed
    }
  } catch (error) {
    console.warn('Failed to parse session-prompt storage payload:', error)
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
    console.warn('Failed to persist session-prompt mapping:', error)
  }
}

export const rememberSessionPrompt = (sessionId, promptId) => {
  if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
    return
  }
  if (typeof promptId !== 'string' || promptId.trim().length === 0) {
    return
  }

  const map = readMap()
  map[sessionId] = promptId
  writeMap(map)
}

export const getSessionPrompt = (sessionId) => {
  if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
    return null
  }

  const map = readMap()
  return typeof map[sessionId] === 'string' ? map[sessionId] : null
}

export const clearSessionPrompt = (sessionId) => {
  if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
    return
  }

  const map = readMap()
  if (Object.prototype.hasOwnProperty.call(map, sessionId)) {
    delete map[sessionId]
    writeMap(map)
  }
}

export const clearAllSessionPrompts = () => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.warn('Failed to clear session-prompt mapping:', error)
  }
}
