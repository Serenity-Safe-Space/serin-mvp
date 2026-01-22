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
      const timeStr = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
      const dateTimeStr = `${dateStr}, ${timeStr}`

      const avgRating = run.avg_rating ? run.avg_rating.toFixed(1) : '-'
      const ratedInfo = run.rated_count > 0
        ? `${run.rated_count}/${run.total_questions}`
        : '0'

      return {
        id: run.id,
        label: run.run_label || dateStr,
        model: run.model_label || run.model_id,
        date: dateStr,
        time: timeStr,
        dateTime: dateTimeStr,
        avgRating,
        ratedInfo,
        status: run.status,
      }
    }
  }, [])

  const options = useMemo(() => {
    return runs.map(formatRunOption)
  }, [runs, formatRunOption])

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
            {option.dateTime} • {option.label} • Avg: {option.avgRating}
          </option>
        ))}
      </select>
    </div>
  )
}

export default TestRunHistory
