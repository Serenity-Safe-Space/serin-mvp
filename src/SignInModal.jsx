import { useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import './SignInModal.css'

function SignInModal({ isVisible, onClose }) {
  const { signIn, signUp, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSignUp, setIsSignUp] = useState(false) // Default to Sign In
  
  if (!isVisible) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    if (password.length < 6) {
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
    setError('')
    setSuccess('')
    setIsSignUp(false) // Reset to Sign In when closing
  }

  const toggleMode = () => {
    setIsSignUp(!isSignUp)
    setError('')
    setSuccess('')
  }

  return (
    <div className="signin-modal-overlay" onClick={handleClose}>
      <div className="signin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="signin-modal-content">
          <div className="signin-modal-header">
            <h2 className="signin-modal-title">{isSignUp ? 'Create Account' : 'Sign In'}</h2>
            <button className="signin-modal-close" onClick={handleClose}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6l12 12" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <div className="auth-mode-toggle">
            <button 
              className={`toggle-btn ${!isSignUp ? 'active' : ''}`}
              onClick={() => !isSignUp || toggleMode()}
              type="button"
            >
              Sign In
            </button>
            <button 
              className={`toggle-btn ${isSignUp ? 'active' : ''}`}
              onClick={() => isSignUp || toggleMode()}
              type="button"
            >
              Sign Up
            </button>
          </div>

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

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <button type="submit" className="signin-submit" disabled={loading}>
              {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <p className="signin-info">
            {isSignUp 
              ? "Already have an account? Click 'Sign In' above." 
              : "Don't have an account? Click 'Sign Up' above."
            }
          </p>
        </div>
      </div>
    </div>
  )
}

export default SignInModal