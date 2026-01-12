import './VoiceModeOverlay.css'

function VoiceModeOverlay({
  isVisible,
  onClose,
  isRecording,
  isPlaying,
  isLoading,
  isError,
  onTapToPause
}) {
  if (!isVisible) return null

  // Determine status text and waveform state
  const getStatus = () => {
    if (isError) return 'Connection failed'
    if (isLoading) return 'Connecting...'
    if (isPlaying) return 'Speaking...'
    if (isRecording) return 'Listening...'
    return 'Tap to start'
  }

  const getWaveformState = () => {
    if (isError) return 'error'
    if (isLoading) return 'loading'
    if (isPlaying) return 'speaking'
    if (isRecording) return 'listening'
    return 'paused'
  }

  const handleTapArea = (e) => {
    e.stopPropagation()
    if (onTapToPause) {
      onTapToPause()
    }
  }

  const handleClose = (e) => {
    e.stopPropagation()
    if (onClose) {
      onClose()
    }
  }

  return (
    <div className="voice-overlay">
      {/* Tap area for pause - behind everything */}
      <div className="voice-tap-area" onClick={handleTapArea} />

      {/* Close Button */}
      <button className="voice-close-btn" onClick={handleClose} aria-label="Close voice mode">
        <svg viewBox="0 0 24 24" fill="none">
          <path
            d="M18 6L6 18M6 6l12 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Main Content */}
      <div className="voice-content">
        {/* Avatar Section */}
        <div className="voice-avatar-section">
          <div className="voice-avatar-circle">
            <div className="voice-inner-glow" />
            <img
              src="/serin-llama.png"
              alt="Serin"
              className="voice-llama-img"
            />
            <span className="voice-timer-badge">2:00</span>
          </div>
        </div>

        {/* Prompt Text */}
        <h2 className="voice-prompt">What's on your mind today?</h2>

        {/* Status Indicator */}
        <p className="voice-status">{getStatus()}</p>
      </div>

      {/* Bottom Section */}
      <div className="voice-bottom">
        {/* Waveform Visualization */}
        <div className={`voice-waveform ${getWaveformState()}`}>
          <div className="waveform-bar" />
          <div className="waveform-bar" />
          <div className="waveform-bar" />
          <div className="waveform-bar" />
          <div className="waveform-bar" />
          <div className="waveform-bar" />
          <div className="waveform-bar" />
        </div>

        {/* Tap to Pause Text */}
        <p className="voice-tap-text">Tap to pause</p>
      </div>
    </div>
  )
}

export default VoiceModeOverlay
