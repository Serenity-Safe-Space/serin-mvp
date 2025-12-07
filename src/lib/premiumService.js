import { supabase } from './supabase'

/**
 * Get comprehensive premium status for a user.
 * @param {string} userId
 */
export const getPremiumStatus = async (userId) => {
    try {
        // 1. Fetch Profile Data (coins, premium flag)
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('coins_balance, premium_active, premium_end_at')
            .eq('id', userId)
            .single()

        if (profileError) throw profileError

        // 2. Fetch Latest Active Subscription (optional context)
        const { data: subscription, error: subError } = await supabase
            .from('premium_subscriptions')
            .select('source, status, ends_at')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        // It's okay if no subscription implementation detail found, just use profile flags logic
        if (subError && subError.code !== 'PGRST116') {
            console.warn('Error fetching subscription details:', subError)
        }

        return {
            isActive: profile?.premium_active || false,
            endsAt: profile?.premium_end_at,
            balance: profile?.coins_balance || 0,
            source: subscription?.source || null,
            error: null
        }
    } catch (error) {
        console.error('Error fetching premium status:', error)
        return {
            isActive: false,
            endsAt: null,
            balance: 0,
            source: null,
            error
        }
    }
}

/**
 * Checks if premium has expired based on current time.
 * If expired, updates the database to reflect this.
 * @param {string} userId
 */
export const checkAndExpirePremium = async (userId) => {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('premium_active, premium_end_at')
            .eq('id', userId)
            .single()

        if (error) throw error

        if (!profile?.premium_active || !profile?.premium_end_at) {
            return { expired: false, error: null }
        }

        const now = new Date()
        const endsAt = new Date(profile.premium_end_at)

        // Check if passed expiration time
        if (now > endsAt) {
            console.log('Premium expired, updating status...')

            // 1. Update Profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ premium_active: false })
                .eq('id', userId)

            if (updateError) throw updateError

            // 2. Update Subscriptions (mark active ones as expired)
            await supabase
                .from('premium_subscriptions')
                .update({ status: 'expired' })
                .eq('user_id', userId)
                .eq('status', 'active')

            return { expired: true, error: null }
        }

        return { expired: false, error: null }
    } catch (error) {
        console.error('Error checking premium expiration:', error)
        return { expired: false, error }
    }
}
