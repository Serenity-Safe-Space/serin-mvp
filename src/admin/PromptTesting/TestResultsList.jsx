import { useState, useCallback } from 'react'
import RatingInput from './RatingInput'
import { rateTestResult, updateTestResultNotes } from '../../lib/promptTestingService'
import { useAuth } from '../../contexts/AuthContext'
import './TestResultsList.css'

/**
 * List view showing all test results with inline rating
 * Displays user message, Serin response, and rating controls
 */
const TestResultsList = ({ results, onResultUpdate }) => {
  const { user } = useAuth()
  const [savingIds, setSavingIds] = useState(new Set())

  const handleRatingChange = useCallback(async (resultId, rating) => {
    if (!user?.id) return

    setSavingIds(prev => new Set(prev).add(resultId))

    try {
      const { result, error } = await rateTestResult(resultId, { rating }, user.id)
      if (error) {
        console.error('Failed to save rating:', error)
      } else if (onResultUpdate) {
        onResultUpdate(result)
      }
    } finally {
      setSavingIds(prev => {
        const next = new Set(prev)
        next.delete(resultId)
        return next
      })
    }
  }, [user?.id, onResultUpdate])

  const handleNotesBlur = useCallback(async (resultId, field, value) => {
    setSavingIds(prev => new Set(prev).add(resultId))

    try {
      const { result, error } = await updateTestResultNotes(resultId, { [field]: value })
      if (error) {
        console.error('Failed to save notes:', error)
      } else if (onResultUpdate) {
        onResultUpdate(result)
      }
    } finally {
      setSavingIds(prev => {
        const next = new Set(prev)
        next.delete(resultId)
        return next
      })
    }
  }, [onResultUpdate])

  if (!results || results.length === 0) {
    return (
      <div className="test-results-list__empty">
        No test results to display. Run a test to see results here.
      </div>
    )
  }

  return (
    <div className="test-results-list">
      {results.map((result) => (
        <TestResultItem
          key={result.id}
          result={result}
          isSaving={savingIds.has(result.id)}
          onRatingChange={handleRatingChange}
          onNotesBlur={handleNotesBlur}
        />
      ))}
    </div>
  )
}

const TestResultItem = ({ result, isSaving, onRatingChange, onNotesBlur }) => {
  const [whatsGood, setWhatsGood] = useState(result.whats_good || '')
  const [whatsToChange, setWhatsToChange] = useState(result.whats_to_change || '')

  const handleWhatsGoodBlur = useCallback(() => {
    if (whatsGood !== (result.whats_good || '')) {
      onNotesBlur(result.id, 'whats_good', whatsGood)
    }
  }, [result.id, result.whats_good, whatsGood, onNotesBlur])

  const handleWhatsToChangeBlur = useCallback(() => {
    if (whatsToChange !== (result.whats_to_change || '')) {
      onNotesBlur(result.id, 'whats_to_change', whatsToChange)
    }
  }, [result.id, result.whats_to_change, whatsToChange, onNotesBlur])

  const getRatingClass = (rating) => {
    if (!rating) return ''
    if (rating <= 3) return 'test-result-item__rating-badge--low'
    if (rating <= 5) return 'test-result-item__rating-badge--medium-low'
    if (rating <= 7) return 'test-result-item__rating-badge--medium-high'
    return 'test-result-item__rating-badge--high'
  }

  return (
    <div className={`test-result-item ${isSaving ? 'test-result-item--saving' : ''}`}>
      <div className="test-result-item__header">
        <span className="test-result-item__test-id">{result.test_id_snapshot}</span>
        <div className="test-result-item__header-right">
          {result.response_time_ms && (
            <span className="test-result-item__response-time">
              {result.response_time_ms}ms
            </span>
          )}
          {result.rating && (
            <span className={`test-result-item__rating-badge ${getRatingClass(result.rating)}`}>
              {result.rating}
            </span>
          )}
        </div>
      </div>

      <div className="test-result-item__content">
        <div className="test-result-item__message">
          <span className="test-result-item__label">User:</span>
          <p className="test-result-item__text">{result.user_message_snapshot}</p>
        </div>

        {result.expected_behavior_snapshot && (
          <div className="test-result-item__expected">
            <span className="test-result-item__label">Expected:</span>
            <p className="test-result-item__text test-result-item__text--muted">
              {result.expected_behavior_snapshot}
            </p>
          </div>
        )}

        <div className="test-result-item__response">
          <span className="test-result-item__label">Serin:</span>
          {result.error_message ? (
            <p className="test-result-item__text test-result-item__text--error">
              Error: {result.error_message}
            </p>
          ) : (
            <p className="test-result-item__text">{result.serin_response || 'No response'}</p>
          )}
        </div>
      </div>

      <div className="test-result-item__rating-section">
        <RatingInput
          value={result.rating}
          onChange={(rating) => onRatingChange(result.id, rating)}
          disabled={isSaving}
        />
      </div>

      <div className="test-result-item__notes">
        <div className="test-result-item__note-field">
          <input
            type="text"
            className="test-result-item__note-input test-result-item__note-input--good"
            placeholder="What's good about this response..."
            value={whatsGood}
            onChange={(e) => setWhatsGood(e.target.value)}
            onBlur={handleWhatsGoodBlur}
            disabled={isSaving}
          />
        </div>
        <div className="test-result-item__note-field">
          <input
            type="text"
            className="test-result-item__note-input test-result-item__note-input--change"
            placeholder="What needs to change..."
            value={whatsToChange}
            onChange={(e) => setWhatsToChange(e.target.value)}
            onBlur={handleWhatsToChangeBlur}
            disabled={isSaving}
          />
        </div>
      </div>

      {isSaving && <div className="test-result-item__saving-indicator">Saving...</div>}
    </div>
  )
}

export default TestResultsList
