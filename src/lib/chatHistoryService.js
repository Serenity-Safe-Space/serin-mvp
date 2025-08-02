import { supabase } from './supabase'

/**
 * Generates a title from the first user message (max 50 chars)
 * @param {string} firstMessage - The first user message
 * @returns {string} - Generated title
 */
const generateSessionTitle = (firstMessage) => {
  if (!firstMessage || firstMessage.trim().length === 0) {
    return "New Chat"
  }
  
  const title = firstMessage.trim()
  return title.length > 50 ? title.substring(0, 47) + "..." : title
}

/**
 * Creates a new chat session
 * @param {string} userId - The user's ID
 * @param {string} firstMessage - The first user message to generate title
 * @returns {Promise<{session: object, error?: string}>}
 */
export const createChatSession = async (userId, firstMessage = "") => {
  if (!userId) {
    return { session: null, error: 'User ID is required' }
  }

  try {
    const title = generateSessionTitle(firstMessage)
    
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: userId,
        title: title
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating chat session:', error)
      return { session: null, error: error.message }
    }

    return { session: data }
  } catch (error) {
    console.error('Error in createChatSession:', error)
    return { session: null, error: error.message }
  }
}

/**
 * Saves a message to a chat session
 * @param {string} sessionId - The session ID
 * @param {string} role - 'user' or 'assistant'
 * @param {string} content - The message content
 * @returns {Promise<{message: object, error?: string}>}
 */
export const saveMessage = async (sessionId, role, content) => {
  if (!sessionId || !role || !content) {
    return { message: null, error: 'Session ID, role, and content are required' }
  }

  if (!['user', 'assistant'].includes(role)) {
    return { message: null, error: 'Role must be either "user" or "assistant"' }
  }

  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: role,
        content: content
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving message:', error)
      return { message: null, error: error.message }
    }

    return { message: data }
  } catch (error) {
    console.error('Error in saveMessage:', error)
    return { message: null, error: error.message }
  }
}

/**
 * Gets all chat sessions for a user (sorted reverse chronologically)
 * @param {string} userId - The user's ID
 * @returns {Promise<{sessions: Array, error?: string}>}
 */
export const getUserChatSessions = async (userId) => {
  if (!userId) {
    return { sessions: [], error: 'User ID is required' }
  }

  try {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('id, title, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error getting user chat sessions:', error)
      return { sessions: [], error: error.message }
    }

    return { sessions: data || [] }
  } catch (error) {
    console.error('Error in getUserChatSessions:', error)
    return { sessions: [], error: error.message }
  }
}

/**
 * Gets a specific chat session with all its messages
 * @param {string} sessionId - The session ID
 * @param {string} userId - The user's ID (for security check)
 * @returns {Promise<{session: object, messages: Array, error?: string}>}
 */
export const getChatSession = async (sessionId, userId) => {
  if (!sessionId || !userId) {
    return { session: null, messages: [], error: 'Session ID and User ID are required' }
  }

  try {
    // Get session details first
    const { data: sessionData, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('id, title, created_at, updated_at')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single()

    if (sessionError) {
      console.error('Error getting chat session:', sessionError)
      return { session: null, messages: [], error: sessionError.message }
    }

    if (!sessionData) {
      return { session: null, messages: [], error: 'Session not found or access denied' }
    }

    // Get all messages for this session
    const { data: messagesData, error: messagesError } = await supabase
      .from('chat_messages')
      .select('id, role, content, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('Error getting chat messages:', messagesError)
      return { session: sessionData, messages: [], error: messagesError.message }
    }

    return { 
      session: sessionData, 
      messages: messagesData || [] 
    }
  } catch (error) {
    console.error('Error in getChatSession:', error)
    return { session: null, messages: [], error: error.message }
  }
}

/**
 * Updates a chat session title
 * @param {string} sessionId - The session ID
 * @param {string} userId - The user's ID (for security check)
 * @param {string} title - The new title
 * @returns {Promise<{session: object, error?: string}>}
 */
export const updateSessionTitle = async (sessionId, userId, title) => {
  if (!sessionId || !userId || !title) {
    return { session: null, error: 'Session ID, User ID, and title are required' }
  }

  try {
    const { data, error } = await supabase
      .from('chat_sessions')
      .update({ title: title })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating session title:', error)
      return { session: null, error: error.message }
    }

    return { session: data }
  } catch (error) {
    console.error('Error in updateSessionTitle:', error)
    return { session: null, error: error.message }
  }
}

/**
 * Deletes a chat session and all its messages
 * @param {string} sessionId - The session ID
 * @param {string} userId - The user's ID (for security check)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteChatSession = async (sessionId, userId) => {
  if (!sessionId || !userId) {
    return { success: false, error: 'Session ID and User ID are required' }
  }

  try {
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting chat session:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in deleteChatSession:', error)
    return { success: false, error: error.message }
  }
}