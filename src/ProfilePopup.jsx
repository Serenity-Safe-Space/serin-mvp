import { useState, useEffect } from 'react'
import { useAuth } from './contexts/AuthContext'
import { getDaysActive } from './lib/activityService'
import { SERIN_COLORS } from './utils/serinColors'
import './ProfilePopup.css'

function ProfilePopup({ isVisible, onClose, onSignInClick, onChatHistoryClick, onSettingsClick }) {
  const { user } = useAuth()
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

  if (!isVisible) return null

  const firstName =
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'friend'

  const streakValue = loadingActivity ? '...' : daysActive

  return (
    <div className="profile-popup-overlay" onClick={onClose}>
      <div
        className="profile-popup"
        onClick={(e) => e.stopPropagation()}
        style={{
          '--profile-color-surface': SERIN_COLORS.DEEP_SERIN_PURPLE.hex,
          '--profile-color-primary-text': SERIN_COLORS.COOL_WHITE.hex,
          '--profile-color-secondary-text': SERIN_COLORS.LILAC_GRAY.hex,
          '--profile-color-accent': SERIN_COLORS.SUNBEAM_YELLOW.hex,
          '--profile-color-outline': `${SERIN_COLORS.SOFT_VIOLET.hex}80`,
          '--profile-color-accent-text': SERIN_COLORS.DEEP_SERIN_PURPLE.hex,
        }}
      >
        <div className="profile-popup-header">
          <button className="profile-popup-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="profile-popup-content">
          {user ? (
            <>
              <h3 className="profile-encouragement">
                Keep going, {firstName}, you got this <span aria-hidden="true">✨</span>
              </h3>

              <div className="profile-streak" role="status" aria-live="polite">
                <span className="profile-streak-icon" role="img" aria-label="llama">
                  🦙
                </span>
                <span className="profile-streak-value">{streakValue}</span>
                <span className="profile-streak-label">Streak</span>
              </div>

              <button className="profile-action profile-action--primary" onClick={onChatHistoryClick}>
                Chat history
              </button>

              <button className="profile-action profile-action--secondary" onClick={onSettingsClick}>
                Settings
              </button>

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
