import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, translations } from '../i18n/translations'

const LOCAL_STORAGE_KEY = 'serin.language'

const LanguageContext = createContext({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  t: (key) => key,
})

const resolveTranslation = (languageCode, key) => {
  if (!translations[languageCode]) {
    return undefined
  }

  return key.split('.').reduce((accumulator, segment) => {
    if (accumulator === undefined || accumulator === null) {
      return undefined
    }
    return accumulator[segment]
  }, translations[languageCode])
}

const interpolate = (value, replacements) => {
  if (!replacements || typeof value !== 'string') {
    return value
  }

  return Object.keys(replacements).reduce((result, token) => {
    const pattern = new RegExp(`{{\\s*${token}\\s*}}`, 'g')
    return result.replace(pattern, replacements[token])
  }, value)
}

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_LANGUAGE
    }
    const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY)
    if (stored && SUPPORTED_LANGUAGES.includes(stored)) {
      return stored
    }
    return DEFAULT_LANGUAGE
  })

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, language)
    }
  }, [language])

  const setLanguage = useCallback((nextLanguage) => {
    if (!nextLanguage) {
      setLanguageState(DEFAULT_LANGUAGE)
      return
    }
    const normalized = nextLanguage.toLowerCase()
    if (SUPPORTED_LANGUAGES.includes(normalized)) {
      setLanguageState(normalized)
    } else {
      setLanguageState(DEFAULT_LANGUAGE)
    }
  }, [])

  const t = useCallback((key, replacements) => {
    if (!key) {
      return ''
    }

    const fallbackOrder = Array.from(
      new Set([language, DEFAULT_LANGUAGE, 'en']),
    ).filter((code) => translations[code])

    for (const lang of fallbackOrder) {
      const resolved = resolveTranslation(lang, key)
      if (resolved !== undefined) {
        if (Array.isArray(resolved)) {
          return resolved.map((item) => interpolate(item, replacements))
        }
        return interpolate(resolved, replacements)
      }
    }

    return key
  }, [language])

  const contextValue = useMemo(() => ({
    language,
    setLanguage,
    t,
  }), [language, setLanguage, t])

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  )
}
