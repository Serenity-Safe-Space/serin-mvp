import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './AuthContext'

const STORAGE_KEY = 'serin:last-chat'
const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000 // 12 hours

const LastChatContext = createContext({
  lastChat: null,
  rememberChat: () => {},
  clearLastChat: () => {},
})

const readStoredChat = () => {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw)
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.sessionId !== 'string' ||
      parsed.sessionId.trim().length === 0 ||
      (parsed.userId !== null && typeof parsed.userId !== 'string') ||
      typeof parsed.lastTouchedAt !== 'number'
    ) {
      return null
    }
    return {
      sessionId: parsed.sessionId,
      userId: parsed.userId ?? null,
      lastTouchedAt: parsed.lastTouchedAt,
    }
  } catch (error) {
    console.warn('Failed to parse last chat storage payload:', error)
    return null
  }
}

const writeStoredChat = (payload) => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (error) {
    console.warn('Failed to persist last chat state:', error)
  }
}

const clearStoredChat = () => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.warn('Failed to clear last chat storage:', error)
  }
}

export const LastChatProvider = ({ children, ttlMs = DEFAULT_TTL_MS }) => {
  const { user } = useAuth()
  const [lastChat, setLastChat] = useState(null)
  const ttlRef = useRef(ttlMs)
  ttlRef.current = ttlMs

  const isExpired = useCallback((timestamp) => {
    if (typeof ttlRef.current !== 'number' || ttlRef.current <= 0) {
      return false
    }
    return Date.now() - timestamp > ttlRef.current
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const stored = readStoredChat()
    if (!stored) {
      setLastChat(null)
      return
    }

    if (isExpired(stored.lastTouchedAt)) {
      clearStoredChat()
      setLastChat(null)
      return
    }

    if (!user?.id) {
      // Keep storage for later but don't expose it without a matching user.
      setLastChat(null)
      return
    }

    if (stored.userId !== user.id) {
      setLastChat(null)
      return
    }

    setLastChat(stored)
  }, [user?.id, isExpired])

  const rememberChat = useCallback((sessionId, overrides = {}) => {
    const sanitizedSessionId = typeof sessionId === 'string' ? sessionId.trim() : ''
    if (sanitizedSessionId.length === 0) {
      return
    }

    const effectiveUserId = typeof overrides.userId === 'string' ? overrides.userId : user?.id ?? null
    if (!effectiveUserId) {
      return
    }

    const lastTouchedAt = typeof overrides.lastTouchedAt === 'number' ? overrides.lastTouchedAt : Date.now()
    const payload = { sessionId: sanitizedSessionId, userId: effectiveUserId, lastTouchedAt }

    setLastChat(payload)
    writeStoredChat(payload)
  }, [user?.id])

  const clearLastChat = useCallback(() => {
    setLastChat(null)
    clearStoredChat()
  }, [])

  const value = useMemo(() => ({
    lastChat,
    rememberChat,
    clearLastChat,
  }), [lastChat, rememberChat, clearLastChat])

  return (
    <LastChatContext.Provider value={value}>
      {children}
    </LastChatContext.Provider>
  )
}

export const useLastChat = () => {
  const context = useContext(LastChatContext)
  if (!context) {
    throw new Error('useLastChat must be used within a LastChatProvider')
  }

  return context
}
