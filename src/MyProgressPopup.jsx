import React, { useEffect, useState } from 'react'
import { usePremium } from './contexts/PremiumContext'
import { useAuth } from './contexts/AuthContext'
import { useLanguage } from './contexts/LanguageContext'
import { getCoinTransactions, spendCoinsForPremium } from './lib/coinService'
import ProgressCircle from './components/ProgressCircle'
import './MyProgressPopup.css'

const MyProgressPopup = ({ isVisible, onClose }) => {
    const { user } = useAuth()
    const { coinBalance, refreshPremium } = usePremium()
    const { t } = useLanguage()
    const [todaysActions, setTodaysActions] = useState(new Set())
    const [purchasing, setPurchasing] = useState(false)
    const [dailyEarnings, setDailyEarnings] = useState(0)

    // Define rewards locally for now (could be config later)
    const REWARDS = {
        open_app: 1,
        daily_checkin: 2,
        // Future: invite_friend: 5, etc.
    }

    // Define target for daily earnings (visual goal)
    const DAILY_TARGET = 5

    useEffect(() => {
        if (isVisible && user) {
            loadDailyProgress()
        }
    }, [isVisible, user])

    const loadDailyProgress = async () => {
        if (!user) return
        try {
            const { data, error } = await getCoinTransactions(user.id)
            const transactions = data || []

            if (error) throw error

            const now = new Date()
            const isSameDay = (d1, d2) => {
                return d1.getFullYear() === d2.getFullYear() &&
                    d1.getMonth() === d2.getMonth() &&
                    d1.getDate() === d2.getDate()
            }

            // Filter for today
            const todayTx = transactions.filter(tx => {
                const txDate = new Date(tx.created_at)
                return isSameDay(txDate, now) && Number(tx.amount) > 0
            })

            console.log('Daily Progress Debug:', {
                allTransactions: transactions,
                todayTx,
                now: now.toString()
            })

            const actions = new Set()
            let earnedToday = 0

            todayTx.forEach(tx => {
                actions.add(tx.type)
                earnedToday += Number(tx.amount)
            })

            setTodaysActions(actions)
            setDailyEarnings(earnedToday)
        } catch (error) {
            console.error('Error loading daily progress:', error)
        }
    }

    const handleSpendCoins = async (days, cost) => {
        if (!user || coinBalance < cost) return

        setPurchasing(true)
        try {
            const result = await spendCoinsForPremium(user.id, days, cost)
            if (result.success) {
                await refreshPremium()
                alert(`🎉 Success! You got ${days} day${days > 1 ? 's' : ''} of Premium!`)
            } else {
                alert('Transaction failed.')
            }
        } catch (error) {
            console.error(error)
            alert('Error spending coins.')
        } finally {
            setPurchasing(false)
        }
    }

    if (!isVisible) return null

    const isActionCompleted = (type) => todaysActions.has(type)

    return (
        <div className="progress-popup-overlay" onClick={onClose}>
            <div className="progress-popup-content" onClick={e => e.stopPropagation()}>
                <button className="progress-popup-close" onClick={onClose}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>

                <div className="progress-popup-header">
                    <h2>My Progress</h2>
                    <p>Keep going, Serin is proud of you!</p>
                </div>

                <div className="progress-overview">
                    <ProgressCircle
                        current={dailyEarnings}
                        target={DAILY_TARGET}
                        label="Earned Today"
                    />
                </div>

                <div className="progress-section">
                    <h3>Ways to Earn</h3>
                    <div className="earning-actions-list">
                        <div className={`earning-action-item ${isActionCompleted('open_app') ? 'completed' : ''}`}>
                            <div className="action-info">
                                <span className="action-title">Visit Serin Daily</span>
                                <span className="action-reward">+{REWARDS.open_app} Coin</span>
                            </div>
                            <div className="action-status">
                                {isActionCompleted('open_app') ? (
                                    <span className="status-icon">✅</span>
                                ) : (
                                    <span className="status-icon" style={{ opacity: 0.3 }}>⬜</span>
                                )}
                            </div>
                        </div>

                        <div className={`earning-action-item ${isActionCompleted('daily_checkin') ? 'completed' : ''}`}>
                            <div className="action-info">
                                <span className="action-title">Daily Chat Check-in</span>
                                <span className="action-reward">+{REWARDS.daily_checkin} Coins</span>
                            </div>
                            <div className="action-status">
                                {isActionCompleted('daily_checkin') ? (
                                    <span className="status-icon">✅</span>
                                ) : (
                                    <span className="status-icon" style={{ opacity: 0.3 }}>⬜</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="progress-section section-redeem">
                    <h3>Spend Rewards</h3>
                    <div className="coin-redemption-grid">
                        <button
                            className={`redeem-btn ${coinBalance < 1 || purchasing ? 'disabled' : ''}`}
                            onClick={() => handleSpendCoins(1, 1)}
                            disabled={coinBalance < 1 || purchasing}
                        >
                            <span className="redeem-days">1 Day</span>
                            <span className="redeem-cost">1 🪙</span>
                        </button>
                        <button
                            className={`redeem-btn ${coinBalance < 5 || purchasing ? 'disabled' : ''}`}
                            onClick={() => handleSpendCoins(7, 5)}
                            disabled={coinBalance < 5 || purchasing}
                        >
                            <span className="redeem-days">7 Days</span>
                            <span className="redeem-cost">5 🪙</span>
                        </button>
                        <button
                            className={`redeem-btn ${coinBalance < 20 || purchasing ? 'disabled' : ''}`}
                            onClick={() => handleSpendCoins(30, 20)}
                            disabled={coinBalance < 20 || purchasing}
                        >
                            <span className="redeem-days">30 Days</span>
                            <span className="redeem-cost">20 🪙</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default MyProgressPopup
