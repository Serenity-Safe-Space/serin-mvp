import { useMemo } from 'react'
import './TestRunHistory.css'

/**
 * Dropdown to select from historical test runs
 * Shows date, model, average rating with color coding
 */
const TestRunHistory = ({ runs, selectedRunId, onSelectRun, disabled = false }) => {
  const formatRunOption = useMemo(() => {
    return (run) => {
      const date = new Date(run.created_at)
      const dateStr = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })

      const avgRating = run.avg_rating ? run.avg_rating.toFixed(1) : '-'
      const ratedInfo = run.rated_count > 0
        ? `${run.rated_count}/${run.total_questions}`
        : '0'

      return {
        id: run.id,
        label: run.run_label || dateStr,
        model: run.model_label || run.model_id,
        date: dateStr,
        avgRating,
        ratedInfo,
        status: run.status,
      }
    }
  }, [])

  const options = useMemo(() => {
    return runs.map(formatRunOption)
  }, [runs, formatRunOption])

  const selectedOption = useMemo(() => {
    return options.find(opt => opt.id === selectedRunId)
  }, [options, selectedRunId])

  const getRatingClass = (avgRating) => {
    if (avgRating === '-') return ''
    const rating = parseFloat(avgRating)
    if (rating <= 3) return 'test-run-history__rating--low'
    if (rating <= 5) return 'test-run-history__rating--medium-low'
    if (rating <= 7) return 'test-run-history__rating--medium-high'
    return 'test-run-history__rating--high'
  }

  if (!runs || runs.length === 0) {
    return (
      <div className="test-run-history test-run-history--empty">
        <span className="test-run-history__empty-text">No test runs yet</span>
      </div>
    )
  }

  return (
    <div className={`test-run-history ${disabled ? 'test-run-history--disabled' : ''}`}>
      <select
        className="test-run-history__select"
        value={selectedRunId || ''}
        onChange={(e) => onSelectRun(e.target.value)}
        disabled={disabled}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label} • {option.model} • Avg: {option.avgRating} • {option.ratedInfo} rated
          </option>
        ))}
      </select>

      {selectedOption && (
        <div className="test-run-history__preview">
          <div className="test-run-history__preview-row">
            <span className="test-run-history__preview-label">{selectedOption.label}</span>
            <span className="test-run-history__preview-model">{selectedOption.model}</span>
          </div>
          <div className="test-run-history__preview-stats">
            <span className={`test-run-history__rating ${getRatingClass(selectedOption.avgRating)}`}>
              Avg: {selectedOption.avgRating}
            </span>
            <span className="test-run-history__rated-count">
              {selectedOption.ratedInfo} rated
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default TestRunHistory
