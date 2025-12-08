import React from 'react'
import './PremiumBanner.css'

const PremiumBanner = ({ message, onAction, onDismiss }) => {
    return (
        <div className="premium-banner">
            <div className="premium-banner-content">
                <span className="premium-banner-icon">⚠️</span>
                <span className="premium-banner-text">{message}</span>
            </div>
            <div className="premium-banner-actions">
                <button className="premium-banner-btn" onClick={onAction}>
                    Renew
                </button>
                <button className="premium-banner-dismiss" onClick={onDismiss} aria-label="Dismiss">
                    ✕
                </button>
            </div>
        </div>
    )
}

export default PremiumBanner
