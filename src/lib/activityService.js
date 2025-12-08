import { supabase } from './supabase'
import { awardCoins } from './coinService'

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

    // Try to award daily activity coins (3 coins). Backend handles daily limit/duplicate safeguards.
    // We call this even if upsert was just an "update" because the backend fn checks "coins given today" separately.
    await awardCoins(userId, 'daily_checkin', 3)

    return { success: true }
  } catch (error) {
    console.error('Error in recordDailyActivity:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Gets the user's current consecutive-day streak.
 * @param {string} userId - The user's ID
 * @returns {Promise<{count: number, error?: string}>}
 */
export const getCurrentStreak = async (userId) => {
  if (!userId) {
    return { count: 0, error: 'User ID is required' }
  }

  try {
    const { data, error } = await supabase
      .from('user_activity')
      .select('activity_date')
      .eq('user_id', userId)
      .order('activity_date', { ascending: false })
      .limit(365)

    if (error) {
      console.error('Error getting current streak:', error)
      return { count: 0, error: error.message }
    }

    const activityDates = (data || []).map(({ activity_date }) => activity_date).filter(Boolean)
    if (activityDates.length === 0) {
      return { count: 0 }
    }

    const parseDate = (dateString) => {
      const [year, month, day] = dateString.split('-').map(Number)
      return Date.UTC(year, month - 1, day)
    }

    const diffInDays = (newer, older) => {
      return Math.round((parseDate(newer) - parseDate(older)) / 86400000)
    }

    const today = new Date().toISOString().split('T')[0]
    const mostRecent = activityDates[0]
    const daysSinceMostRecent = diffInDays(today, mostRecent)

    if (daysSinceMostRecent > 1) {
      return { count: 0 }
    }

    let streak = 1
    let previousDate = mostRecent

    for (let i = 1; i < activityDates.length; i += 1) {
      const currentDate = activityDates[i]
      const gap = diffInDays(previousDate, currentDate)

      if (gap === 1) {
        streak += 1
        previousDate = currentDate
        continue
      }

      // Any gap larger than a day breaks the streak
      if (gap > 1) {
        break
      }
      // Defensive: skip duplicates just in case the unique constraint is missing
    }

    return { count: streak }
  } catch (error) {
    console.error('Error in getCurrentStreak:', error)
    return { count: 0, error: error.message }
  }
}

// Backwards compatibility export for existing callers
export const getDaysActive = getCurrentStreak

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
