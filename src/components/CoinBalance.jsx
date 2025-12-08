import React from 'react'
import { usePremium } from '../contexts/PremiumContext'
import './CoinBalance.css'

const CoinBalance = ({ size = 'medium', showLabel = true, className = '' }) => {
    const { coinBalance, loading } = usePremium()

    const formatBalance = (balance) => {
        if (balance >= 1000) {
            return `${(balance / 1000).toFixed(1)}k`
        }
        return balance
    }

    return (
        <div className={`coin-balance coin-balance--${size} ${className}`} title="Your Coins">
            <div className="coin-icon-wrapper">
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="coin-icon"
                >
                    <circle cx="12" cy="12" r="10" fill="currentColor" className="coin-bg" />
                    <path d="M12 6C13.6569 6 15 7.34315 15 9C15 10.6569 13.6569 12 12 12C10.3431 12 9 10.6569 9 9C9 7.34315 10.3431 6 12 6Z" fill="var(--coin-text-color)" />
                    <path d="M12 18C14.2091 18 16 16.2091 16 14V13H8V14C8 16.2091 9.79086 18 12 18Z" fill="var(--coin-text-color)" />
                </svg>
            </div>
            <div className="coin-info">
                <span className="coin-value">
                    {loading ? '...' : formatBalance(coinBalance)}
                </span>
                {showLabel && <span className="coin-label">Coins</span>}
            </div>
        </div>
    )
}

export default CoinBalance
