import { useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import { useLanguage } from './contexts/LanguageContext'
import './SignInModal.css'

function SignInModal({ isVisible, onClose }) {
  const { signIn, signUp, resetPassword, loading } = useAuth()
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [authMode, setAuthMode] = useState('signIn') // signIn | signUp | reset
  
  if (!isVisible) return null

  const isSignUp = authMode === 'signUp'
  const isReset = authMode === 'reset'

  const clearStatus = () => {
    setError('')
    setSuccess('')
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
