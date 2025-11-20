import { useId, useMemo } from 'react'

const ModelSelector = ({
  value,
  availableModels = [],
  onChange,
  disabled = false,
  isLocked = false,
}) => {
  const selectorId = useId()

  const selectedLabel = useMemo(() => {
    const match = availableModels.find((model) => model.id === value)
    return match?.label ?? value
  }, [availableModels, value])

  const handleChange = (event) => {
    if (typeof onChange !== 'function') {
      return
    }
    onChange(event.target.value)
  }

  return (
    <label className="chat-model-selector" htmlFor={selectorId}>
      <span className="chat-model-selector__label">
        Model
        {isLocked && <span className="chat-model-selector__lock-pill">Locked</span>}
      </span>
      <select
        id={selectorId}
        className="chat-model-selector__input"
        value={value}
        onChange={handleChange}
        disabled={disabled || isLocked}
        aria-label="Text model selection"
        title={isLocked ? `Locked to ${selectedLabel}` : 'Select a model for new chats'}
      >
        {availableModels.map((model) => (
          <option key={model.id} value={model.id} disabled={!model.available}>
            {model.label}{!model.available ? ' (API key missing)' : ''}
          </option>
        ))}
      </select>
      {isLocked && (
        <span className="chat-model-selector__lock-note">
          {`This chat uses ${selectedLabel}. Start a new chat to switch.`}
        </span>
      )}
    </label>
  )
}

export default ModelSelector

