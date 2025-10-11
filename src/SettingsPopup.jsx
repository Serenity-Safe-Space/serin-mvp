import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { SERIN_COLORS } from './utils/serinColors'
import './SettingsPopup.css'

function SettingsPopup({ isVisible, onClose }) {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [selectedLanguage, setSelectedLanguage] = useState('EN')

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

  const handleLanguageSelect = (languageCode) => {
    setSelectedLanguage(languageCode)
  }

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
          <button className="settings-popup-close" onClick={onClose} aria-label="Close settings">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="settings-popup-content">
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
            <h2 className="settings-title">Settings</h2>
          </div>

          <div className="settings-panel">
            <button type="button" className="settings-row" onClick={handleChangePasswordClick}>
              Change password
            </button>

            <div className="settings-divider" aria-hidden="true" />

            <div className="settings-row settings-row--language">
              <span className="settings-row-label">Language</span>
              <div className="settings-language-toggle" role="group" aria-label="Language selection">
                <button
                  type="button"
                  className={`settings-language-button${selectedLanguage === 'EN' ? ' is-active' : ''}`}
                  onClick={() => handleLanguageSelect('EN')}
                  aria-pressed={selectedLanguage === 'EN'}
                >
                  EN
                </button>
                <span className="settings-language-separator" aria-hidden="true">|</span>
                <button
                  type="button"
                  className={`settings-language-button${selectedLanguage === 'FR' ? ' is-active' : ''}`}
                  onClick={() => handleLanguageSelect('FR')}
                  aria-pressed={selectedLanguage === 'FR'}
                >
                  FR
                </button>
              </div>
            </div>

            <div className="settings-divider" aria-hidden="true" />

            <button type="button" className="settings-row" onClick={handlePrivacyClick}>
              How we use your data
            </button>
          </div>

          <button type="button" className="settings-signout" onClick={handleSignOut}>
            Sign out
          </button>

          <button type="button" className="settings-delete" onClick={handleDeleteAccount}>
            Delete account
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsPopup
