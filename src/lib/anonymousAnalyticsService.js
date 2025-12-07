import { supabase } from './supabase'

const ANONYMOUS_ID_KEY = 'serin_anonymous_id'

/**
 * Generates a UUID v4
 * @returns {string}
 */
const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
    })
}

/**
 * Gets or creates a persistent anonymous ID
 * @returns {string}
 */
export const getAnonymousId = () => {
    let id = localStorage.getItem(ANONYMOUS_ID_KEY)
    if (!id) {
        id = generateUUID()
        localStorage.setItem(ANONYMOUS_ID_KEY, id)
    }
    return id
}

/**
 * Tracks an event for an anonymous user
 * @param {string} sessionId - The current session ID (can be client-generated)
 * @param {string} eventType - The type of event (e.g., 'session_start', 'message_sent')
 * @param {object} [metadata={}] - Additional metadata
 */
export const trackAnonymousEvent = async (sessionId, eventType, metadata = {}) => {
    const anonymousId = getAnonymousId()

    try {
        const { error } = await supabase.from('anonymous_analytics').insert({
            anonymous_id: anonymousId,
            session_id: sessionId,
            event_type: eventType,
            metadata,
        })

        if (error) {
            console.warn('Failed to track anonymous event:', error)
        }
    } catch (error) {
        console.warn('Error tracking anonymous event:', error)
    }
}
