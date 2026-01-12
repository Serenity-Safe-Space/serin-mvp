import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { useLanguage } from './contexts/LanguageContext'
import DeleteAccountModal from './DeleteAccountModal'
import './EditProfilePopup.css'

function EditProfilePopup({ isVisible, onClose }) {
  const navigate = useNavigate()
  const { user, updateUserProfile } = useAuth()
  const { t, language } = useLanguage()

  // Form state
  const [displayName, setDisplayName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [pronouns, setPronouns] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false)

  // Load initial data when visible
  useEffect(() => {
    if (isVisible && user) {
      setDisplayName(user.user_metadata?.full_name || '')
      setPhoneNumber(user.user_metadata?.phone || '')
      setDateOfBirth(user.user_metadata?.date_of_birth || '')
      setPronouns(user.user_metadata?.pronouns || '')
    }
  }, [isVisible, user])

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

  const handleSave = async () => {
    if (isSaving) return

    setIsSaving(true)
    try {
      await updateUserProfile({
        full_name: displayName.trim(),
        phone: phoneNumber.trim(),
        date_of_birth: dateOfBirth,
        pronouns: pronouns.trim()
      })
      handleClose()
    } catch (error) {
      console.error('Failed to update profile:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = () => {
    handleClose()
    setTimeout(() => navigate('/reset-password'), 300)
  }

  const handleDeleteAccount = () => {
    setIsDeleteModalVisible(true)
  }

  const handleChangePhoto = () => {
    // Photo upload not implemented yet
    console.info('Change photo - coming soon')
  }

  // Get avatar initial
  const getAvatarInitial = () => {
    if (displayName) {
      return displayName.charAt(0).toUpperCase()
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase()
    }
    return '?'
  }

  // Check if name is valid
  const isNameValid = displayName.trim().length >= 2

  // Labels
  const labels = {
    title: language === 'en' ? 'Edit Profile' : 'Modifier le profil',
    save: language === 'en' ? 'Save' : 'Enregistrer',
    changePhoto: language === 'en' ? 'Change Photo' : 'Changer la photo',
    name: language === 'en' ? 'Name' : 'Nom',
    privateInfo: language === 'en' ? 'Private Information' : 'Informations privées',
    email: language === 'en' ? 'Email' : 'E-mail',
    phone: language === 'en' ? 'Phone Number' : 'Numéro de téléphone',
    dateOfBirth: language === 'en' ? 'Date of Birth' : 'Date de naissance',
    pronouns: language === 'en' ? 'Gender / Pronouns' : 'Genre / Pronoms',
    accountInfo: language === 'en' ? 'Account Information' : 'Informations du compte',
    changePassword: language === 'en' ? 'Change Password' : 'Changer le mot de passe',
    deleteAccount: language === 'en' ? 'Delete Account' : 'Supprimer le compte'
  }

  return (
    <>
      <div className={`edit-profile-overlay ${isClosing ? 'closing' : ''}`}>
        {/* Header */}
        <div className="edit-profile-header">
          <button className="edit-profile-back-btn" onClick={handleClose} aria-label="Go back">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h1 className="edit-profile-title">{labels.title}</h1>
          <button
            className="edit-profile-save-btn"
            onClick={handleSave}
            disabled={isSaving || !isNameValid}
          >
            {isSaving ? '...' : labels.save}
          </button>
        </div>

        {/* Content */}
        <div className="edit-profile-content">
          {/* Avatar Section */}
          <div className="edit-profile-avatar-section">
            <div className="edit-profile-avatar-wrapper">
              <div className="edit-profile-avatar">
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Profile" />
                ) : (
                  getAvatarInitial()
                )}
              </div>
              <div className="edit-profile-avatar-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <button className="edit-profile-change-photo" onClick={handleChangePhoto}>
              {labels.changePhoto}
            </button>
          </div>

          {/* Name Field */}
          <div className="edit-profile-name-field">
            <label className="edit-profile-field-label">{labels.name}</label>
            <div className="edit-profile-field-input-wrapper">
              <input
                type="text"
                className="edit-profile-field-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={language === 'en' ? 'Enter your name' : 'Entrez votre nom'}
                maxLength={60}
              />
              <div className={`edit-profile-field-validation ${isNameValid ? '' : 'hidden'}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Private Information Section */}
          <div className="edit-profile-section">
            <h3 className="edit-profile-section-title">{labels.privateInfo}</h3>

            {/* Email (read-only) */}
            <div className="edit-profile-field">
              <label className="edit-profile-field-label">{labels.email}</label>
              <div className="edit-profile-field-input-wrapper">
                <div className="edit-profile-field-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <input
                  type="email"
                  className="edit-profile-field-input"
                  value={user?.email || ''}
                  disabled
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="edit-profile-field">
              <label className="edit-profile-field-label">{labels.phone}</label>
              <div className="edit-profile-field-input-wrapper">
                <div className="edit-profile-field-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <input
                  type="tel"
                  className="edit-profile-field-input"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder={language === 'en' ? '+1 (555) 123-4567' : '+33 6 12 34 56 78'}
                />
              </div>
            </div>

            {/* Date of Birth */}
            <div className="edit-profile-field">
              <label className="edit-profile-field-label">{labels.dateOfBirth}</label>
              <div className="edit-profile-field-input-wrapper">
                <div className="edit-profile-field-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <input
                  type="date"
                  className="edit-profile-field-input"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>
            </div>

            {/* Gender / Pronouns */}
            <div className="edit-profile-field">
              <label className="edit-profile-field-label">{labels.pronouns}</label>
              <div className="edit-profile-field-input-wrapper">
                <div className="edit-profile-field-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <input
                  type="text"
                  className="edit-profile-field-input"
                  value={pronouns}
                  onChange={(e) => setPronouns(e.target.value)}
                  placeholder={language === 'en' ? 'She/Her, He/Him, They/Them' : 'Elle, Il, Iel'}
                />
              </div>
            </div>
          </div>

          {/* Account Information Section */}
          <div className="edit-profile-section">
            <h3 className="edit-profile-section-title">{labels.accountInfo}</h3>

            <div className="edit-profile-nav-section">
              <button className="edit-profile-nav-row" onClick={handleChangePassword}>
                <div className="edit-profile-nav-icon purple">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="#3C2A73" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#3C2A73" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="edit-profile-nav-label">{labels.changePassword}</span>
                <span className="edit-profile-nav-chevron">›</span>
              </button>

              <button className="edit-profile-nav-row" onClick={handleDeleteAccount}>
                <div className="edit-profile-nav-icon red">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="#E57373" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="edit-profile-nav-label danger">{labels.deleteAccount}</span>
                <span className="edit-profile-nav-chevron">›</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      <DeleteAccountModal
        isVisible={isDeleteModalVisible}
        onClose={() => setIsDeleteModalVisible(false)}
      />
    </>
  )
}

export default EditProfilePopup
