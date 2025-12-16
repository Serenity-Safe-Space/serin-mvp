import { useState, useEffect } from 'react'
import { useAuth } from './contexts/AuthContext'
import { useLanguage } from './contexts/LanguageContext'
import { usePremium } from './contexts/PremiumContext'
import { getCurrentStreak } from './lib/activityService'
import { SERIN_COLORS } from './utils/serinColors'
import './ProfilePopup.css'

function ProfilePopup({ isVisible, onClose, onSignInClick, onChatHistoryClick, onSettingsClick,
  onAdminDashboardClick,
  onProgressClick
}) {
  const { user, adminRole } = useAuth()
  const { coinBalance, loading: loadingCoins } = usePremium()
  const [currentStreak, setCurrentStreak] = useState(0)
  const [loadingActivity, setLoadingActivity] = useState(false)
  const { t } = useLanguage()

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
      const { count } = await getCurrentStreak(user.id)
      setCurrentStreak(count)
    } catch (error) {
      console.warn('Failed to load user activity:', error)
      setCurrentStreak(0)
    } finally {
      setLoadingActivity(false)
    }
  }

  if (!isVisible) return null

  const firstName =
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    t('profile.friendFallback')

  const streakValue = loadingActivity ? '...' : currentStreak

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
          <button className="profile-popup-close" onClick={onClose} aria-label="Close menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="profile-popup-content">
          {user ? (
            <>
              <h2 className="profile-title">
                Your Progress
              </h2>

              <div className="profile-coin-section">
                <div className="profile-coin-icon-large">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" fill="currentColor" className="coin-bg" />
                    <path d="M12 6C13.6569 6 15 7.34315 15 9C15 10.6569 13.6569 12 12 12C10.3431 12 9 10.6569 9 9C9 7.34315 10.3431 6 12 6Z" fill="#B8860B" />
                    <path d="M12 18C14.2091 18 16 16.2091 16 14V13H8V14C8 16.2091 9.79086 18 12 18Z" fill="#B8860B" />
                  </svg>
                </div>
                <div className="profile-coin-text">
                  {loadingCoins ? '...' : coinBalance} coins earnt!
                </div>
                {onProgressClick && (
                  <button className="earn-coin-btn" onClick={onProgressClick}>
                    Earn more coin
                  </button>
                )}
              </div>

              <div className="profile-links-container">
                <button className="profile-link" onClick={onChatHistoryClick}>
                  <span>{t('profile.chatHistory')}</span>
                  <span className="profile-link-arrow">&gt;</span>
                </button>

                <button className="profile-link" onClick={onSettingsClick}>
                  <span>{t('profile.settings')}</span>
                  <span className="profile-link-arrow">&gt;</span>
                </button>

                {adminRole?.isAdmin && (
                  <button
                    className="profile-link profile-link--admin"
                    onClick={() => onAdminDashboardClick?.()}
                  >
                    <span>Admin Dashboard</span>
                    <span className="profile-link-arrow">&gt;</span>
                  </button>
                )}
              </div>

              <div className="privacy-footer">{t('profile.privacy')}</div>
            </>
          ) : (
            <div className="signed-out-content">
              <div className="signed-out-message">
                <h3 className="signed-out-title">
                  {t('profile.signedOutTitle')} <span aria-hidden="true">✨</span>
                </h3>
                <p className="signed-out-subtitle">
                  {t('profile.signedOutSubtitle')}
                </p>
              </div>
              <button className="sign-in-btn" onClick={onSignInClick}>
                {t('profile.signIn')}
              </button>
              <div className="privacy-footer" style={{ marginTop: 'auto' }}>{t('profile.privacy')}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProfilePopup
