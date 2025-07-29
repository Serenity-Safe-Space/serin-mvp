import { useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import './SignInModal.css'

function SignInModal({ isVisible, onClose }) {
  const { signInOrUp, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
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

    const { data, error, isNewUser, needsConfirmation } = await signInOrUp(email, password)

    if (error) {
      setError(error.message)
    } else {
      if (isNewUser && needsConfirmation) {
        setSuccess('Account created! Please check your email to confirm your account before signing in.')
      } else if (isNewUser) {
        setSuccess('Account created and you are now signed in!')
        setTimeout(() => {
          onClose()
          setEmail('')
          setPassword('')
          setSuccess('')
        }, 1000)
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
  }

  return (
    <div className="signin-modal-overlay" onClick={handleClose}>
      <div className="signin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="signin-modal-content">
          <div className="signin-modal-header">
            <h2 className="signin-modal-title">Sign in or create account</h2>
            <button className="signin-modal-close" onClick={handleClose}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6l12 12" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
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
              {loading ? 'Please wait...' : 'Continue'}
            </button>
          </form>

          <p className="signin-info">
            We'll sign you in if you have an account, or create a new one if you don't.
          </p>
        </div>
      </div>
    </div>
  )
}

export default SignInModal