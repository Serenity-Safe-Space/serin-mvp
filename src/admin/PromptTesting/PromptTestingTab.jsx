import { useEffect, useState, useCallback } from 'react'
import { getTestRuns, getTestRunWithResults } from '../../lib/promptTestingService'
import TestRunHistory from './TestRunHistory'
import TestResultsList from './TestResultsList'
import TestRunExecutor from './TestRunExecutor'
import './PromptTestingTab.css'

/**
 * Main container for Prompt Testing feature
 * Allows super admins to run tests, view results, and rate responses
 */
const PromptTestingTab = () => {
  const [runs, setRuns] = useState([])
  const [selectedRunId, setSelectedRunId] = useState(null)
  const [results, setResults] = useState([])
  const [selectedRun, setSelectedRun] = useState(null)
  const [loading, setLoading] = useState(true)
  const [resultsLoading, setResultsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showExecutor, setShowExecutor] = useState(false)

  // Load test runs on mount
  useEffect(() => {
    const loadRuns = async () => {
      setLoading(true)
      setError(null)
      try {
        const { runs: fetchedRuns, error: runsError } = await getTestRuns({ limit: 50 })
        if (runsError) {
          throw new Error(runsError)
        }
        setRuns(fetchedRuns)
        // Auto-select the most recent run if available
        if (fetchedRuns.length > 0 && !selectedRunId) {
          setSelectedRunId(fetchedRuns[0].id)
        }
      } catch (err) {
        console.error('Failed to load test runs:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadRuns()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load results when selected run changes
  useEffect(() => {
    if (!selectedRunId) {
      setResults([])
      setSelectedRun(null)
      return
    }

    const loadResults = async () => {
      setResultsLoading(true)
      try {
        const { run, results: fetchedResults, error: resultsError } = await getTestRunWithResults(selectedRunId)
        if (resultsError) {
          throw new Error(resultsError)
        }
        setSelectedRun(run)
        setResults(fetchedResults)
      } catch (err) {
        console.error('Failed to load test results:', err)
        setError(err.message)
      } finally {
        setResultsLoading(false)
      }
    }

    loadResults()
  }, [selectedRunId])

  const handleSelectRun = useCallback((runId) => {
    setSelectedRunId(runId)
    setShowExecutor(false)
  }, [])

  const handleRunStart = useCallback((run) => {
    setRuns(prev => [run, ...prev])
    setSelectedRunId(run.id)
  }, [])

  const handleRunComplete = useCallback(async (runId) => {
    // Refresh the runs list
    const { runs: freshRuns } = await getTestRuns({ limit: 50 })
    setRuns(freshRuns)

    // Load the completed run's results
    setSelectedRunId(runId)
    setShowExecutor(false)
  }, [])

  const handleResultUpdate = useCallback((updatedResult) => {
    setResults(prev =>
      prev.map(r => (r.id === updatedResult.id ? updatedResult : r))
    )

    // Also update the run's rating stats in the runs list
    setRuns(prev =>
      prev.map(run => {
        if (run.id === updatedResult.run_id) {
          // Recalculate avg rating from current results
          const currentResults = results.map(r =>
            r.id === updatedResult.id ? updatedResult : r
          )
          const ratedResults = currentResults.filter(r => r.rating)
          const ratedCount = ratedResults.length
          const avgRating = ratedCount > 0
            ? ratedResults.reduce((sum, r) => sum + r.rating, 0) / ratedCount
            : null
          return {
            ...run,
            avg_rating: avgRating ? Math.round(avgRating * 10) / 10 : null,
            rated_count: ratedCount,
          }
        }
        return run
      })
    )
  }, [results])

  const handleToggleExecutor = useCallback(() => {
    setShowExecutor(prev => !prev)
  }, [])

  if (loading) {
    return (
      <div className="prompt-testing-tab">
        <div className="prompt-testing-tab__loading">
          Loading test runs...
        </div>
      </div>
    )
  }

  return (
    <div className="prompt-testing-tab">
      <div className="prompt-testing-tab__header">
        <h2 className="prompt-testing-tab__title">Prompt Testing</h2>
        <button
          type="button"
          className={`prompt-testing-tab__new-test-btn ${showExecutor ? 'prompt-testing-tab__new-test-btn--active' : ''}`}
          onClick={handleToggleExecutor}
        >
          {showExecutor ? 'Cancel' : 'Run New Test'}
        </button>
      </div>

      {error && (
        <div className="prompt-testing-tab__error">
          {error}
        </div>
      )}

      <div className="prompt-testing-tab__content">
        <div className="prompt-testing-tab__sidebar">
          {showExecutor ? (
            <TestRunExecutor
              onRunStart={handleRunStart}
              onRunComplete={handleRunComplete}
            />
          ) : (
            <TestRunHistory
              runs={runs}
              selectedRunId={selectedRunId}
              onSelectRun={handleSelectRun}
              disabled={resultsLoading}
            />
          )}
        </div>

        <div className="prompt-testing-tab__main">
          {resultsLoading ? (
            <div className="prompt-testing-tab__results-loading">
              Loading results...
            </div>
          ) : selectedRun ? (
            <>
              <div className="prompt-testing-tab__run-info">
                <div className="prompt-testing-tab__run-info-row">
                  <span className="prompt-testing-tab__run-label">
                    {selectedRun.run_label || 'Test Run'}
                  </span>
                  <span className={`prompt-testing-tab__run-status prompt-testing-tab__run-status--${selectedRun.status}`}>
                    {selectedRun.status}
                  </span>
                </div>
                <div className="prompt-testing-tab__run-meta">
                  <span>
                    {new Date(selectedRun.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}, {new Date(selectedRun.created_at).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </span>
                  <span>{selectedRun.model_label || selectedRun.model_id}</span>
                  <span>{selectedRun.rated_count || 0}/{selectedRun.total_questions} rated</span>
                  {selectedRun.avg_rating && (
                    <span>Avg: {selectedRun.avg_rating.toFixed(1)}</span>
                  )}
                </div>
              </div>
              <TestResultsList
                results={results}
                onResultUpdate={handleResultUpdate}
              />
            </>
          ) : (
            <div className="prompt-testing-tab__no-selection">
              {runs.length === 0
                ? 'No test runs yet. Click "Run New Test" to get started.'
                : 'Select a test run to view results.'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PromptTestingTab
