import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { getPremiumStatus, checkAndExpirePremium } from '../lib/premiumService'

const PremiumContext = createContext({})

export const usePremium = () => {
    const context = useContext(PremiumContext)
    if (!context) {
        throw new Error('usePremium must be used within a PremiumProvider')
    }
    return context
}

export const PremiumProvider = ({ children }) => {
    const { user } = useAuth()
    const [isPremium, setIsPremium] = useState(false)
    const [premiumEndsAt, setPremiumEndsAt] = useState(null)
    const [coinBalance, setCoinBalance] = useState(0)
    const [loading, setLoading] = useState(true)

    const refreshPremium = useCallback(async () => {
        if (!user) {
            setIsPremium(false)
            setPremiumEndsAt(null)
            setCoinBalance(0)
            setLoading(false)
            return
        }

        setLoading(true)
        try {
            // 1. Check logical expiration and update DB if needed
            await checkAndExpirePremium(user.id)

            // 2. Fetch fresh status
            const { isActive, endsAt, balance } = await getPremiumStatus(user.id)

            setIsPremium(isActive)
            setPremiumEndsAt(endsAt)
            setCoinBalance(balance)
        } catch (error) {
            console.error('Failed to refresh premium status:', error)
        } finally {
            setLoading(false)
        }
    }, [user])

    // Initial load and listen to user changes
    useEffect(() => {
        refreshPremium()
    }, [refreshPremium])

    const value = {
        isPremium,
        premiumEndsAt,
        coinBalance,
        loading,
        refreshPremium
    }

    return (
        <PremiumContext.Provider value={value}>
            {children}
        </PremiumContext.Provider>
    )
}
