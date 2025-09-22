import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import './ResetPassword.css'

function ResetPassword() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const navigate = useNavigate()
  const redirectTimeoutRef = useRef(null)

  useEffect(() => {
    let isMounted = true

    const verifySession = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (!isMounted) return

      if (error) {
        setError('Something went wrong while verifying your reset link. Please request a new email.')
        return
      }

      if (data.session) {
        setIsReady(true)
      }
    }

    verifySession()

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return

      if (event === 'PASSWORD_RECOVERY' && session) {
        setIsReady(true)
        setError('')
      }

      if (event === 'SIGNED_OUT') {
        setIsReady(false)
      }
    })

    return () => {
      isMounted = false
      listener?.subscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current)
      }
    }
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (!isReady) {
      setError('Your reset link is not active. Try opening the link again from your email.')
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })

      if (error) {
        setError(error.message)
        return
      }

      setSuccess('Your password has been updated! Redirecting you back to Serin…')
      setNewPassword('')
      setConfirmPassword('')
      redirectTimeoutRef.current = setTimeout(() => navigate('/'), 1500)
    } catch (err) {
      setError(err.message || 'Failed to update password. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="reset-password-page">
      <div className="reset-card">
        <h1 className="reset-title">Reset Password</h1>
        <p className="reset-subtitle">
          Enter a new password for your account. We\'ll sign you in with the updated credentials.
        </p>

        {!isReady && !error && (
          <div className="reset-helper">
            Verifying your reset link&hellip;
          </div>
        )}

        {error && <div className="reset-error">{error}</div>}
        {success && <div className="reset-success">{success}</div>}

        <form onSubmit={handleSubmit} className="reset-form">
          <label className="reset-label" htmlFor="new-password">New password</label>
          <input
            type="password"
            id="new-password"
            className="reset-input"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="Enter a new password"
            disabled={isSubmitting}
            minLength={6}
            required
          />

          <label className="reset-label" htmlFor="confirm-password">Confirm password</label>
          <input
            type="password"
            id="confirm-password"
            className="reset-input"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Re-enter the new password"
            disabled={isSubmitting}
            minLength={6}
            required
          />

          <button
            type="submit"
            className="reset-submit"
            disabled={isSubmitting || !isReady}
          >
            {isSubmitting ? 'Updating…' : 'Update Password'}
          </button>
        </form>

        <button
          type="button"
          className="reset-back"
          onClick={() => navigate('/')}
        >
          Back to Serin
        </button>
      </div>
    </div>
  )
}

export default ResetPassword
