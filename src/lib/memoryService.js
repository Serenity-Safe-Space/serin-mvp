import { supabase } from './supabase'

export const fetchMoodMemories = async (userId, { limit = 40 } = {}) => {
  if (!userId) {
    return { memories: [], error: 'userId is required' }
  }

  try {
    const { data, error } = await supabase
      .from('user_mood_memories')
      .select(
        [
          'id',
          'trigger_summary',
          'supporting_quote',
          'keywords',
          'confidence',
          'occurrence_count',
          'last_refreshed_at',
          'last_referenced_at',
          'reference_count'
        ].join(', ')
      )
      .eq('user_id', userId)
      .order('last_refreshed_at', { ascending: false })
      .limit(Math.max(1, limit))

    if (error) {
      console.error('Error fetching mood memories:', error)
      return { memories: [], error: error.message }
    }

    return { memories: Array.isArray(data) ? data : [] }
  } catch (error) {
    console.error('Unexpected error fetching mood memories:', error)
    return { memories: [], error: error.message }
  }
}

export const markMoodMemoryReferenced = async ({
  id,
  userId,
  referenceCount = 0
}) => {
  if (!id) {
    return { memory: null, error: 'id is required' }
  }

  const now = new Date().toISOString()

  try {
    let query = supabase
      .from('user_mood_memories')
      .update({
        last_referenced_at: now,
        reference_count: Math.max(referenceCount + 1, 1)
      })
      .eq('id', id)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query
      .select()
      .maybeSingle()

    if (error) {
      console.error('Error marking mood memory referenced:', error)
      return { memory: null, error: error.message }
    }

    return { memory: data }
  } catch (error) {
    console.error('Unexpected error marking mood memory referenced:', error)
    return { memory: null, error: error.message }
  }
}

export const upsertMoodMemory = async ({
  userId,
  sessionId = null,
  triggerSummary,
  supportingQuote = '',
  keywords = [],
  confidence = 0
}) => {
  if (!userId || !triggerSummary) {
    return { memory: null, error: 'userId and triggerSummary are required' }
  }

  const now = new Date().toISOString()

  try {
    const { data: existing, error: fetchError } = await supabase
      .from('user_mood_memories')
      .select('id, occurrence_count, first_detected_at, supporting_quote, keywords, session_id')
      .eq('user_id', userId)
      .eq('trigger_summary', triggerSummary)
      .maybeSingle()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching existing mood memory:', fetchError)
      return { memory: null, error: fetchError.message }
    }

    const payload = {
      user_id: userId,
      session_id: sessionId ?? existing?.session_id ?? null,
      trigger_summary: triggerSummary,
      supporting_quote: supportingQuote || existing?.supporting_quote || '',
      keywords: keywords?.length ? keywords : existing?.keywords || [],
      confidence,
      occurrence_count: (existing?.occurrence_count || 0) + 1,
      first_detected_at: existing?.first_detected_at || now,
      last_refreshed_at: now
    }

    if (existing?.id) {
      payload.id = existing.id
    }

    const { data, error } = await supabase
      .from('user_mood_memories')
      .upsert(payload, { onConflict: 'user_id,trigger_summary' })
      .select()
      .maybeSingle()

    if (error) {
      console.error('Error upserting mood memory:', error)
      return { memory: null, error: error.message }
    }

    return { memory: data }
  } catch (error) {
    console.error('Unexpected error upserting mood memory:', error)
    return { memory: null, error: error.message }
  }
}
