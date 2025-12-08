import { supabase } from './supabase'

export const FREE_DAILY_MESSAGE_LIMIT = 20

/**
 * Get the number of messages sent by the user today.
 * @param {string} userId
 */
export const getDailyMessageCount = async (userId) => {
    if (!userId) return { count: 0, error: 'User ID required' }

    try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const { count, error } = await supabase
            .from('chat_messages')
            .select('session_id, chat_sessions!inner(user_id)', { count: 'exact', head: true })
            .eq('role', 'user')
            .gte('created_at', today.toISOString())
            .not('session_id', 'is', null)
            // Join with sessions to filter by user
            // Note: This assumes foreign key exists. If not, we might need a two-step query.
            // But typically session_id is FK.
            // However, Supabase joins on count/head might be tricky if RLS policies are complex.
            // Trying the inner join syntax:
            .eq('chat_sessions.user_id', userId)

        if (error) throw error
        return { count: count || 0, error: null }
    } catch (error) {
        console.error('Error fetching daily message count:', error)
        return { count: 0, error }
    }
}
