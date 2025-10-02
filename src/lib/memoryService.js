import { supabase } from './supabase'

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
