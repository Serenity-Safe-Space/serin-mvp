import { supabase } from './supabase'
import { getSerinSystemInstruction } from '../utils/serinPrompt'
import { getModelById } from './aiModelRegistry'

// ============================================================
// Test Questions CRUD
// ============================================================

/**
 * Get all test questions
 * @param {Object} options - Filter options
 * @param {boolean} [options.activeOnly=true] - Only return active questions
 * @returns {Promise<{questions: Array, error?: string}>}
 */
export const getTestQuestions = async (options = {}) => {
  const { activeOnly = true } = options

  try {
    let query = supabase
      .from('prompt_test_questions')
      .select('*')
      .order('display_order', { ascending: true })
      .order('test_id', { ascending: true })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching test questions:', error)
      return { questions: [], error: error.message }
    }

    return { questions: data || [] }
  } catch (error) {
    console.error('Error in getTestQuestions:', error)
    return { questions: [], error: error.message }
  }
}

/**
 * Create a new test question
 * @param {Object} question - Question data
 * @param {string} question.test_id - Unique test ID (e.g., "E17")
 * @param {string} question.category - Category (e.g., "empathy", "boundary")
 * @param {string} question.user_message - The user message to test
 * @param {string} [question.expected_behavior] - Expected behavior description
 * @param {number} [question.display_order] - Display order
 * @param {string} userId - The creating user's ID
 * @returns {Promise<{question: Object|null, error?: string}>}
 */
export const createTestQuestion = async (question, userId) => {
  if (!question.test_id || !question.category || !question.user_message) {
    return { question: null, error: 'test_id, category, and user_message are required' }
  }

  try {
    const { data, error } = await supabase
      .from('prompt_test_questions')
      .insert({
        test_id: question.test_id,
        category: question.category,
        user_message: question.user_message,
        expected_behavior: question.expected_behavior || null,
        display_order: question.display_order || 0,
        created_by: userId,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating test question:', error)
      return { question: null, error: error.message }
    }

    return { question: data }
  } catch (error) {
    console.error('Error in createTestQuestion:', error)
    return { question: null, error: error.message }
  }
}

/**
 * Update a test question
 * @param {string} questionId - The question UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<{question: Object|null, error?: string}>}
 */
export const updateTestQuestion = async (questionId, updates) => {
  if (!questionId) {
    return { question: null, error: 'Question ID is required' }
  }

  try {
    const { data, error } = await supabase
      .from('prompt_test_questions')
      .update(updates)
      .eq('id', questionId)
      .select()
      .single()

    if (error) {
      console.error('Error updating test question:', error)
      return { question: null, error: error.message }
    }

    return { question: data }
  } catch (error) {
    console.error('Error in updateTestQuestion:', error)
    return { question: null, error: error.message }
  }
}

/**
 * Archive a test question (soft delete)
 * @param {string} questionId - The question UUID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const archiveTestQuestion = async (questionId) => {
  const { question, error } = await updateTestQuestion(questionId, { is_active: false })
  return { success: !!question, error }
}

// ============================================================
// Test Runs CRUD
// ============================================================

/**
 * Get test runs with optional filtering
 * @param {Object} options - Filter options
 * @param {number} [options.limit=20] - Max number of runs to return
 * @param {string} [options.status] - Filter by status
 * @returns {Promise<{runs: Array, error?: string}>}
 */
export const getTestRuns = async (options = {}) => {
  const { limit = 20, status } = options

  try {
    let query = supabase
      .from('prompt_test_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching test runs:', error)
      return { runs: [], error: error.message }
    }

    return { runs: data || [] }
  } catch (error) {
    console.error('Error in getTestRuns:', error)
    return { runs: [], error: error.message }
  }
}

/**
 * Create a new test run
 * @param {Object} runData - Run configuration
 * @param {string} runData.model_id - The model ID to use
 * @param {string} [runData.model_label] - Human-readable model label
 * @param {string} [runData.run_label] - Optional label for this run
 * @param {number} runData.total_questions - Total number of questions
 * @param {string} userId - The creating user's ID
 * @returns {Promise<{run: Object|null, error?: string}>}
 */
export const createTestRun = async (runData, userId) => {
  if (!runData.model_id || !userId) {
    return { run: null, error: 'model_id and userId are required' }
  }

  try {
    const { data, error } = await supabase
      .from('prompt_test_runs')
      .insert({
        model_id: runData.model_id,
        model_label: runData.model_label || runData.model_id,
        run_label: runData.run_label || null,
        total_questions: runData.total_questions || 0,
        completed_questions: 0,
        status: 'pending',
        created_by: userId,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating test run:', error)
      return { run: null, error: error.message }
    }

    return { run: data }
  } catch (error) {
    console.error('Error in createTestRun:', error)
    return { run: null, error: error.message }
  }
}

/**
 * Update a test run
 * @param {string} runId - The run UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<{run: Object|null, error?: string}>}
 */
export const updateTestRun = async (runId, updates) => {
  if (!runId) {
    return { run: null, error: 'Run ID is required' }
  }

  try {
    const { data, error } = await supabase
      .from('prompt_test_runs')
      .update(updates)
      .eq('id', runId)
      .select()
      .single()

    if (error) {
      console.error('Error updating test run:', error)
      return { run: null, error: error.message }
    }

    return { run: data }
  } catch (error) {
    console.error('Error in updateTestRun:', error)
    return { run: null, error: error.message }
  }
}

/**
 * Get a test run with all its results
 * @param {string} runId - The run UUID
 * @returns {Promise<{run: Object|null, results: Array, error?: string}>}
 */
export const getTestRunWithResults = async (runId) => {
  if (!runId) {
    return { run: null, results: [], error: 'Run ID is required' }
  }

  try {
    // Fetch run
    const { data: runData, error: runError } = await supabase
      .from('prompt_test_runs')
      .select('*')
      .eq('id', runId)
      .single()

    if (runError) {
      console.error('Error fetching test run:', runError)
      return { run: null, results: [], error: runError.message }
    }

    // Fetch results
    const { data: resultsData, error: resultsError } = await supabase
      .from('prompt_test_results')
      .select('*')
      .eq('run_id', runId)
      .order('created_at', { ascending: true })

    if (resultsError) {
      console.error('Error fetching test results:', resultsError)
      return { run: runData, results: [], error: resultsError.message }
    }

    return { run: runData, results: resultsData || [] }
  } catch (error) {
    console.error('Error in getTestRunWithResults:', error)
    return { run: null, results: [], error: error.message }
  }
}

// ============================================================
// Test Results CRUD
// ============================================================

/**
 * Create a test result record
 * @param {Object} result - Result data
 * @returns {Promise<{result: Object|null, error?: string}>}
 */
export const createTestResult = async (result) => {
  if (!result.run_id || !result.question_id) {
    return { result: null, error: 'run_id and question_id are required' }
  }

  try {
    const { data, error } = await supabase
      .from('prompt_test_results')
      .insert({
        run_id: result.run_id,
        question_id: result.question_id,
        test_id_snapshot: result.test_id_snapshot,
        user_message_snapshot: result.user_message_snapshot,
        expected_behavior_snapshot: result.expected_behavior_snapshot || null,
        serin_response: result.serin_response || null,
        response_time_ms: result.response_time_ms || null,
        error_message: result.error_message || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating test result:', error)
      return { result: null, error: error.message }
    }

    return { result: data }
  } catch (error) {
    console.error('Error in createTestResult:', error)
    return { result: null, error: error.message }
  }
}

/**
 * Rate a test result
 * @param {string} resultId - The result UUID
 * @param {Object} ratingData - Rating data
 * @param {number} ratingData.rating - Rating 1-10
 * @param {string} [ratingData.whats_good] - What's good about the response
 * @param {string} [ratingData.whats_to_change] - What needs to change
 * @param {string} userId - The rating user's ID
 * @returns {Promise<{result: Object|null, error?: string}>}
 */
export const rateTestResult = async (resultId, ratingData, userId) => {
  if (!resultId || !ratingData.rating) {
    return { result: null, error: 'resultId and rating are required' }
  }

  if (ratingData.rating < 1 || ratingData.rating > 10) {
    return { result: null, error: 'Rating must be between 1 and 10' }
  }

  try {
    const { data, error } = await supabase
      .from('prompt_test_results')
      .update({
        rating: ratingData.rating,
        whats_good: ratingData.whats_good || null,
        whats_to_change: ratingData.whats_to_change || null,
        rated_at: new Date().toISOString(),
        rated_by: userId,
      })
      .eq('id', resultId)
      .select()
      .single()

    if (error) {
      console.error('Error rating test result:', error)
      return { result: null, error: error.message }
    }

    // Update the run's average rating
    await updateRunRatingStats(data.run_id)

    return { result: data }
  } catch (error) {
    console.error('Error in rateTestResult:', error)
    return { result: null, error: error.message }
  }
}

/**
 * Update notes for a test result (without changing rating)
 * @param {string} resultId - The result UUID
 * @param {Object} notes - Notes data
 * @param {string} [notes.whats_good] - What's good about the response
 * @param {string} [notes.whats_to_change] - What needs to change
 * @returns {Promise<{result: Object|null, error?: string}>}
 */
export const updateTestResultNotes = async (resultId, notes) => {
  if (!resultId) {
    return { result: null, error: 'resultId is required' }
  }

  try {
    const updates = {}
    if (notes.whats_good !== undefined) {
      updates.whats_good = notes.whats_good || null
    }
    if (notes.whats_to_change !== undefined) {
      updates.whats_to_change = notes.whats_to_change || null
    }

    const { data, error } = await supabase
      .from('prompt_test_results')
      .update(updates)
      .eq('id', resultId)
      .select()
      .single()

    if (error) {
      console.error('Error updating test result notes:', error)
      return { result: null, error: error.message }
    }

    return { result: data }
  } catch (error) {
    console.error('Error in updateTestResultNotes:', error)
    return { result: null, error: error.message }
  }
}

/**
 * Update a run's average rating statistics
 * @param {string} runId - The run UUID
 */
const updateRunRatingStats = async (runId) => {
  try {
    const { data: results, error } = await supabase
      .from('prompt_test_results')
      .select('rating')
      .eq('run_id', runId)
      .not('rating', 'is', null)

    if (error) {
      console.error('Error fetching ratings for stats:', error)
      return
    }

    const ratedResults = results || []
    const ratedCount = ratedResults.length
    const avgRating = ratedCount > 0
      ? ratedResults.reduce((sum, r) => sum + r.rating, 0) / ratedCount
      : null

    await supabase
      .from('prompt_test_runs')
      .update({
        avg_rating: avgRating ? Math.round(avgRating * 10) / 10 : null,
        rated_count: ratedCount,
      })
      .eq('id', runId)
  } catch (error) {
    console.error('Error updating run rating stats:', error)
  }
}

// ============================================================
// Test Execution
// ============================================================

/**
 * Execute a single test question against Serin
 * @param {Object} question - The question to test
 * @param {string} modelId - The model ID to use
 * @returns {Promise<{response: string|null, responseTimeMs: number, error?: string}>}
 */
export const executeTestQuestion = async (question, modelId) => {
  const startTime = Date.now()

  try {
    const model = getModelById(modelId)
    if (!model) {
      return { response: null, responseTimeMs: 0, error: `Model ${modelId} not found` }
    }

    const systemInstruction = getSerinSystemInstruction([])

    const messages = [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: question.user_message }
    ]

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider: model.provider,
        model: model.apiName,
        messages: messages,
      }),
    })

    const responseTimeMs = Date.now() - startTime

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        response: null,
        responseTimeMs,
        error: errorData.error || `API request failed with status ${response.status}`
      }
    }

    const data = await response.json()
    const text = model.provider === 'google' ? data.text : data.choices?.[0]?.message?.content

    return {
      response: text || '',
      responseTimeMs,
    }
  } catch (error) {
    const responseTimeMs = Date.now() - startTime
    console.error('Error executing test question:', error)
    return {
      response: null,
      responseTimeMs,
      error: error.message
    }
  }
}

/**
 * Execute a full test run
 * @param {string} runId - The run UUID
 * @param {Array} questions - Array of questions to test
 * @param {string} modelId - The model ID to use
 * @param {Function} [onProgress] - Callback for progress updates (completedCount, totalCount)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const executeTestRun = async (runId, questions, modelId, onProgress) => {
  try {
    // Update run status to running
    await updateTestRun(runId, {
      status: 'running',
      started_at: new Date().toISOString(),
    })

    let completedCount = 0
    const totalCount = questions.length

    // Execute questions sequentially to avoid rate limiting
    for (const question of questions) {
      const { response, responseTimeMs, error } = await executeTestQuestion(question, modelId)

      // Create result record
      await createTestResult({
        run_id: runId,
        question_id: question.id,
        test_id_snapshot: question.test_id,
        user_message_snapshot: question.user_message,
        expected_behavior_snapshot: question.expected_behavior,
        serin_response: response,
        response_time_ms: responseTimeMs,
        error_message: error || null,
      })

      completedCount++

      // Update progress
      await updateTestRun(runId, { completed_questions: completedCount })

      if (onProgress) {
        onProgress(completedCount, totalCount)
      }

      // Small delay between requests to avoid rate limiting
      if (completedCount < totalCount) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    // Update run status to completed
    await updateTestRun(runId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    })

    return { success: true }
  } catch (error) {
    console.error('Error executing test run:', error)

    // Update run status to failed
    await updateTestRun(runId, {
      status: 'failed',
      completed_at: new Date().toISOString(),
    })

    return { success: false, error: error.message }
  }
}
