import { useState, useEffect } from 'react'
import { useAuth } from './contexts/AuthContext'
import { useLanguage } from './contexts/LanguageContext'
import { usePremium } from './contexts/PremiumContext'
import { getCurrentStreak } from './lib/activityService'
import { SERIN_COLORS } from './utils/serinColors'
import './ProfilePopup.css'

// Placeholder friend avatars for demo
const DEMO_FRIENDS = [
  { id: 1, name: 'Alex', avatar: null, hasCoins: true },
  { id: 2, name: 'Jordan', avatar: null, hasStreak: true },
  { id: 3, name: 'Sam', avatar: null, hasCoins: true },
  { id: 4, name: 'Taylor', avatar: null, hasStreak: true },
  { id: 5, name: 'Casey', avatar: null, hasCoins: true },
]

function ProfilePopup({
  isVisible,
  onClose,
  onSignInClick,
  onChatHistoryClick,
  onSettingsClick,
  onAdminDashboardClick,
  onProgressClick,
  onStreakClick
}) {
  const { user, adminRole } = useAuth()
  const { coinBalance, loading: loadingCoins } = usePremium()
  const [currentStreak, setCurrentStreak] = useState(0)
  const [loadingActivity, setLoadingActivity] = useState(false)
  const [showInviteToast, setShowInviteToast] = useState(false)
  const { t } = useLanguage()

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

  const handleInviteClick = () => {
    setShowInviteToast(true)
    setTimeout(() => setShowInviteToast(false), 2000)
  }

  if (!isVisible) return null

  const firstName =
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'Friend'

  const streakValue = loadingActivity ? '...' : currentStreak
  const coinValue = loadingCoins ? '...' : coinBalance

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
        {/* Close button */}
        <button className="profile-popup-close" onClick={onClose} aria-label="Close menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        <div className="profile-popup-content">
          {user ? (
            <>
              {/* Avatar Section */}
              <div className="profile-avatar-section">
                <div className="profile-avatar-circle">
                  <img src="/serin-llama.png" alt="Profile" className="profile-avatar-img" />
                </div>
                <h2 className="profile-name">{firstName}</h2>
                <p className="profile-status">Still here ✨</p>
              </div>

              {/* Stats Row */}
              <div className="profile-stats-row">
                <button className="profile-stat" onClick={onProgressClick}>
                  <svg className="profile-stat-icon coin" width="24" height="24" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" fill="#FFD700" stroke="#DAA520" strokeWidth="1.5"/>
                    <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#B8860B">S</text>
                  </svg>
                  <span className="profile-stat-value">{coinValue}</span>
                </button>
                <div className="profile-stat-divider"></div>
                <button className="profile-stat" onClick={onStreakClick}>
                  <span className="profile-stat-icon fire">🔥</span>
                  <span className="profile-stat-value">{streakValue}</span>
                </button>
              </div>

              {/* Invite Button */}
              <button className="invite-btn" onClick={handleInviteClick}>
                Invite a friend
              </button>

              {/* Friends Progress Section */}
              <div className="friends-section">
                <h3 className="friends-title">Friends progress</h3>
                <div className="friends-scroll">
                  {DEMO_FRIENDS.map((friend) => (
                    <div key={friend.id} className="friend-avatar-wrapper">
                      <div className="friend-avatar">
                        <span className="friend-initial">{friend.name[0]}</span>
                      </div>
                      {friend.hasCoins && (
                        <span className="friend-badge coin-badge">🪙</span>
                      )}
                      {friend.hasStreak && (
                        <span className="friend-badge streak-badge">🔥</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Menu Items */}
              <div className="profile-menu">
                <button className="profile-menu-item" onClick={onChatHistoryClick}>
                  <svg className="menu-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="currentColor"/>
                  </svg>
                  <span className="menu-label">{t('profile.chatHistory')}</span>
                  <span className="menu-arrow">&gt;</span>
                </button>

                <button className="profile-menu-item" onClick={onSettingsClick}>
                  <svg className="menu-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" fill="currentColor"/>
                  </svg>
                  <span className="menu-label">{t('profile.settings')}</span>
                  <span className="menu-arrow">&gt;</span>
                </button>

                {adminRole?.isAdmin && (
                  <button className="profile-menu-item" onClick={() => onAdminDashboardClick?.()}>
                    <svg className="menu-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" fill="currentColor"/>
                    </svg>
                    <span className="menu-label">Admin Dashboard</span>
                    <span className="menu-arrow">&gt;</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="signed-out-content">
              <div className="profile-avatar-section">
                <div className="profile-avatar-circle">
                  <img src="/serin-llama.png" alt="Serin" className="profile-avatar-img" />
                </div>
              </div>
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

        {/* Toast notification */}
        {showInviteToast && (
          <div className="invite-toast">
            Coming soon!
          </div>
        )}
      </div>
    </div>
  )
}

export default ProfilePopup
