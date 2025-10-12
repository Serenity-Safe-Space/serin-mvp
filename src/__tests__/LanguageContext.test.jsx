import { act } from 'react'
import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { LanguageProvider, useLanguage } from '../contexts/LanguageContext.jsx'

let capturedContext

const Capture = ({ onReady }) => {
  const context = useLanguage()
  capturedContext = context
  if (onReady) {
    onReady(context)
  }
  return null
}

const renderProvider = (props) =>
  render(
    <LanguageProvider {...props}>
      <Capture />
    </LanguageProvider>,
  )

describe('LanguageContext', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.lang = 'en'
    capturedContext = undefined
  })

  afterEach(() => {
    capturedContext = undefined
  })

  it('defaults to configured language when no preference stored', () => {
    renderProvider()

    expect(capturedContext.language).toBe('fr')
    expect(document.documentElement.lang).toBe('fr')
    expect(capturedContext.t('profile.friendFallback')).toBe('ami')
  })

  it('hydrates stored preference and persists changes', () => {
    window.localStorage.setItem('serin.language', 'en')
    renderProvider()

    expect(capturedContext.language).toBe('en')
    expect(capturedContext.t('profile.friendFallback')).toBe('friend')

    act(() => {
      capturedContext.setLanguage('fr')
    })

    expect(window.localStorage.getItem('serin.language')).toBe('fr')
    expect(document.documentElement.lang).toBe('fr')
  })

  it('falls back to key when translation missing', () => {
    renderProvider()
    expect(capturedContext.t('nonexistent.key')).toBe('nonexistent.key')
  })

  it('interpolates replacement tokens', () => {
    window.localStorage.setItem('serin.language', 'en')
    renderProvider()

    const translated = capturedContext.t('profile.encouragement', { name: 'Alex' })
    expect(translated).toContain('Alex')
  })
})
