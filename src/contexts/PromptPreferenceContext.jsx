import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import {
  getDefaultPromptId,
  isPromptAvailable,
  listPrompts,
} from '../lib/promptRegistry'

const STORAGE_KEY = 'serin:text-prompt'

const PromptPreferenceContext = createContext({
  currentPrompt: null,
  availablePrompts: [],
  canEdit: false,
  setPrompt: () => false,
})

const readStoredPrompt = () => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored && isPromptAvailable(stored)) {
      return stored
    }
  } catch (error) {
    console.warn('Failed to read stored prompt preference:', error)
  }

  return null
}

const persistPrompt = (promptId) => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, promptId)
  } catch (error) {
    console.warn('Failed to store prompt preference:', error)
  }
}

export const PromptPreferenceProvider = ({ children }) => {
  const { adminRole } = useAuth()
  const [currentPrompt, setCurrentPrompt] = useState(() => {
    return readStoredPrompt() ?? getDefaultPromptId()
  })

  useEffect(() => {
    if (!isPromptAvailable(currentPrompt)) {
      setCurrentPrompt(getDefaultPromptId())
    }
  }, [currentPrompt])

  // Super admin only - not regular admin
  const canEdit = Boolean(adminRole?.isSuperAdmin)

  const setPrompt = useCallback((nextPromptId) => {
    if (!canEdit) {
      return false
    }

    if (!nextPromptId || !isPromptAvailable(nextPromptId)) {
      return false
    }

    setCurrentPrompt(nextPromptId)
    persistPrompt(nextPromptId)
    return true
  }, [canEdit])

  const contextValue = useMemo(() => ({
    currentPrompt,
    availablePrompts: listPrompts(),
    canEdit,
    setPrompt,
  }), [currentPrompt, canEdit, setPrompt])

  return (
    <PromptPreferenceContext.Provider value={contextValue}>
      {children}
    </PromptPreferenceContext.Provider>
  )
}

export const usePromptPreference = () => {
  const context = useContext(PromptPreferenceContext)
  if (!context) {
    throw new Error('usePromptPreference must be used within PromptPreferenceProvider')
  }

  return context
}
