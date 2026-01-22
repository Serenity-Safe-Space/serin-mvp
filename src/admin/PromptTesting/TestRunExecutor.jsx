import { useState, useCallback } from 'react'
import { listTextModels, getModelLabel } from '../../lib/aiModelRegistry'
import { createTestRun, getTestQuestions, executeTestRun } from '../../lib/promptTestingService'
import { useAuth } from '../../contexts/AuthContext'
import './TestRunExecutor.css'

/**
 * One-click test runner with model selector and progress bar
 */
const TestRunExecutor = ({ onRunComplete, onRunStart }) => {
  const { user } = useAuth()
  const [modelId, setModelId] = useState('gemini-2.5-flash')
  const [runLabel, setRunLabel] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState({ completed: 0, total: 0 })
  const [error, setError] = useState(null)

  const models = listTextModels()

  const handleStartTest = useCallback(async () => {
    if (!user?.id) {
      setError('You must be logged in to run tests')
      return
    }

    setIsRunning(true)
    setError(null)
    setProgress({ completed: 0, total: 0 })

    try {
      // Fetch all active test questions
      const { questions, error: questionsError } = await getTestQuestions({ activeOnly: true })
      if (questionsError) {
        throw new Error(questionsError)
      }

      if (questions.length === 0) {
        throw new Error('No test questions found. Add some questions first.')
      }

      setProgress({ completed: 0, total: questions.length })

      // Create the test run
      const { run, error: createError } = await createTestRun(
        {
          model_id: modelId,
          model_label: getModelLabel(modelId),
          run_label: runLabel || null,
          total_questions: questions.length,
        },
        user.id
      )

      if (createError) {
        throw new Error(createError)
      }

      if (onRunStart) {
        onRunStart(run)
      }

      // Execute the test run
      const { error: executeError } = await executeTestRun(
        run.id,
        questions,
        modelId,
        (completed, total) => {
          setProgress({ completed, total })
        }
      )

      if (executeError) {
        throw new Error(executeError)
      }

      // Clear the label after successful run
      setRunLabel('')

      if (onRunComplete) {
        onRunComplete(run.id)
      }
    } catch (err) {
      console.error('Test run failed:', err)
      setError(err.message)
    } finally {
      setIsRunning(false)
    }
  }, [user?.id, modelId, runLabel, onRunStart, onRunComplete])

  const progressPercent = progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0

  return (
    <div className="test-run-executor">
      <div className="test-run-executor__header">
        <h3 className="test-run-executor__title">Run New Test</h3>
      </div>

      <div className="test-run-executor__form">
        <div className="test-run-executor__field">
          <label className="test-run-executor__label" htmlFor="model-select">
            Model
          </label>
          <select
            id="model-select"
            className="test-run-executor__select"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            disabled={isRunning}
          >
            {models.map((model) => (
              <option key={model.id} value={model.id} disabled={!model.available}>
                {model.label} {!model.available && '(unavailable)'}
              </option>
            ))}
          </select>
        </div>

        <div className="test-run-executor__field">
          <label className="test-run-executor__label" htmlFor="run-label">
            Label (optional)
          </label>
          <input
            id="run-label"
            type="text"
            className="test-run-executor__input"
            placeholder="e.g., Post-prompt-update"
            value={runLabel}
            onChange={(e) => setRunLabel(e.target.value)}
            disabled={isRunning}
          />
        </div>

        <button
          type="button"
          className="test-run-executor__button"
          onClick={handleStartTest}
          disabled={isRunning}
        >
          {isRunning ? 'Running...' : 'Run Test Suite'}
        </button>
      </div>

      {isRunning && (
        <div className="test-run-executor__progress">
          <div className="test-run-executor__progress-bar">
            <div
              className="test-run-executor__progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="test-run-executor__progress-text">
            {progress.completed} / {progress.total} questions ({progressPercent}%)
          </div>
        </div>
      )}

      {error && (
        <div className="test-run-executor__error">
          {error}
        </div>
      )}
    </div>
  )
}

export default TestRunExecutor
