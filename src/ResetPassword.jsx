import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useLanguage } from './contexts/LanguageContext'
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
  const { t } = useLanguage()

  useEffect(() => {
    let isMounted = true

    const verifySession = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (!isMounted) return

      if (error) {
        setError(t('resetPassword.errors.verify'))
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
  }, [t])

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
      setError(t('resetPassword.errors.length'))
      return
    }

    if (newPassword !== confirmPassword) {
      setError(t('resetPassword.errors.mismatch'))
      return
    }

    if (!isReady) {
      setError(t('resetPassword.errors.inactive'))
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })

      if (error) {
        setError(error.message)
        return
      }

      setSuccess(t('resetPassword.success'))
      setNewPassword('')
      setConfirmPassword('')
      redirectTimeoutRef.current = setTimeout(() => navigate('/'), 1500)
    } catch (err) {
      setError(err.message || t('resetPassword.errors.update'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="reset-password-page">
      <div className="reset-card">
        <h1 className="reset-title">{t('resetPassword.title')}</h1>
        <p className="reset-subtitle">
          {t('resetPassword.subtitle')}
        </p>

        {!isReady && !error && (
          <div className="reset-helper">
            {t('resetPassword.verifying')}
          </div>
        )}

        {error && <div className="reset-error">{error}</div>}
        {success && <div className="reset-success">{success}</div>}

        <form onSubmit={handleSubmit} className="reset-form">
          <label className="reset-label" htmlFor="new-password">{t('resetPassword.form.newPasswordLabel')}</label>
          <input
            type="password"
            id="new-password"
            className="reset-input"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder={t('resetPassword.form.newPasswordPlaceholder')}
            disabled={isSubmitting}
            minLength={6}
            required
          />

          <label className="reset-label" htmlFor="confirm-password">{t('resetPassword.form.confirmPasswordLabel')}</label>
          <input
            type="password"
            id="confirm-password"
            className="reset-input"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder={t('resetPassword.form.confirmPasswordPlaceholder')}
            disabled={isSubmitting}
            minLength={6}
            required
          />

          <button
            type="submit"
            className="reset-submit"
            disabled={isSubmitting || !isReady}
          >
            {isSubmitting ? t('resetPassword.buttons.submitLoading') : t('resetPassword.buttons.submitIdle')}
          </button>
        </form>

        <button
          type="button"
          className="reset-back"
          onClick={() => navigate('/')}
        >
          {t('resetPassword.buttons.back')}
        </button>
      </div>
    </div>
  )
}

export default ResetPassword
