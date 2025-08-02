import { useNavigate } from 'react-router-dom'
import './SettingsPopup.css'

function SettingsPopup({ isVisible, onClose }) {
  const navigate = useNavigate()

  if (!isVisible) return null

  const handlePrivacyClick = () => {
    onClose()
    navigate('/privacy')
  }

  return (
    <div className="settings-popup-overlay" onClick={onClose}>
      <div className="settings-popup" onClick={(e) => e.stopPropagation()}>
        <div className="settings-popup-header">
          <button className="settings-popup-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="settings-popup-content">
          <h2 className="settings-title">Settings</h2>
          
          <div className="settings-list">
            <div className="settings-item">
              <div className="settings-item-content">
                <div className="settings-icon language-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
                <div className="settings-text">
                  <div className="settings-main-text">Language</div>
                  <div className="settings-sub-text">Choose your preferred language</div>
                </div>
              </div>
              <div className="settings-arrow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 18l6-6-6-6" stroke="#FFEB5B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            <div className="settings-item" onClick={handlePrivacyClick}>
              <div className="settings-item-content">
                <div className="settings-icon privacy-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="16" r="1" fill="currentColor"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
                <div className="settings-text">
                  <div className="settings-main-text">Privacy & Data</div>
                  <div className="settings-sub-text">Understand what we store and how we protect your privacy</div>
                </div>
              </div>
              <div className="settings-arrow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 18l6-6-6-6" stroke="#FFEB5B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            <div className="settings-item">
              <div className="settings-item-content">
                <div className="settings-icon contact-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2"/>
                    <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
                <div className="settings-text">
                  <div className="settings-main-text">Contact Us</div>
                </div>
              </div>
              <div className="settings-arrow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 18l6-6-6-6" stroke="#FFEB5B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPopup