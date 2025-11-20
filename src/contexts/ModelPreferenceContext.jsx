import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import {
  getDefaultTextModelId,
  isModelAvailable,
  listTextModels,
} from '../lib/aiModelRegistry'

const STORAGE_KEY = 'serin:text-model'

const ModelPreferenceContext = createContext({
  currentModel: null,
  availableModels: [],
  canEdit: false,
  setModel: () => false,
})

const readStoredModel = () => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored && isModelAvailable(stored)) {
      return stored
    }
  } catch (error) {
    console.warn('Failed to read stored model preference:', error)
  }

  return null
}

const persistModel = (modelId) => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, modelId)
  } catch (error) {
    console.warn('Failed to store model preference:', error)
  }
}

export const ModelPreferenceProvider = ({ children }) => {
  const { adminRole } = useAuth()
  const [currentModel, setCurrentModel] = useState(() => {
    return readStoredModel() ?? getDefaultTextModelId()
  })

  useEffect(() => {
    if (!isModelAvailable(currentModel)) {
      setCurrentModel(getDefaultTextModelId())
    }
  }, [currentModel])

  const canEdit = Boolean(adminRole?.isAdmin)

  const setModel = useCallback((nextModelId) => {
    if (!canEdit) {
      return false
    }

    if (!nextModelId || !isModelAvailable(nextModelId)) {
      return false
    }

    setCurrentModel(nextModelId)
    persistModel(nextModelId)
    return true
  }, [canEdit])

  const contextValue = useMemo(() => ({
    currentModel,
    availableModels: listTextModels(),
    canEdit,
    setModel,
  }), [currentModel, canEdit, setModel])

  return (
    <ModelPreferenceContext.Provider value={contextValue}>
      {children}
    </ModelPreferenceContext.Provider>
  )
}

export const useModelPreference = () => {
  const context = useContext(ModelPreferenceContext)
  if (!context) {
    throw new Error('useModelPreference must be used within ModelPreferenceProvider')
  }

  return context
}

