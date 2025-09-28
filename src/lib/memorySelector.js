const NORMALIZE_REGEX = /[^a-z0-9]+/gi
const EMOTION_CUES = [
  'sad',
  'down',
  'depressed',
  'low',
  'lonely',
  'anxious',
  'anxiety',
  'panic',
  'overwhelmed',
  'stressed',
  'burned out',
  'burnt out',
  'stuck',
  'exhausted',
  'tired',
  'hopeless',
  'numb',
  'empty',
  'lost',
  'cry',
  'crying',
  'tears'
]

const EMOTION_EMOJIS = ['😔', '😢', '😭', '🥺', '😞', '😩', '😫', '😣', '😟', '😖']

const MIN_SCORE = 2.5
const REFERENCE_COOLDOWN_MS = 48 * 60 * 60 * 1000 // 48 hours
const MAX_SNAPSHOT_TURNS = 5

const normalize = (text = '') => `${text}`.trim().toLowerCase()

const tokenize = (text = '') => {
  return normalize(text)
    .split(NORMALIZE_REGEX)
    .filter(Boolean)
}

const containsEmotionCue = (text = '') => {
  if (!text) {
    return false
  }

  const normalized = normalize(text)

  if (EMOTION_EMOJIS.some((emoji) => text.includes(emoji))) {
    return true
  }

  return EMOTION_CUES.some((cue) => normalized.includes(cue))
}

const computeKeywordOverlap = (memoryKeywords = [], tokens = new Set()) => {
  if (!memoryKeywords.length || tokens.size === 0) {
    return 0
  }

  return memoryKeywords.reduce((count, keyword) => {
    const normalizedKeyword = normalize(keyword)
    return tokens.has(normalizedKeyword) ? count + 1 : count
  }, 0)
}

const computeFreshnessPenalty = (lastReferencedAt, now) => {
  if (!lastReferencedAt) {
    return 0
  }

  const lastReferencedTime = new Date(lastReferencedAt).getTime()
  if (Number.isNaN(lastReferencedTime)) {
    return 0
  }

  const elapsed = now - lastReferencedTime

  if (elapsed >= REFERENCE_COOLDOWN_MS) {
    return 0
  }

  const ratio = (REFERENCE_COOLDOWN_MS - elapsed) / REFERENCE_COOLDOWN_MS
  return ratio * 3 // heavy penalty that decays as cooldown elapses
}

export const buildConversationSnapshot = (history = []) => {
  const userTurns = Array.isArray(history)
    ? history.filter((message) => message?.role === 'user' && typeof message?.content === 'string')
    : []

  if (userTurns.length === 0) {
    return {
      text: '',
      userTurns: [],
      heavyTurnCount: 0,
      hasSustainedHeavyCues: false
    }
  }

  const recentTurns = userTurns.slice(-MAX_SNAPSHOT_TURNS)
  const text = recentTurns.map((turn) => turn.content.trim()).join(' ').trim()
  const heavyTurnCount = recentTurns.reduce((count, turn) => {
    return containsEmotionCue(turn.content) ? count + 1 : count
  }, 0)
  const lastPair = recentTurns.slice(-2)
  const hasSustainedHeavyCues = lastPair.length === 2 && lastPair.every((turn) => containsEmotionCue(turn.content))

  return {
    text,
    userTurns: recentTurns,
    heavyTurnCount,
    hasSustainedHeavyCues
  }
}

export const scoreMemory = ({ memory = {}, message = '', snapshot = null, now = Date.now() }) => {
  if (!memory?.id) {
    return Number.NEGATIVE_INFINITY
  }

  const summaryText = normalize(message)
  const snapshotText = snapshot?.text ? normalize(snapshot.text) : ''
  const combinedText = `${summaryText} ${snapshotText}`.trim()
  const tokens = new Set(tokenize(combinedText))

  const memoryKeywords = Array.isArray(memory.keywords)
    ? memory.keywords.map((keyword) => normalize(keyword)).filter(Boolean)
    : []

  const keywordOverlap = computeKeywordOverlap(memoryKeywords, tokens)
  const confidence = typeof memory.confidence === 'number' ? memory.confidence : 0
  const occurrenceCount = typeof memory.occurrence_count === 'number' ? memory.occurrence_count : 1

  let score = confidence * 1.5 + keywordOverlap * 1.2

  if (combinedText && memoryKeywords.some((keyword) => combinedText.includes(keyword))) {
    score += 0.5
  }

  if (snapshot?.heavyTurnCount >= 2) {
    score *= 1.2
  }

  if (occurrenceCount > 1) {
    score += Math.min(occurrenceCount * 0.15, 0.75)
  }

  score -= computeFreshnessPenalty(memory.last_referenced_at, now)

  return score
}

export const chooseMemory = ({
  memories = [],
  message = '',
  snapshot = null,
  usedMemoryIds = new Set(),
  now = Date.now()
} = {}) => {
  if (!snapshot || snapshot.userTurns.length < 2) {
    return null
  }

  const sustainedMood = snapshot.hasSustainedHeavyCues || snapshot.heavyTurnCount >= 3 || containsEmotionCue(message)

  if (!sustainedMood) {
    return null
  }

  const usedIds = usedMemoryIds instanceof Set
    ? usedMemoryIds
    : new Set(Array.isArray(usedMemoryIds) ? usedMemoryIds : [])

  const scored = memories
    .filter((memory) => memory && !usedIds.has(memory.id))
    .map((memory) => ({
      memory,
      score: scoreMemory({ memory, message, snapshot, now })
    }))
    .filter(({ score }) => Number.isFinite(score) && score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)

  return scored.length > 0 ? scored[0] : null
}

export const buildMemoryFriendlyReminder = (memory) => {
  if (!memory) {
    return ''
  }

  const triggerSummary = memory.trigger_summary?.trim?.()
  const supportingQuote = memory.supporting_quote?.trim?.()

  if (!triggerSummary && !supportingQuote) {
    return ''
  }

  const parts = ['They once felt better when...']

  if (triggerSummary) {
    parts.push(`• Trigger: ${triggerSummary}`)
  }

  if (supportingQuote) {
    parts.push(`• Their words: "${supportingQuote}"`)
  }

  parts.push('Use this gently and only if it truly fits the moment.')

  return parts.join('\n')
}

export default {
  buildConversationSnapshot,
  scoreMemory,
  chooseMemory,
  buildMemoryFriendlyReminder
}
