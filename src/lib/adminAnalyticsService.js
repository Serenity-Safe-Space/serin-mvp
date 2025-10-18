import { supabase } from './supabase'

const DEFAULT_ERROR_MESSAGE = 'Unknown error'

const normalizeString = (value) => {
  if (!value) return ''
  return `${value}`.trim()
}

const fallBackName = (email) => {
  if (!email) return 'Friend'
  return normalizeString(email.split('@')[0] || 'Friend')
}

const deriveMoodLabel = (label, score) => {
  if (label && label !== 'Unknown') {
    return label
  }

  if (typeof score !== 'number' || Number.isNaN(score)) {
    return 'Unknown'
  }

  if (score >= 0.66) return 'Improving'
  if (score >= 0.33) return 'Neutral'
  return 'Low'
}

const palette = [
  '#F29A9A',
  '#F5C26B',
  '#9CC8FF',
  '#8CD9C8',
  '#D7A4FF',
  '#FFB5B5',
  '#FFE08D',
  '#A6E3E9',
]

const assignAvatarColor = (seed) => {
  if (!seed) return palette[0]
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % palette.length
  return palette[index]
}

const formatRelativeTime = (isoString) => {
  if (!isoString) return 'No activity yet'
  const timestamp = new Date(isoString)
  if (Number.isNaN(timestamp.valueOf())) return 'No activity yet'

  const diffMs = Date.now() - timestamp.valueOf()
  const diffMinutes = Math.floor(diffMs / 60000)
  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes} min ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`

  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks < 5) return `${diffWeeks} wk${diffWeeks > 1 ? 's' : ''} ago`

  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return `${diffMonths} mo${diffMonths > 1 ? 's' : ''} ago`

  const diffYears = Math.floor(diffDays / 365)
  return `${diffYears} yr${diffYears > 1 ? 's' : ''} ago`
}

const statusFromTimestamp = (isoString) => {
  if (!isoString) return 'Inactive'
  const timestamp = new Date(isoString)
  if (Number.isNaN(timestamp.valueOf())) return 'Inactive'
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
  return timestamp.valueOf() >= sevenDaysAgo ? 'Active' : 'Inactive'
}

export const fetchAdminUserFeatureAnalytics = async () => {
  const { data, error } = await supabase.rpc('admin_user_feature_analytics')
  if (error) {
    const message = error?.message || DEFAULT_ERROR_MESSAGE
    throw new Error(message)
  }

  return (data || []).map((row) => {
    const {
      user_id: userId,
      full_name: fullNameRaw,
      email,
      summary,
      messages_sent: messagesSent,
      avg_confidence: avgConfidence,
      mood_label: moodLabelRaw,
      last_seen: lastSeen,
      status,
    } = row

    const fullName = normalizeString(fullNameRaw) || fallBackName(email)
    const initials = normalizeString(fullName).split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
    const avatarColor = assignAvatarColor(fullName || email || userId)
    const normalizedSummary = normalizeString(summary) || 'No summary yet'
    const moodLabel = deriveMoodLabel(normalizeString(moodLabelRaw), typeof avgConfidence === 'number' ? avgConfidence : null)
    const averageConfidence = typeof avgConfidence === 'number' && !Number.isNaN(avgConfidence) ? avgConfidence : null
    const formattedLastSeen = formatRelativeTime(lastSeen)
    const normalizedStatus = status ? status : statusFromTimestamp(lastSeen)

    return {
      userId,
      fullName,
      email: email ?? '',
      summary: normalizedSummary,
      messagesSent: typeof messagesSent === 'number' ? messagesSent : 0,
      moodLabel,
      averageConfidence,
      lastSeen,
      lastSeenRelative: formattedLastSeen,
      displayName: fullName,
      status: normalizedStatus,
      initials: initials || 'S',
      avatarColor,
    }
  })
}
