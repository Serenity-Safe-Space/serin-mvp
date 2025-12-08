import React, { useState } from 'react'
import { usePremium } from './contexts/PremiumContext'
import { spendCoinsForPremium } from './lib/coinService'
import { useAuth } from './contexts/AuthContext'
import { useLanguage } from './contexts/LanguageContext'
import CoinBalance from './components/CoinBalance'
import CelebrationModal from './components/CelebrationModal'
import './PremiumPaywall.css'

const PremiumPaywall = ({ isVisible, onClose }) => {
    const { user } = useAuth()
    const { coinBalance, refreshPremium } = usePremium()
    const { t } = useLanguage()
    const [purchasing, setPurchasing] = useState(false)
    const [successMessage, setSuccessMessage] = useState(null)
    const [showCelebration, setShowCelebration] = useState(false)
    const [celebrationMessage, setCelebrationMessage] = useState('')

    if (!isVisible) return null

    const handleMonthlyPlanClick = () => {
        // Placeholder for now
        alert('Monthly subscriptions coming soon! Use your coins for now.')
    }

    const handleSpendCoins = async (days, cost) => {
        if (!user) return
        if (coinBalance < cost) return

        setPurchasing(true)
        try {
            // 1. Spend coins
            const result = await spendCoinsForPremium(user.id, days, cost)

            if (result.success) {
                // 2. Refresh context to show new balance and premium status
                await refreshPremium()

                // 3. Show success UI
                setCelebrationMessage(`${days} days added to your plan!`)
                setShowCelebration(true)

                // 4. Close after delay (CelebrationModal handles its own dismiss, but we need to close Paywall)
                // We'll let the user see the celebration, then they can close, or we close paywall underlyingly.
                // Actually, let's close the paywall immediately so the celebration is on top of whatever was behind.
                // OR keep paywall open until celebration done.
                // Better: CelebrationModal is ON TOP. When it closes, we can close Paywall too.
                setTimeout(() => {
                    onClose()
                }, 3500) // Slightly shorter than celebration auto-dismiss (4000)
            } else {
                alert('Transaction failed. Please try again.')
            }
        } catch (error) {
            console.error('Purchase failed:', error)
            alert('Something went wrong.')
        } finally {
            setPurchasing(false)
        }
    }

    const renderCoinOption = (days, cost, label = '') => {
        const canAfford = coinBalance >= cost
        return (
            <button
                className={`coin-option-btn ${!canAfford ? 'disabled' : ''}`}
                onClick={() => canAfford && !purchasing && handleSpendCoins(days, cost)}
                disabled={!canAfford || purchasing}
            >
                <div className="coin-option-details">
                    <span className="coin-option-duration">{days} Day{days > 1 ? 's' : ''}</span>
                    {label && <span className="coin-option-label">{label}</span>}
                </div>
                <div className="coin-option-cost">
                    <span className="cost-val">{cost}</span>
                    <span className="cost-icon">🪙</span>
                </div>
            </button>
        )
    }

    return (
        <div className="paywall-overlay" onClick={onClose}>
            <div className="paywall-content" onClick={e => e.stopPropagation()}>
                <button className="paywall-close" onClick={onClose}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>

                {successMessage ? (
                    <div className="paywall-success">
                        <div className="success-icon">🎉</div>
                        <h3>{successMessage}</h3>
                    </div>
                ) : (
                    <>
                        <div className="paywall-header">
                            <h2>Stay with Serin every day</h2>
                            <p>Unlock the full experience with Serin Premium.</p>
                        </div>

                        <div className="paywall-grid">
                            {/* Left Card: Monthly Plan */}
                            <div className="paywall-card plan-card">
                                <div className="card-header">
                                    <h3>Monthly Plan</h3>
                                    <div className="price-tag">
                                        <span className="currency">€</span>
                                        <span className="amount">20</span>
                                        <span className="period">/mo</span>
                                    </div>
                                </div>
                                <ul className="benefits-list">
                                    <li>✨ Unlimited chats</li>
                                    <li>🗣️ Voice mode access</li>
                                    <li>🧠 Smarter AI models</li>
                                    <li>⚡️ Early feature access</li>
                                </ul>
                                <button className="plan-cta-btn" onClick={handleMonthlyPlanClick}>
                                    Subscribe Now
                                </button>
                                <div className="plan-subtext">Cancel anytime.</div>
                            </div>

                            {/* Right Card: Use Coins */}
                            <div className="paywall-card coins-card">
                                <div className="card-header">
                                    <h3>Use Coins</h3>
                                    <div className="current-balance">
                                        Balance: <CoinBalance size="small" showLabel={false} />
                                    </div>
                                </div>
                                <div className="coin-options-list">
                                    {renderCoinOption(1, 1)}
                                    {renderCoinOption(7, 5, 'Best Value!')}
                                    {renderCoinOption(30, 20, 'Super Saver')}
                                </div>
                                <div className="plan-subtext">Earn coins by using the app daily.</div>
                            </div>
                        </div>
                    </>
                )}
            </div>
            <CelebrationModal
                isVisible={showCelebration}
                onClose={() => setShowCelebration(false)}
                message={celebrationMessage}
            />
        </div>
    )
}

export default PremiumPaywall
