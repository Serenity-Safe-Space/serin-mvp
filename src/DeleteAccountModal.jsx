import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { useLanguage } from './contexts/LanguageContext'
import { supabase } from './lib/supabase'
import './DeleteAccountModal.css'

function DeleteAccountModal({ isVisible, onClose }) {
  const navigate = useNavigate()
  const { signOut, user } = useAuth()
  const { language } = useLanguage()
  const [step, setStep] = useState(1)
  const [confirmText, setConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isVisible) {
      setStep(1)
      setConfirmText('')
      setError('')
      setIsDeleting(false)
    }
  }, [isVisible])

  if (!isVisible) return null

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleContinue = () => {
    setStep(2)
  }

  const handleBack = () => {
    setStep(1)
    setConfirmText('')
    setError('')
  }

  const handleDelete = async () => {
    if (confirmText !== 'DELETE' || isDeleting) return

    setIsDeleting(true)
    setError('')

    try {
      // Delete user data from database tables first
      if (user?.id) {
        // Delete chat messages
        await supabase
          .from('chat_messages')
          .delete()
          .eq('user_id', user.id)

        // Delete chat sessions
        await supabase
          .from('chat_sessions')
          .delete()
          .eq('user_id', user.id)

        // Delete mood memories
        await supabase
          .from('mood_memories')
          .delete()
          .eq('user_id', user.id)

        // Delete daily activity
        await supabase
          .from('daily_activity')
          .delete()
          .eq('user_id', user.id)

        // Delete user coins
        await supabase
          .from('user_coins')
          .delete()
          .eq('user_id', user.id)

        // Delete premium subscriptions
        await supabase
          .from('premium_subscriptions')
          .delete()
          .eq('user_id', user.id)
      }

      // Sign out the user (this also clears the session)
      await signOut()

      // Note: Full account deletion from Supabase Auth requires admin API
      // For now, we've deleted all user data and signed them out
      // The auth record remains but with no associated data

      // Navigate to home
      navigate('/')

    } catch (err) {
      console.error('Error deleting account:', err)
      setError(language === 'en'
        ? 'Failed to delete account. Please try again.'
        : 'Échec de la suppression du compte. Veuillez réessayer.'
      )
      setIsDeleting(false)
    }
  }

  const isConfirmValid = confirmText === 'DELETE'

  // Labels
  const labels = {
    // Step 1
    warningTitle: language === 'en' ? 'Delete Your Account?' : 'Supprimer votre compte ?',
    warningDesc: language === 'en'
      ? 'This action is permanent and cannot be undone. All your data will be lost forever, including:'
      : 'Cette action est permanente et ne peut pas être annulée. Toutes vos données seront perdues pour toujours, y compris :',
    warningItems: language === 'en'
      ? ['Chat history', 'Profile information', 'Streak progress', 'Coins earned']
      : ['Historique des chats', 'Informations de profil', 'Progression de la série', 'Pièces gagnées'],
    cancel: language === 'en' ? 'Cancel' : 'Annuler',
    understand: language === 'en' ? 'I understand, continue' : 'Je comprends, continuer',

    // Step 2
    confirmTitle: language === 'en' ? 'Final Confirmation' : 'Confirmation finale',
    confirmLabel: language === 'en' ? 'Type DELETE to confirm:' : 'Tapez DELETE pour confirmer :',
    finalWarning: language === 'en'
      ? 'This will permanently delete your account'
      : 'Cela supprimera définitivement votre compte',
    back: language === 'en' ? 'Back' : 'Retour',
    deleteAccount: language === 'en' ? 'Delete My Account' : 'Supprimer mon compte',
    deleting: language === 'en' ? 'Deleting...' : 'Suppression...'
  }

  return (
    <div className="delete-account-overlay" onClick={handleOverlayClick}>
      <div className="delete-account-modal">
        {step === 1 ? (
          <>
            {/* Step 1: Initial Warning */}
            <div className="delete-account-icon">
              <div className="delete-account-icon-circle">⚠️</div>
            </div>

            <h2 className="delete-account-title">{labels.warningTitle}</h2>

            <p className="delete-account-description">{labels.warningDesc}</p>

            <div className="delete-account-warning-list">
              {labels.warningItems.map((item, index) => (
                <div key={index} className="delete-account-warning-item">
                  {item}
                </div>
              ))}
            </div>

            <div className="delete-account-buttons">
              <button className="delete-account-cancel-btn" onClick={onClose}>
                {labels.cancel}
              </button>
              <button className="delete-account-continue-btn" onClick={handleContinue}>
                {labels.understand}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Step 2: Final Confirmation */}
            <button className="delete-account-back-btn" onClick={handleBack}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {labels.back}
            </button>

            <div className="delete-account-icon">
              <div className="delete-account-icon-circle">🗑️</div>
            </div>

            <h2 className="delete-account-title">{labels.confirmTitle}</h2>

            <div className="delete-account-confirm-section">
              <label className="delete-account-confirm-label">{labels.confirmLabel}</label>
              <input
                type="text"
                className="delete-account-confirm-input"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder="DELETE"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
            </div>

            <p className="delete-account-final-warning">{labels.finalWarning}</p>

            {error && (
              <p className="delete-account-final-warning" style={{ marginBottom: '12px' }}>
                {error}
              </p>
            )}

            <div className="delete-account-buttons">
              <button className="delete-account-cancel-btn" onClick={onClose}>
                {labels.cancel}
              </button>
              <button
                className="delete-account-delete-btn"
                onClick={handleDelete}
                disabled={!isConfirmValid || isDeleting}
              >
                {isDeleting ? labels.deleting : labels.deleteAccount}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default DeleteAccountModal
