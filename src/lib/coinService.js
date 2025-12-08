import { supabase } from './supabase'

/**
 * Get current coin balance for a user.
 * @param {string} userId 
 */
export const getCoinBalance = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('coins_balance')
            .eq('id', userId)
            .single()

        if (error) throw error
        return { balance: data?.coins_balance || 0, error: null }
    } catch (error) {
        console.error('Error fetching coin balance:', error)
        return { balance: 0, error }
    }
}

/**
 * Get recent coin transactions.
 * @param {string} userId 
 * @param {number} limit 
 */
export const getCoinTransactions = async (userId, limit = 50) => {
    try {
        const { data, error } = await supabase
            .from('coin_transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit)

        if (error) throw error
        return { data, error: null }
    } catch (error) {
        console.error('Error fetching transactions:', error)
        return { data: [], error }
    }
}

/**
 * Award coins to a user via secure RPC.
 * @param {string} userId 
 * @param {string} type - 'daily_checkin', 'share_link', etc.
 * @param {number} amount 
 * @param {object} metadata - Optional metadata (e.g., local_date)
 */
export const awardCoins = async (userId, type, amount, metadata = {}) => {
    try {
        const { data, error } = await supabase.rpc('award_coins', {
            p_user_id: userId,
            p_type: type,
            p_amount: amount,
            p_metadata: metadata
        })

        if (error) throw error
        return { newBalance: data, error: null }
    } catch (error) {
        console.error('Error awarding coins:', error)
        return { newBalance: null, error }
    }
}

/**
 * Spend coins to purchase premium time.
 * @param {string} userId 
 * @param {number} days - Number of days to add to premium
 * @param {number} cost - Cost in coins
 */
export const spendCoinsForPremium = async (userId, days, cost) => {
    try {
        const { data, error } = await supabase.rpc('spend_coins_for_premium', {
            p_user_id: userId,
            p_days: days,
            p_cost: cost
        })

        if (error) throw error

        // data is boolean (true = success)
        if (!data) {
            return { success: false, error: 'Insufficient funds or transaction failed' }
        }

        return { success: true, error: null }
    } catch (error) {
        console.error('Error spending coins:', error)
        return { success: false, error }
    }
}
