import { supabase } from './supabase'

/**
 * Records daily activity for a user (once per day maximum)
 * @param {string} userId - The user's ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const recordDailyActivity = async (userId) => {
  if (!userId) {
    return { success: false, error: 'User ID is required' }
  }

  try {
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    
    // Use UPSERT to avoid duplicates - if user already has activity for today, do nothing
    const { error } = await supabase
      .from('user_activity')
      .upsert(
        { 
          user_id: userId, 
          activity_date: today 
        },
        { 
          onConflict: 'user_id,activity_date',
          ignoreDuplicates: true 
        }
      )

    if (error) {
      console.error('Error recording daily activity:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in recordDailyActivity:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Gets the number of unique days a user has been active
 * @param {string} userId - The user's ID
 * @returns {Promise<{count: number, error?: string}>}
 */
export const getDaysActive = async (userId) => {
  if (!userId) {
    return { count: 0, error: 'User ID is required' }
  }

  try {
    const { count, error } = await supabase
      .from('user_activity')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (error) {
      console.error('Error getting days active:', error)
      return { count: 0, error: error.message }
    }

    // Ensure minimum of 1 if user has any activity, 0 if completely new
    const activeCount = count || 0
    return { count: activeCount }
  } catch (error) {
    console.error('Error in getDaysActive:', error)
    return { count: 0, error: error.message }
  }
}

/**
 * Gets detailed activity data for a user (for debugging/analytics)
 * @param {string} userId - The user's ID
 * @returns {Promise<{data: Array, error?: string}>}
 */
export const getUserActivity = async (userId) => {
  if (!userId) {
    return { data: [], error: 'User ID is required' }
  }

  try {
    const { data, error } = await supabase
      .from('user_activity')
      .select('activity_date, created_at')
      .eq('user_id', userId)
      .order('activity_date', { ascending: false })

    if (error) {
      console.error('Error getting user activity:', error)
      return { data: [], error: error.message }
    }

    return { data: data || [] }
  } catch (error) {
    console.error('Error in getUserActivity:', error)
    return { data: [], error: error.message }
  }
}