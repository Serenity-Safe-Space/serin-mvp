import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { useLanguage } from './contexts/LanguageContext'
import { SERIN_COLORS } from './utils/serinColors'
import './SettingsPopup.css'

const sanitizeDisplayName = (value = '') => value.replace(/\s+/g, ' ').trim()

const createEmojiRegex = () => {
  try {
    return new RegExp('\\p{Extended_Pictographic}', 'u')
  } catch (error) {
    return null
  }
}

const EMOJI_REGEX = createEmojiRegex()
const SURROGATE_PAIR_EMOJI_REGEX = /[\uD83C-\uDBFF][\uDC00-\uDFFF]/

const containsEmoji = (value = '') => {
  if (!value) return false
  if (EMOJI_REGEX) {
    return EMOJI_REGEX.test(value)
  }
  return SURROGATE_PAIR_EMOJI_REGEX.test(value)
}

const getAvatarInitial = (name, email) => {
  const sanitizedName = sanitizeDisplayName(name)
  if (sanitizedName) {
    return sanitizedName.charAt(0).toUpperCase()
  }

  const fallback = (email ?? '').trim()
  if (fallback) {
    return fallback.charAt(0).toUpperCase()
  }

  return '?'
}

const getValidationMessage = (value, t) => {
  const sanitized = sanitizeDisplayName(value)

  if (!sanitized || sanitized.length < 2 || sanitized.length > 60) {
    return t('settings.displayNameErrorLength')
  }

  if (containsEmoji(sanitized)) {
    return t('settings.displayNameErrorEmoji')
  }

  return ''
}

function SettingsPopup({ isVisible, onClose }) {
  const navigate = useNavigate()
  const { signOut, updateUserProfile, user } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const [displayName, setDisplayName] = useState('')
  const [initialName, setInitialName] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isVisible) {
      const currentName = user?.user_metadata?.full_name ?? ''
      setDisplayName(currentName)
      setInitialName(currentName)
      setError('')
      setSuccessMessage('')
      setIsSaving(false)
    }
  }, [isVisible, user])

  if (!isVisible) return null

  const handlePrivacyClick = () => {
    onClose()
    navigate('/privacy')
  }

  const handleChangePasswordClick = () => {
    onClose()
    navigate('/reset-password')
  }

  const handleSignOut = async () => {
    try {
      const { error } = await signOut()
      if (error) {
        console.error('Error signing out:', error)
      } else {
        onClose()
      }
    } catch (error) {
      console.error('Unexpected error during sign out:', error)
    }
  }

  const handleDeleteAccount = () => {
    console.info('Delete account flow not implemented yet.')
  }

  const handleDisplayNameChange = (event) => {
    setDisplayName(event.target.value)
    if (error) {
      setError('')
    }
    if (successMessage) {
      setSuccessMessage('')
    }
  }

  const handleDisplayNameBlur = () => {
    const sanitized = sanitizeDisplayName(displayName)
    setDisplayName(sanitized)
    const validationMessage = getValidationMessage(sanitized, t)
    setError(validationMessage)
  }

  const handleProfileSubmit = async (event) => {
    event.preventDefault()

    if (!user) {
      return
    }

    const sanitized = sanitizeDisplayName(displayName)
    const validationMessage = getValidationMessage(sanitized, t)

    if (validationMessage) {
      setDisplayName(sanitized)
      setError(validationMessage)
      setSuccessMessage('')
      return
    }

    const sanitizedInitialName = sanitizeDisplayName(initialName)
    if (sanitized === sanitizedInitialName) {
      setDisplayName(sanitized)
      setError('')
      return
    }

    setIsSaving(true)

    try {
      const { error: updateError } = await updateUserProfile({ full_name: sanitized })
      if (updateError) {
        setError(t('settings.displayNameErrorGeneric'))
        setSuccessMessage('')
        return
      }

      setInitialName(sanitized)
      setDisplayName(sanitized)
      setError('')
      setSuccessMessage(t('settings.displayNameSuccess'))
    } catch (caughtError) {
      console.error('Failed to update profile name:', caughtError)
      setError(t('settings.displayNameErrorGeneric'))
      setSuccessMessage('')
    } finally {
      setIsSaving(false)
    }
  }

  const currentValidationMessage = getValidationMessage(displayName, t)
  const sanitizedCurrentName = sanitizeDisplayName(displayName)
  const sanitizedInitialName = sanitizeDisplayName(initialName)
  const isDirty = sanitizedCurrentName !== sanitizedInitialName
  const canSaveName = Boolean(user) && isDirty && !currentValidationMessage && !isSaving
  const avatarInitial = getAvatarInitial(displayName || initialName, user?.email)

  return (
    <div className="settings-popup-overlay" onClick={onClose}>
      <div
        className="settings-popup"
        onClick={(e) => e.stopPropagation()}
        style={{
          '--settings-color-surface': SERIN_COLORS.DEEP_SERIN_PURPLE.hex,
          '--settings-color-primary-text': SERIN_COLORS.COOL_WHITE.hex,
          '--settings-color-secondary-text': SERIN_COLORS.SOFT_VIOLET.hex,
          '--settings-color-divider': `${SERIN_COLORS.SOFT_VIOLET.hex}66`,
          '--settings-color-accent': SERIN_COLORS.SUNBEAM_YELLOW.hex,
          '--settings-color-accent-text': SERIN_COLORS.DEEP_SERIN_PURPLE.hex,
        }}
      >
        <div className="settings-popup-header">
          <button className="settings-popup-close" onClick={onClose} aria-label={t('settings.closeAria')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="settings-popup-content">
          {user && (
            <form className="settings-profile-card" onSubmit={handleProfileSubmit}>
              <div className="settings-profile-header">
                <div className="settings-profile-avatar" aria-hidden="true">
                  <span>{avatarInitial}</span>
                </div>
                <div className="settings-profile-meta">
                  <span className="settings-profile-label">{t('settings.profileLabel')}</span>
                  <span className="settings-profile-email">{user.email}</span>
                </div>
              </div>

              <label className="settings-field">
                <span className="settings-field-label">{t('settings.displayName')}</span>
                <input
                  type="text"
                  value={displayName}
                  onChange={handleDisplayNameChange}
                  onBlur={handleDisplayNameBlur}
                  maxLength={60}
                  autoComplete="name"
                  placeholder={t('settings.displayNamePlaceholder')}
                  className={`settings-field-input${error ? ' has-error' : ''}`}
                />
              </label>

              <p className={`settings-field-helper${error ? ' is-error' : ''}`}>
                {error || t('settings.displayNameHelper')}
              </p>

              <div className="settings-profile-actions">
                {successMessage && (
                  <span className="settings-profile-status" role="status">
                    {successMessage}
                  </span>
                )}
                <button
                  type="submit"
                  className="settings-profile-save"
                  disabled={!canSaveName}
                >
                  {isSaving ? t('settings.displayNameSaving') : t('settings.displayNameSave')}
                </button>
              </div>
            </form>
          )}

          <div className="settings-heading">
            <span className="settings-heading-icon" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" fill="currentColor" />
                <path
                  d="M20.74 13.05c.04-.35.06-.7.06-1.05 0-.35-.02-.7-.06-1.05l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a8.02 8.02 0 0 0-1.82-1.05l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54a7.97 7.97 0 0 0-1.82 1.05l-2.39-.96a.5.5 0 0 0-.6.22L1.1 8.73a.5.5 0 0 0 .12.64l2.03 1.58c-.04.34-.06.69-.06 1.05 0 .36.02.7.06 1.05L1.22 14.63a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.56.45 1.17.82 1.82 1.12l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54c.65-.3 1.26-.67 1.82-1.12l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <h2 className="settings-title">{t('settings.title')}</h2>
          </div>

          <div className="settings-panel">
            <button type="button" className="settings-row" onClick={handleChangePasswordClick}>
              {t('settings.changePassword')}
            </button>

            <div className="settings-divider" aria-hidden="true" />

            <div className="settings-row settings-row--language">
              <span className="settings-row-label">{t('settings.language')}</span>
              <div className="settings-language-toggle" role="group" aria-label={t('settings.languageAria')}>
                <button
                  type="button"
                  className={`settings-language-button${language === 'en' ? ' is-active' : ''}`}
                  onClick={() => setLanguage('en')}
                  aria-pressed={language === 'en'}
                >
                  EN
                </button>
                <span className="settings-language-separator" aria-hidden="true">|</span>
                <button
                  type="button"
                  className={`settings-language-button${language === 'fr' ? ' is-active' : ''}`}
                  onClick={() => setLanguage('fr')}
                  aria-pressed={language === 'fr'}
                >
                  FR
                </button>
              </div>
            </div>

            <div className="settings-divider" aria-hidden="true" />

            <button type="button" className="settings-row" onClick={handlePrivacyClick}>
              {t('settings.privacy')}
            </button>
          </div>

          <button type="button" className="settings-signout" onClick={handleSignOut}>
            {t('settings.signOut')}
          </button>

          <button type="button" className="settings-delete" onClick={handleDeleteAccount}>
            {t('settings.deleteAccount')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsPopup
