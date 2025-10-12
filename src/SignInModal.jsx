import { useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import { useLanguage } from './contexts/LanguageContext'
import './SignInModal.css'

function SignInModal({ isVisible, onClose }) {
  const { signIn, signUp, resetPassword, signInWithGoogle, loading } = useAuth()
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [authMode, setAuthMode] = useState('signIn') // signIn | signUp | reset
  const [googleLoading, setGoogleLoading] = useState(false)
  
  if (!isVisible) return null

  const isSignUp = authMode === 'signUp'
  const isReset = authMode === 'reset'

  const clearStatus = () => {
    setError('')
    setSuccess('')
    setGoogleLoading(false)
  }

  const switchMode = (mode) => {
    setAuthMode(mode)
    clearStatus()
    if (mode === 'reset') {
      setPassword('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearStatus()

    if (!email) {
      setError(t('auth.errors.emailRequired'))
      return
    }

    if (isReset) {
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined
      const { error } = await resetPassword(email, redirectTo)

      if (error) {
        setError(error.message)
      } else {
        setSuccess(t('auth.success.resetEmail'))
      }
      return
    }

    if (!password) {
      setError(t('auth.errors.fieldsRequired'))
      return
    }

    if (isSignUp && password.length < 6) {
      setError(t('auth.errors.passwordLength'))
      return
    }

    if (isSignUp) {
      // Handle Sign Up
      const { data, error } = await signUp(email, password)
      
      if (error) {
        setError(error.message)
      } else {
        if (data.user && !data.session) {
          setSuccess(t('auth.success.signUpPending'))
        } else {
          setSuccess(t('auth.success.signUpComplete'))
          setTimeout(() => {
            onClose()
            setEmail('')
            setPassword('')
            setSuccess('')
          }, 1000)
        }
      }
    } else {
      // Handle Sign In
      const { data, error } = await signIn(email, password)
      
      if (error) {
        setError(error.message)
      } else {
        setSuccess(t('auth.success.signIn'))
        setTimeout(() => {
          onClose()
          setEmail('')
          setPassword('')
          setSuccess('')
        }, 1000)
      }
    }
  }

  const handleGoogleSignIn = async () => {
    clearStatus()
    setGoogleLoading(true)

    const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined
    const { data, error } = await signInWithGoogle(redirectTo)

    if (error) {
      setError(error.message)
      setGoogleLoading(false)
      return
    }

    if (data?.url) {
      if (typeof window !== 'undefined') {
        if (typeof window.location?.assign === 'function') {
          window.location.assign(data.url)
        } else {
          window.location.href = data.url
        }
      }
      return
    }

    setSuccess(t('auth.success.oauthRedirect'))
    setGoogleLoading(false)
  }

  const handleClose = () => {
    onClose()
    setEmail('')
    setPassword('')
    clearStatus()
    setAuthMode('signIn')
  }

  return (
    <div className="signin-modal-overlay" onClick={handleClose}>
      <div className="signin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="signin-modal-content">
          <div className="signin-modal-header">
            <button className="signin-modal-close" onClick={handleClose}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6l12 12" stroke="rgba(255, 255, 255, 0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <h2 className="signin-modal-title">
              {isSignUp ? t('auth.titles.signUp') : isReset ? t('auth.titles.reset') : t('auth.titles.signIn')}
            </h2>
            <p className="signin-modal-subtitle">{t('auth.subtitle')}</p>
          </div>

          {isReset ? (
            <button
              type="button"
              className="back-to-signin"
              onClick={() => switchMode('signIn')}
            >
              {t('auth.backToSignIn')}
            </button>
          ) : (
            <div className="auth-mode-toggle">
              <button
                className={`toggle-btn ${authMode === 'signIn' ? 'active' : ''}`}
                onClick={() => authMode !== 'signIn' && switchMode('signIn')}
                type="button"
              >
                {t('auth.toggle.signIn')}
              </button>
              <button
                className={`toggle-btn ${isSignUp ? 'active' : ''}`}
                onClick={() => !isSignUp && switchMode('signUp')}
                type="button"
              >
                {t('auth.toggle.signUp')}
              </button>
            </div>
          )}

          {!isReset && (
            <div className="oauth-buttons">
              <button
                type="button"
                className="oauth-button oauth-google"
                onClick={handleGoogleSignIn}
                disabled={loading || googleLoading}
              >
                <span className="oauth-icon" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M21.35 11.1H12.2v2.96h5.22c-.23 1.33-1.4 3.9-5.22 3.9-3.14 0-5.7-2.6-5.7-5.82s2.56-5.82 5.7-5.82c1.79 0 3 .76 3.69 1.41l2.52-2.42C16.84 3.5 14.7 2.6 12.2 2.6 6.94 2.6 2.7 6.84 2.7 12.1s4.24 9.5 9.5 9.5c5.49 0 9.12-3.86 9.12-9.3 0-.62-.07-1.1-.17-1.6z" fill="#4285F4"/>
                  </svg>
                </span>
                <span>{googleLoading ? t('auth.buttons.redirecting') : t('auth.buttons.continueWithGoogle')}</span>
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="signin-form">
            <div className="form-group">
              <label htmlFor="email">{t('auth.form.emailLabel')}</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.form.emailPlaceholder')}
                disabled={loading}
                required
              />
            </div>

            {!isReset && (
              <div className="form-group">
                <label htmlFor="password">{t('auth.form.passwordLabel')}</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.form.passwordPlaceholder')}
                  disabled={loading}
                  required
                  minLength="6"
                />
              </div>
            )}

            {authMode === 'signIn' && (
              <button
                type="button"
                className="forgot-password-link"
                onClick={() => switchMode('reset')}
                disabled={loading}
              >
                {t('auth.reset.link')}
              </button>
            )}

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <button type="submit" className="signin-submit" disabled={loading}>
              {loading
                ? t('auth.buttons.loading')
                : isSignUp
                  ? t('auth.buttons.submitSignUp')
                  : isReset
                    ? t('auth.buttons.submitReset')
                    : t('auth.buttons.submitSignIn')}
            </button>
          </form>

          <p className="signin-info">
            {isSignUp
              ? t('auth.info.signInPrompt')
              : isReset
                ? t('auth.info.resetPrompt')
                : t('auth.info.signUpPrompt')}
          </p>
        </div>
      </div>
    </div>
  )
}

export default SignInModal
