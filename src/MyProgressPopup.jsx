import { useEffect, useState } from 'react'
import { usePremium } from './contexts/PremiumContext'
import { useAuth } from './contexts/AuthContext'
import { useLanguage } from './contexts/LanguageContext'
import { getCoinTransactions, spendCoinsForPremium } from './lib/coinService'
import CelebrationModal from './components/CelebrationModal'
import './MyProgressPopup.css'

// Transaction Row Component
function TransactionRow({ icon, iconColor, title, time, amount }) {
  const isNegative = amount < 0

  return (
    <div className="transaction-row">
      <div className={`transaction-icon ${iconColor || 'purple'}`}>
        {icon}
      </div>
      <div className="transaction-content">
        <div className="transaction-title">{title}</div>
        <div className="transaction-time">{time}</div>
      </div>
      <div className={`transaction-amount ${isNegative ? 'negative' : ''}`}>
        {isNegative ? '' : '+'}{amount}
      </div>
    </div>
  )
}

// Earn Card Component
function EarnCard({ icon, iconColor, title, description, reward, frequency, actionLabel, onAction, completed }) {
  return (
    <div className="earn-card">
      <div className="earn-card-top">
        <div className={`earn-card-icon ${iconColor || 'purple'}`}>
          {icon}
        </div>
        <div className="earn-card-content">
          <div className="earn-card-header">
            <span className="earn-card-title">{title}</span>
            <div className="earn-card-reward">
              <span className="earn-card-reward-icon">S</span>
              <span className="earn-card-reward-amount">{reward}</span>
            </div>
          </div>
          <div className="earn-card-description">{description}</div>
        </div>
      </div>
      <div className="earn-card-bottom">
        {frequency && <span className="earn-card-frequency">{frequency}</span>}
        {!frequency && <span />}
        <button
          className={`earn-card-action ${completed ? 'completed' : ''}`}
          onClick={onAction}
          disabled={completed}
        >
          {completed ? 'Done' : actionLabel}
        </button>
      </div>
    </div>
  )
}

// Redeem Card Component
function RedeemCard({ days, cost, coinBalance, onRedeem, purchasing, language }) {
  const canAfford = coinBalance >= cost
  const title = language === 'en'
    ? `${days} Day${days > 1 ? 's' : ''} Premium`
    : `${days} Jour${days > 1 ? 's' : ''} Premium`
  const redeemLabel = language === 'en' ? 'Redeem' : 'Utiliser'

  return (
    <div className="redeem-card">
      <div className="redeem-card-icon">
        {days === 1 ? '⭐' : days === 7 ? '👑' : '💎'}
      </div>
      <div className="redeem-card-content">
        <div className="redeem-card-title">{title}</div>
        <div className="redeem-card-cost">
          <span className="redeem-card-cost-icon">S</span>
          <span>{cost} {cost === 1 ? 'coin' : 'coins'}</span>
        </div>
      </div>
      <button
        className="redeem-card-btn"
        onClick={() => onRedeem(days, cost)}
        disabled={!canAfford || purchasing}
      >
        {redeemLabel}
      </button>
    </div>
  )
}

const MyProgressPopup = ({ isVisible, onClose }) => {
  const { user } = useAuth()
  const { coinBalance, refreshPremium } = usePremium()
  const { language } = useLanguage()
  const [transactions, setTransactions] = useState([])
  const [todayTransactions, setTodayTransactions] = useState([])
  const [todaysActions, setTodaysActions] = useState(new Set())
  const [purchasing, setPurchasing] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [showAllTransactions, setShowAllTransactions] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationMessage, setCelebrationMessage] = useState('')

  // Reset state when popup closes/opens
  useEffect(() => {
    if (!isVisible) {
      setIsClosing(false)
    } else {
      // Reset to today's view when opening
      setShowAllTransactions(false)
    }
  }, [isVisible])

  useEffect(() => {
    if (isVisible && user) {
      loadTransactions()
    }
  }, [isVisible, user])

  const loadTransactions = async () => {
    if (!user) return
    try {
      const { data, error } = await getCoinTransactions(user.id)
      if (error) throw error

      const allTransactions = data || []

      // Get today's actions for tracking completed earning activities
      const now = new Date()
      const isSameDay = (d1, d2) => {
        return d1.getFullYear() === d2.getFullYear() &&
          d1.getMonth() === d2.getMonth() &&
          d1.getDate() === d2.getDate()
      }

      const todayTx = allTransactions.filter(tx => {
        const txDate = new Date(tx.created_at)
        return isSameDay(txDate, now)
      })

      const todayPositiveTx = todayTx.filter(tx => Number(tx.amount) > 0)
      const actions = new Set()
      todayPositiveTx.forEach(tx => actions.add(tx.type))
      setTodaysActions(actions)

      // Store today's transactions separately
      setTodayTransactions(todayTx)

      // Store all recent transactions for "See All" view
      setTransactions(allTransactions.slice(0, 20))
    } catch (error) {
      console.error('Error loading transactions:', error)
    }
  }

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 250)
  }

  const handleSpendCoins = async (days, cost) => {
    if (!user || coinBalance < cost) return

    setPurchasing(true)
    try {
      const result = await spendCoinsForPremium(user.id, days, cost)
      if (result.success) {
        await refreshPremium()
        setCelebrationMessage(
          language === 'en'
            ? `You got ${days} day${days > 1 ? 's' : ''} of Premium!`
            : `Vous avez obtenu ${days} jour${days > 1 ? 's' : ''} de Premium !`
        )
        setShowCelebration(true)
        // Reload transactions to show the spend
        loadTransactions()
      } else {
        alert(language === 'en' ? 'Transaction failed.' : 'La transaction a échoué.')
      }
    } catch (error) {
      console.error(error)
      alert(language === 'en' ? 'Error spending coins.' : 'Erreur lors de l\'utilisation des pièces.')
    } finally {
      setPurchasing(false)
    }
  }

  const handleEarnAction = (actionType) => {
    // For now, these actions are informational/coming soon
    console.info(`Earn action: ${actionType} - coming soon`)
  }

  // Format transaction timestamp
  const formatTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()

    const isSameDay = (d1, d2) => {
      return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
    }

    const isYesterday = (d1, d2) => {
      const yesterday = new Date(d2)
      yesterday.setDate(yesterday.getDate() - 1)
      return isSameDay(d1, yesterday)
    }

    const timeStr = date.toLocaleTimeString(language === 'en' ? 'en-US' : 'fr-FR', {
      hour: 'numeric',
      minute: '2-digit'
    })

    if (isSameDay(date, now)) {
      return language === 'en' ? `Today, ${timeStr}` : `Aujourd'hui, ${timeStr}`
    } else if (isYesterday(date, now)) {
      return language === 'en' ? `Yesterday, ${timeStr}` : `Hier, ${timeStr}`
    } else {
      return date.toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', {
        month: 'short',
        day: 'numeric'
      }) + `, ${timeStr}`
    }
  }

  // Get transaction display info
  const getTransactionInfo = (tx) => {
    const typeMap = {
      open_app: {
        icon: '📅',
        iconColor: 'purple',
        title: language === 'en' ? 'Daily Check-in' : 'Connexion quotidienne'
      },
      daily_checkin: {
        icon: '💬',
        iconColor: 'blue',
        title: language === 'en' ? 'Chat Check-in' : 'Chat quotidien'
      },
      streak_bonus: {
        icon: '🔥',
        iconColor: 'orange',
        title: language === 'en' ? 'Streak Bonus' : 'Bonus de série'
      },
      premium_purchase: {
        icon: '👑',
        iconColor: 'orange',
        title: language === 'en' ? 'Premium Redeemed' : 'Premium utilisé'
      },
      mindfulness: {
        icon: '🧘',
        iconColor: 'green',
        title: language === 'en' ? 'Mindfulness Session' : 'Session de pleine conscience'
      },
      mood_checkin: {
        icon: '💭',
        iconColor: 'pink',
        title: language === 'en' ? 'Mood Check-in' : 'Check-in humeur'
      }
    }

    return typeMap[tx.type] || {
      icon: '🪙',
      iconColor: 'purple',
      title: tx.type || (language === 'en' ? 'Reward' : 'Récompense')
    }
  }

  if (!isVisible) return null

  // Labels
  const labels = {
    title: language === 'en' ? 'My Coins' : 'Mes Pièces',
    totalBalance: language === 'en' ? 'Total Balance' : 'Solde Total',
    howYouEarned: language === 'en' ? "Today's Earnings" : "Gains d'aujourd'hui",
    allTransactions: language === 'en' ? 'All Transactions' : 'Toutes les transactions',
    seeAll: language === 'en' ? 'See All' : 'Voir tout',
    showLess: language === 'en' ? 'Show Less' : 'Voir moins',
    waysToEarn: language === 'en' ? 'Ways to Earn More Coins' : 'Façons de gagner plus',
    redeemRewards: language === 'en' ? 'Redeem Rewards' : 'Utiliser les récompenses',
    noTransactions: language === 'en' ? 'No transactions yet' : 'Pas encore de transactions',
    noTodayTransactions: language === 'en' ? 'No earnings today yet' : "Pas encore de gains aujourd'hui",
    // Earn card labels
    mindfulness: {
      title: language === 'en' ? 'Quick Mindfulness' : 'Pleine conscience',
      description: language === 'en'
        ? 'Complete a 5-minute meditation session.'
        : 'Complétez une session de méditation de 5 minutes.',
      action: language === 'en' ? 'Start' : 'Commencer'
    },
    invite: {
      title: language === 'en' ? 'Community Growth' : 'Croissance communautaire',
      description: language === 'en'
        ? 'Invite a friend to join the journey.'
        : 'Invitez un ami à rejoindre l\'aventure.',
      action: language === 'en' ? 'Invite' : 'Inviter'
    },
    moodCheckin: {
      title: language === 'en' ? 'Mood Check-in' : 'Check-in humeur',
      description: language === 'en'
        ? 'How are you feeling right now?'
        : 'Comment vous sentez-vous maintenant ?',
      action: language === 'en' ? 'Log' : 'Noter'
    },
    daily: language === 'en' ? 'Daily' : 'Quotidien',
    oneTime: language === 'en' ? 'One-time' : 'Une fois'
  }

  const isActionCompleted = (type) => todaysActions.has(type)

  return (
    <>
      <div className={`my-coins-overlay ${isClosing ? 'closing' : ''}`}>
        {/* Header */}
        <div className="my-coins-header">
          <button className="my-coins-back-btn" onClick={handleClose} aria-label="Go back">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h1 className="my-coins-title">{labels.title}</h1>
        </div>

        {/* Content */}
        <div className="my-coins-content">
          {/* Balance Section */}
          <div className="my-coins-balance-section">
            <div className="my-coins-icon">S</div>
            <div className="my-coins-amount">{coinBalance?.toLocaleString() || 0}</div>
            <div className="my-coins-label">{labels.totalBalance}</div>
          </div>

          {/* How You Earned Coins Section */}
          <div className="my-coins-section">
            <div className="my-coins-section-header">
              <h2 className="my-coins-section-title">
                {showAllTransactions ? labels.allTransactions : labels.howYouEarned}
              </h2>
              <button
                className="my-coins-see-all"
                onClick={() => setShowAllTransactions(!showAllTransactions)}
              >
                {showAllTransactions ? labels.showLess : labels.seeAll}
              </button>
            </div>
            <div className="my-coins-transactions">
              {showAllTransactions ? (
                // Show all recent transactions
                transactions.length > 0 ? (
                  transactions.map((tx, index) => {
                    const info = getTransactionInfo(tx)
                    return (
                      <TransactionRow
                        key={tx.id || index}
                        icon={info.icon}
                        iconColor={info.iconColor}
                        title={info.title}
                        time={formatTime(tx.created_at)}
                        amount={Number(tx.amount)}
                      />
                    )
                  })
                ) : (
                  <div className="my-coins-empty">{labels.noTransactions}</div>
                )
              ) : (
                // Show only today's transactions
                todayTransactions.length > 0 ? (
                  todayTransactions.map((tx, index) => {
                    const info = getTransactionInfo(tx)
                    return (
                      <TransactionRow
                        key={tx.id || index}
                        icon={info.icon}
                        iconColor={info.iconColor}
                        title={info.title}
                        time={formatTime(tx.created_at)}
                        amount={Number(tx.amount)}
                      />
                    )
                  })
                ) : (
                  <div className="my-coins-empty">{labels.noTodayTransactions}</div>
                )
              )}
            </div>
          </div>

          {/* Ways to Earn More Coins Section */}
          <div className="my-coins-section">
            <div className="my-coins-section-header">
              <h2 className="my-coins-section-title">{labels.waysToEarn}</h2>
            </div>
            <div className="my-coins-earn-cards">
              <EarnCard
                icon="🧘"
                iconColor="green"
                title={labels.mindfulness.title}
                description={labels.mindfulness.description}
                reward={50}
                frequency={labels.daily}
                actionLabel={labels.mindfulness.action}
                onAction={() => handleEarnAction('mindfulness')}
                completed={isActionCompleted('mindfulness')}
              />
              <EarnCard
                icon="👥"
                iconColor="blue"
                title={labels.invite.title}
                description={labels.invite.description}
                reward={200}
                frequency={labels.oneTime}
                actionLabel={labels.invite.action}
                onAction={() => handleEarnAction('invite')}
                completed={false}
              />
              <EarnCard
                icon="💭"
                iconColor="pink"
                title={labels.moodCheckin.title}
                description={labels.moodCheckin.description}
                reward={10}
                frequency={labels.daily}
                actionLabel={labels.moodCheckin.action}
                onAction={() => handleEarnAction('mood_checkin')}
                completed={isActionCompleted('mood_checkin')}
              />
            </div>
          </div>

          {/* Redeem Rewards Section */}
          <div className="my-coins-section">
            <div className="my-coins-section-header">
              <h2 className="my-coins-section-title">{labels.redeemRewards}</h2>
            </div>
            <div className="my-coins-redeem-cards">
              <RedeemCard
                days={1}
                cost={1}
                coinBalance={coinBalance}
                onRedeem={handleSpendCoins}
                purchasing={purchasing}
                language={language}
              />
              <RedeemCard
                days={7}
                cost={5}
                coinBalance={coinBalance}
                onRedeem={handleSpendCoins}
                purchasing={purchasing}
                language={language}
              />
              <RedeemCard
                days={30}
                cost={20}
                coinBalance={coinBalance}
                onRedeem={handleSpendCoins}
                purchasing={purchasing}
                language={language}
              />
            </div>
          </div>
        </div>
      </div>

      <CelebrationModal
        isVisible={showCelebration}
        onClose={() => setShowCelebration(false)}
        message={celebrationMessage}
      />
    </>
  )
}

export default MyProgressPopup
