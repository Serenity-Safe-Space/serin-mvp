import { useEffect, useRef } from 'react'
import { awardCoins } from '../lib/coinService'
import { useAuth } from '../contexts/AuthContext'

/**
 * Hook to award coins for opening the app.
 * Runs once per session mount, but relies on backend to enforce 1x per day limit.
 */
export const useAppOpenReward = () => {
    const { user } = useAuth()
    const attemptedRef = useRef(false)

    useEffect(() => {
        if (!user || attemptedRef.current) return

        const triggerReward = async () => {
            attemptedRef.current = true
            try {
                // Award 2 coins for opening app. 
                // Backend 'award_coins' function handles the daily duplicate check.
                await awardCoins(user.id, 'open_app', 2)
            } catch (error) {
                console.warn('Failed to trigger app open reward:', error)
            }
        }

        triggerReward()
    }, [user])
}
