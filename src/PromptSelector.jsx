import { useId, useMemo } from 'react'

const PromptSelector = ({
  value,
  availablePrompts = [],
  onChange,
  disabled = false,
  isLocked = false,
}) => {
  const selectorId = useId()

  const selectedLabel = useMemo(() => {
    const match = availablePrompts.find((prompt) => prompt.id === value)
    return match?.label ?? value
  }, [availablePrompts, value])

  const handleChange = (event) => {
    if (typeof onChange !== 'function') {
      return
    }
    onChange(event.target.value)
  }

  return (
    <label className="chat-prompt-selector" htmlFor={selectorId}>
      <span className="chat-prompt-selector__label">
        Prompt
        {isLocked && <span className="chat-prompt-selector__lock-pill">Locked</span>}
      </span>
      <select
        id={selectorId}
        className="chat-prompt-selector__input"
        value={value}
        onChange={handleChange}
        disabled={disabled || isLocked}
        aria-label="Prompt selection"
        title={isLocked ? `Locked to ${selectedLabel}` : 'Select a prompt for new chats'}
      >
        {availablePrompts.map((prompt) => (
          <option key={prompt.id} value={prompt.id}>
            {prompt.label}
          </option>
        ))}
      </select>
      {isLocked && (
        <span className="chat-prompt-selector__lock-note">
          {`This chat uses ${selectedLabel}. Start a new chat to switch.`}
        </span>
      )}
    </label>
  )
}

export default PromptSelector
