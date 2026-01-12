import { useState, useEffect } from 'react'
import { useAuth } from './contexts/AuthContext'
import { useLanguage } from './contexts/LanguageContext'
import { getUserChatSessions, getChatSession } from './lib/chatHistoryService'
import { getCurrentStreak } from './lib/activityService'
import './ChatHistoryPopup.css'

// Helper: Check if two dates are the same day
const isSameDay = (date1, date2) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

// Helper: Format date for grouping
const formatDateLabel = (date, language) => {
  const locale = language === 'fr' ? 'fr-FR' : 'en-US'
  return date.toLocaleDateString(locale, { month: 'long', day: 'numeric' }).toUpperCase()
}

// Helper: Format time for display
const formatTime = (dateString, language) => {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ''

  const locale = language === 'fr' ? 'fr-FR' : 'en-US'
  return date.toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: language !== 'fr'
  })
}

// Helper: Group sessions by date
const groupSessionsByDate = (sessions, language) => {
  const groups = {}
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  // Sort sessions by date (newest first)
  const sorted = [...sessions].sort((a, b) => {
    const dateA = new Date(a.updated_at || a.created_at)
    const dateB = new Date(b.updated_at || b.created_at)
    return dateB - dateA
  })

  sorted.forEach(session => {
    const sessionDate = new Date(session.updated_at || session.created_at)
    let label

    if (isSameDay(sessionDate, today)) {
      label = language === 'fr' ? "AUJOURD'HUI" : 'TODAY'
    } else if (isSameDay(sessionDate, yesterday)) {
      label = language === 'fr' ? 'HIER' : 'YESTERDAY'
    } else {
      label = formatDateLabel(sessionDate, language)
    }

    if (!groups[label]) groups[label] = []
    groups[label].push(session)
  })

  return groups
}

// Helper: Get icon for session
const getSessionIcon = (channel) => {
  if (channel === 'voice') return '🎤'
  return '💬'
}

// SessionCard component
function SessionCard({ session, summary, onClick, language }) {
  const icon = getSessionIcon(session.channel)
  const time = formatTime(session.updated_at || session.created_at, language)
  const iconClass = session.channel === 'voice' ? 'voice' : 'text'

  return (
    <button className="session-card" onClick={onClick}>
      <div className={`session-icon ${iconClass}`}>
        {icon}
      </div>
      <div className="session-content">
        <div className="session-header">
          <span className="session-title">{session.title || 'Untitled Chat'}</span>
          <span className="session-time">{time}</span>
        </div>
        {summary && (
          <p className="session-summary">{summary}</p>
        )}
      </div>
      <span className="session-chevron">›</span>
    </button>
  )
}

function ChatHistoryPopup({ isVisible, onClose, onSelectChat, onStartNewChat }) {
  const { user } = useAuth()
  const { t, language } = useLanguage()
  const [chatSessions, setChatSessions] = useState([])
  const [sessionSummaries, setSessionSummaries] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [streakCount, setStreakCount] = useState(0)
  const [isClosing, setIsClosing] = useState(false)

  // Load chat sessions and streak when popup becomes visible
  useEffect(() => {
    const loadData = async () => {
      if (!isVisible || !user) return

      setIsLoading(true)
      setLoadError(null)

      try {
        // Load sessions and streak in parallel
        const [sessionsResult, streakResult] = await Promise.all([
          getUserChatSessions(user.id),
          getCurrentStreak(user.id)
        ])

        if (sessionsResult.error) {
          setLoadError(sessionsResult.error || t('chatHistory.errorLoad'))
        } else {
          setChatSessions(sessionsResult.sessions)
          // Load summaries for each session
          loadSessionSummaries(sessionsResult.sessions)
        }

        setStreakCount(streakResult.count || 0)
      } catch (err) {
        setLoadError(t('chatHistory.errorLoad'))
        console.error('Error loading chat sessions:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [isVisible, t, user])

  // Load summaries from last messages
  const loadSessionSummaries = async (sessions) => {
    const summaries = {}

    // Load first few sessions' messages for summaries
    const sessionsToLoad = sessions.slice(0, 10)

    for (const session of sessionsToLoad) {
      try {
        const { messages } = await getChatSession(session.id, user.id)
        if (messages && messages.length > 0) {
          // Get the last assistant message for summary
          const lastAssistantMsg = [...messages]
            .reverse()
            .find(m => m.role === 'assistant')

          if (lastAssistantMsg?.content) {
            // Truncate to ~100 chars
            let summary = lastAssistantMsg.content.trim()
            if (summary.length > 100) {
              summary = summary.substring(0, 100).trim() + '...'
            }
            summaries[session.id] = summary
          }
        }
      } catch (err) {
        // Silently ignore errors loading individual summaries
        console.warn('Could not load summary for session:', session.id)
      }
    }

    setSessionSummaries(summaries)
  }

  // Reset state when popup closes
  useEffect(() => {
    if (!isVisible) {
      setIsClosing(false)
    }
  }, [isVisible])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 250)
  }

  const handleSessionClick = (sessionId) => {
    onSelectChat(sessionId)
  }

  const handleStartNewChat = () => {
    if (typeof onStartNewChat === 'function') {
      onStartNewChat()
    }
  }

  if (!isVisible) return null

  const groupedSessions = groupSessionsByDate(chatSessions, language)

  return (
    <div className={`chat-history-overlay ${isClosing ? 'closing' : ''}`}>
      {/* Header */}
      <div className="chat-history-header">
        <button className="chat-history-back-btn" onClick={handleClose} aria-label="Go back">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="chat-history-title">{t('chatHistory.title')}</h1>
        <div className="chat-history-streak-badge">
          <span>🏠</span>
          <span>{streakCount} {language === 'fr' ? 'Jours' : 'Days'}</span>
        </div>
      </div>

      {/* Session List */}
      <div className="chat-history-list">
        {isLoading && (
          <div className="chat-history-loading">
            <div className="loading-spinner" />
            <p>{t('chatHistory.loading')}</p>
          </div>
        )}

        {loadError && (
          <div className="chat-history-error">
            <p>{loadError}</p>
          </div>
        )}

        {!isLoading && !loadError && chatSessions.length === 0 && (
          <div className="chat-history-empty">
            <span className="chat-history-empty-icon">💬</span>
            <p className="chat-history-empty-text">{t('chatHistory.empty')}</p>
          </div>
        )}

        {!isLoading && !loadError && Object.entries(groupedSessions).map(([dateLabel, sessions]) => (
          <div key={dateLabel} className="chat-history-date-group">
            <h3 className="chat-history-date-label">{dateLabel}</h3>
            {sessions.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                summary={sessionSummaries[session.id]}
                onClick={() => handleSessionClick(session.id)}
                language={language}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="chat-history-footer">
        <button className="chat-history-new-btn" onClick={handleStartNewChat}>
          <span>+</span>
          <span>{t('chatHistory.startNew')}</span>
        </button>
      </div>
    </div>
  )
}

export default ChatHistoryPopup
