import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { useLanguage } from './contexts/LanguageContext'
import './SettingsPopup.css'

// Toggle Switch Component
function ToggleSwitch({ checked, onChange }) {
  const handleClick = (e) => {
    e.stopPropagation()
    onChange(!checked)
  }

  return (
    <button
      className={`toggle-switch ${checked ? 'on' : ''}`}
      onClick={handleClick}
      type="button"
      role="switch"
      aria-checked={checked}
    >
      <span className="toggle-knob" />
    </button>
  )
}

// Settings Row Component
function SettingsRow({ icon, iconColor, label, subtitle, type, value, checked, onChange, onClick }) {
  const handleClick = () => {
    if (type === 'toggle') return
    if (onClick) onClick()
  }

  return (
    <button className="settings-row" onClick={handleClick} type="button">
      <div className={`settings-row-icon ${iconColor || 'purple'}`}>
        {icon}
      </div>
      <div className="settings-row-content">
        <span className="settings-row-label">{label}</span>
        {subtitle && <span className="settings-row-subtitle">{subtitle}</span>}
      </div>
      {type === 'nav' && <span className="settings-row-chevron">›</span>}
      {type === 'value' && (
        <>
          <span className="settings-row-value">{value}</span>
          <span className="settings-row-chevron">›</span>
        </>
      )}
      {type === 'toggle' && <ToggleSwitch checked={checked} onChange={onChange} />}
    </button>
  )
}

// Settings Section Component
function SettingsSection({ title, children }) {
  return (
    <div className="settings-section">
      <h3 className="settings-section-title">{title}</h3>
      <div className="settings-section-items">
        {children}
      </div>
    </div>
  )
}

function SettingsPopup({ isVisible, onClose, onEditProfile }) {
  const navigate = useNavigate()
  const { signOut, user } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const [isClosing, setIsClosing] = useState(false)
  const [dailyReminders, setDailyReminders] = useState(true)
  const [soundEffects, setSoundEffects] = useState(false)

  // Reset state when popup closes
  useEffect(() => {
    if (!isVisible) {
      setIsClosing(false)
    }
  }, [isVisible])

  if (!isVisible) return null

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 250)
  }

  const handleEditProfile = () => {
    if (onEditProfile) {
      // Don't close Settings - let Edit Profile slide on top
      onEditProfile()
    }
  }

  const handleChangePassword = () => {
    handleClose()
    setTimeout(() => navigate('/reset-password'), 300)
  }

  const handleTheme = () => {
    console.info('Theme selection - coming soon')
  }

  const handleLanguage = () => {
    // Toggle language for now
    setLanguage(language === 'en' ? 'fr' : 'en')
  }

  const handleHelpCenter = () => {
    console.info('Help center - coming soon')
  }

  const handlePrivacy = () => {
    handleClose()
    setTimeout(() => navigate('/privacy'), 300)
  }

  const handleSignOut = async () => {
    try {
      const { error } = await signOut()
      if (error) {
        console.error('Error signing out:', error)
      } else {
        handleClose()
      }
    } catch (error) {
      console.error('Unexpected error during sign out:', error)
    }
  }

  // Get display values
  const languageDisplay = language === 'en' ? 'English' : 'Français'
  const themeDisplay = language === 'en' ? 'Light Mode' : 'Mode clair'
  const profileSubtitle = language === 'en' ? 'Lvl 1 • Beginner' : 'Niv 1 • Débutant'

  return (
    <div className={`settings-overlay ${isClosing ? 'closing' : ''}`}>
      {/* Header */}
      <div className="settings-header">
        <button className="settings-back-btn" onClick={handleClose} aria-label="Go back">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="settings-title">{t('settings.title')}</h1>
      </div>

      {/* Content */}
      <div className="settings-content">
        {/* Account Section */}
        <SettingsSection title={language === 'en' ? 'ACCOUNT' : 'COMPTE'}>
          <SettingsRow
            icon="👤"
            iconColor="purple"
            label={language === 'en' ? 'Edit Profile' : 'Modifier le profil'}
            subtitle={profileSubtitle}
            type="nav"
            onClick={handleEditProfile}
          />
          <SettingsRow
            icon="🔒"
            iconColor="blue"
            label={t('settings.changePassword')}
            type="nav"
            onClick={handleChangePassword}
          />
        </SettingsSection>

        {/* Notifications Section */}
        <SettingsSection title={language === 'en' ? 'NOTIFICATIONS' : 'NOTIFICATIONS'}>
          <SettingsRow
            icon="🔔"
            iconColor="orange"
            label={language === 'en' ? 'Daily Reminders' : 'Rappels quotidiens'}
            subtitle={language === 'en' ? 'Keep your streak going' : 'Maintenez votre série'}
            type="toggle"
            checked={dailyReminders}
            onChange={setDailyReminders}
          />
          <SettingsRow
            icon="🔊"
            iconColor="green"
            label={language === 'en' ? 'Sound Effects' : 'Effets sonores'}
            type="toggle"
            checked={soundEffects}
            onChange={setSoundEffects}
          />
        </SettingsSection>

        {/* General Section */}
        <SettingsSection title={language === 'en' ? 'GENERAL' : 'GÉNÉRAL'}>
          <SettingsRow
            icon="🎨"
            iconColor="pink"
            label={language === 'en' ? 'Theme' : 'Thème'}
            type="value"
            value={themeDisplay}
            onClick={handleTheme}
          />
          <SettingsRow
            icon="🌐"
            iconColor="blue"
            label={t('settings.language')}
            type="value"
            value={languageDisplay}
            onClick={handleLanguage}
          />
        </SettingsSection>

        {/* Support Section */}
        <SettingsSection title={language === 'en' ? 'SUPPORT' : 'SUPPORT'}>
          <SettingsRow
            icon="❓"
            iconColor="purple"
            label={language === 'en' ? 'Help Center' : 'Centre d\'aide'}
            type="nav"
            onClick={handleHelpCenter}
          />
          <SettingsRow
            icon="🔐"
            iconColor="green"
            label={t('settings.privacy')}
            type="nav"
            onClick={handlePrivacy}
          />
        </SettingsSection>
      </div>

      {/* Footer */}
      <div className="settings-footer">
        <button className="settings-logout-btn" onClick={handleSignOut}>
          {t('settings.signOut')}
        </button>
        <p className="settings-version">Serin v1.0.0</p>
      </div>
    </div>
  )
}

export default SettingsPopup
