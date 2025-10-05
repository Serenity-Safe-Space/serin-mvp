import { useState, useEffect } from 'react'
import { useAuth } from './contexts/AuthContext'
import { getDaysActive } from './lib/activityService'
import './ProfilePopup.css'

function ProfilePopup({ isVisible, onClose, onSignInClick, onChatHistoryClick, onSettingsClick }) {
  const { user, signOut } = useAuth()
  const [daysActive, setDaysActive] = useState(0)
  const [loadingActivity, setLoadingActivity] = useState(false)

  // Load user activity data when popup opens and user is signed in
  useEffect(() => {
    if (isVisible && user) {
      loadUserActivity()
    }
  }, [isVisible, user])

  const loadUserActivity = async () => {
    if (!user) return

    setLoadingActivity(true)
    try {
      const { count } = await getDaysActive(user.id)
      // Ensure minimum of 1 if user is signed in (they're active today)
      setDaysActive(Math.max(count, 1))
    } catch (error) {
      console.warn('Failed to load user activity:', error)
      setDaysActive(1) // Fallback to 1 for signed-in users
    } finally {
      setLoadingActivity(false)
    }
  }

  const handleSignOut = async () => {
    try {
      const { error } = await signOut()
      if (error) {
        console.error('Error signing out:', error)
      } else {
        onClose() // Close popup after successful sign out
      }
    } catch (error) {
      console.error('Unexpected error during sign out:', error)
    }
  }

  if (!isVisible) return null

  return (
    <div className="profile-popup-overlay" onClick={onClose}>
      <div className="profile-popup" onClick={(e) => e.stopPropagation()}>
        <div className="profile-popup-header">
          <button className="profile-popup-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="profile-popup-content">
          {user ? (
            <>
              <h3 className="profile-name">
                Hey {user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'there'}, keep going you got this ✨
              </h3>

              <div className="profile-stats">
                <div className="stat-item">
                  <div className="stat-icon fire">
                    🔥
                  </div>
                  <div className="stat-number">
                    {loadingActivity ? '...' : daysActive}
                  </div>
                  <div className="stat-label">Days Active</div>
                </div>

                <div className="stat-item">
                  <div className="stat-icon arrow">
                    📈
                  </div>
                  <div className="stat-number">38</div>
                  <div className="stat-label">Check-ins</div>
                </div>
              </div>

              <button className="chat-history-btn" onClick={onChatHistoryClick}>Chat History</button>

              <button className="settings-btn" onClick={onSettingsClick}>Settings</button>

              <button className="sign-out-btn" onClick={handleSignOut}>Sign Out</button>

              <div className="privacy-footer">We keep it private.</div>
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