import { useAuth } from './contexts/AuthContext'
import './ProfilePopup.css'

function ProfilePopup({ isVisible, onClose, onSignInClick }) {
  const { user, signOut } = useAuth()
  if (!isVisible) return null

  return (
    <div className="profile-popup-overlay" onClick={onClose}>
      <div className="profile-popup" onClick={(e) => e.stopPropagation()}>
        <div className="profile-popup-header">
          <h2 className="profile-popup-title">Your Profile</h2>
          <button className="profile-popup-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="profile-popup-content">
          {user ? (
            <>
              <div className="profile-avatar">
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="white"/>
                </svg>
              </div>

              <h3 className="profile-name">{user.email}</h3>
              <p className="profile-subtitle">Wellbeing Journey Member</p>

              <div className="profile-stats">
                <div className="stat-item">
                  <div className="stat-icon blue">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                      <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
                      <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/>
                      <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </div>
                  <div className="stat-number">4</div>
                  <div className="stat-label">Days Active</div>
                </div>

                <div className="stat-item">
                  <div className="stat-icon green">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2" fill="none"/>
                    </svg>
                  </div>
                  <div className="stat-number">38</div>
                  <div className="stat-label">Check-ins</div>
                </div>

                <div className="stat-item">
                  <div className="stat-icon yellow">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="stat-number">4</div>
                  <div className="stat-label">Achievements</div>
                </div>
              </div>

              <button className="chat-history-btn">Chat History</button>
              
              <button className="instagram-btn">Instagram</button>

              <div className="profile-footer">
                <button className="footer-btn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="2" fill="none"/>
                  </svg>
                  Settings
                </button>
                <button className="footer-btn" onClick={() => signOut()}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17L21 12L16 7M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Sign Out
                </button>
                <button className="footer-btn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" fill="none"/>
                  </svg>
                  Contact Us
                </button>
              </div>
            </>
          ) : (
            <div className="signed-out-content">
              <div className="signed-out-message">
                <h3 className="signed-out-title">You're not signed in</h3>
                <p className="signed-out-subtitle">Sign in to track your wellbeing journey and access your personalized experience</p>
              </div>
              <button className="sign-in-btn" onClick={onSignInClick}>
                Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProfilePopup