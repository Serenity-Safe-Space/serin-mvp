import { useState, useEffect } from 'react'
import { useAuth } from './contexts/AuthContext'
import { useLanguage } from './contexts/LanguageContext'
import { getCurrentStreak } from './lib/activityService'
import { SERIN_COLORS } from './utils/serinColors'
import CoinBalance from './components/CoinBalance'
import './ProfilePopup.css'

function ProfilePopup({ isVisible, onClose, onSignInClick, onChatHistoryClick, onSettingsClick,
  onAdminDashboardClick,
  onProgressClick
}) {
  const { user, adminRole } = useAuth()
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
          <button className="profile-popup-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="profile-popup-content">
          {user ? (
            <>
              <h3 className="profile-encouragement">
                {t('profile.encouragement', { name: firstName })}
                <span aria-hidden="true">✨</span>
              </h3>

              <div className="profile-streak" role="status" aria-live="polite">
                <span className="profile-streak-icon" role="img" aria-label="llama">
                  🦙
                </span>
                <span className="profile-streak-value">{streakValue}</span>
                <span className="profile-streak-label">{t('profile.streakLabel')}</span>
              </div>

              <div className="profile-coins-wrapper">
                <CoinBalance size="medium" />
              </div>

              <button className="profile-action profile-action--primary" onClick={onChatHistoryClick}>
                {t('profile.chatHistory')}
              </button>

              <button className="profile-action profile-action--secondary" onClick={onSettingsClick}>
                {t('profile.settings')}
              </button>

              {user && (
                <button
                  className="profile-action profile-action--secondary"
                  onClick={onProgressClick}
                >
                  <div className="menu-icon-wrapper progress-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M12 20V10M18 20V4M6 20v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span>{t('profile.myProgress') || 'My Progress'}</span>
                </button>
              )}

              {adminRole?.isAdmin && (
                <button
                  className="profile-action profile-action--admin"
                  onClick={() => onAdminDashboardClick?.()}
                >
                  Admin Dashboard
                </button>
              )}

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
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProfilePopup
