import { useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import './SignInModal.css'

function SignInModal({ isVisible, onClose }) {
  const { signIn, signUp, resetPassword, loading } = useAuth()
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
      setError('Please enter your email')
      return
    }

    if (isReset) {
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined
      const { error } = await resetPassword(email, redirectTo)

      if (error) {
        setError(error.message)
      } else {
        setSuccess('Password reset email sent! Check your inbox for the link.')
      }
      return
    }

    if (!password) {
      setError('Please fill in all fields')
      return
    }

    if (isSignUp && password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (isSignUp) {
      // Handle Sign Up
      const { data, error } = await signUp(email, password)
      
      if (error) {
        setError(error.message)
      } else {
        if (data.user && !data.session) {
          setSuccess('Account created! Please check your email to confirm your account before signing in.')
        } else {
          setSuccess('Account created and you are now signed in!')
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
        setSuccess('Welcome back!')
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
              {isSignUp ? 'Sign Up' : isReset ? 'Reset Password' : 'Sign In'}
            </h2>
            <p className="signin-modal-subtitle">We keep it private</p>
          </div>

          {isReset ? (
            <button
              type="button"
              className="back-to-signin"
              onClick={() => switchMode('signIn')}
            >
              Back to Sign In
            </button>
          ) : (
            <div className="auth-mode-toggle">
              <button
                className={`toggle-btn ${authMode === 'signIn' ? 'active' : ''}`}
                onClick={() => authMode !== 'signIn' && switchMode('signIn')}
                type="button"
              >
                Sign In
              </button>
              <button
                className={`toggle-btn ${isSignUp ? 'active' : ''}`}
                onClick={() => !isSignUp && switchMode('signUp')}
                type="button"
              >
                Sign Up
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="signin-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                disabled={loading}
                required
              />
            </div>

            {!isReset && (
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
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
                Forgot your password?
              </button>
            )}

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <button type="submit" className="signin-submit" disabled={loading}>
              {loading
                ? 'Please wait...'
                : isSignUp
                  ? 'Create Account'
                  : isReset
                    ? 'Send Reset Link'
                    : 'Sign In'}
            </button>
          </form>

          <p className="signin-info">
            {isSignUp
              ? "Already have an account? Click 'Sign In' above."
              : isReset
                ? 'Enter your account email and we will send you a reset link.'
                : "Don't have an account? Click 'Sign Up' above."
            }
          </p>
        </div>
      </div>
    </div>
  )
}

export default SignInModal
