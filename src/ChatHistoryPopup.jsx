import { useState, useEffect, useRef, useMemo } from 'react'
import { useAuth } from './contexts/AuthContext'
import { useLanguage } from './contexts/LanguageContext'
import { getUserChatSessions, getChatSession, deleteAllChatSessions } from './lib/chatHistoryService'
import { SERIN_COLORS } from './utils/serinColors'
import { translations } from './i18n/translations'
import './ChatHistoryPopup.css'

const normalizeMessages = (messages = [], initialGreetings = []) => {
  if (!Array.isArray(messages)) {
    return []
  }

  const greetingSet = new Set(
    initialGreetings
      .filter((value) => typeof value === 'string')
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0)
  )

  const safeMessages = messages
    .filter((message) => message && typeof message === 'object')
    .map((message, index) => ({
      ...message,
      __orderIndex: index,
    }))

  const sorted = safeMessages.slice().sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : Number.NEGATIVE_INFINITY
    const timeB = b.created_at ? new Date(b.created_at).getTime() : Number.NEGATIVE_INFINITY

    if (Number.isNaN(timeA) && Number.isNaN(timeB)) {
      return a.__orderIndex - b.__orderIndex
    }
    if (Number.isNaN(timeA)) return -1
    if (Number.isNaN(timeB)) return 1

    if (timeA === timeB) {
      return a.__orderIndex - b.__orderIndex
    }
    return timeA - timeB
  })

  const firstUserIndex = sorted.findIndex((message) => message.role === 'user')

  if (firstUserIndex === -1) {
    return sorted.map(({ __orderIndex, ...message }) => message)
  }

  if (firstUserIndex === 0) {
    return sorted.map(({ __orderIndex, ...message }) => message)
  }

  const beforeUserMessages = sorted.slice(0, firstUserIndex)
  const afterUserMessages = sorted.slice(firstUserIndex + 1)

  const filteredBefore = beforeUserMessages.filter((message) => {
    if (message.role !== 'assistant') {
      return false
    }

    if (greetingSet.size === 0) {
      return true
    }

    if (typeof message.content !== 'string') {
      return true
    }

    const normalizedContent = message.content.trim().toLowerCase()
    return !greetingSet.has(normalizedContent)
  })

  const normalized = [
    sorted[firstUserIndex],
    ...filteredBefore,
    ...afterUserMessages,
  ]

  return normalized.map(({ __orderIndex, ...message }) => message)
}

function ChatHistoryPopup({ isVisible, onClose, onSelectChat, onStartNewChat, activeSessionId = null }) {
  const { user } = useAuth()
  const { t, language } = useLanguage()
  const [chatSessions, setChatSessions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const [selectedSessionId, setSelectedSessionId] = useState(null)
  const [selectedSession, setSelectedSession] = useState(null)
  const [selectedMessages, setSelectedMessages] = useState([])
  const [isSessionLoading, setIsSessionLoading] = useState(false)
  const [sessionMessage, setSessionMessage] = useState({ type: 'idle', text: null })
  const detailScrollRef = useRef(null)
  const initialGreetingCandidates = useMemo(() => {
    const localizedGreeting = t('chat.initialGreeting')
    const englishGreeting = translations.en?.chat?.initialGreeting ?? ''
    const frenchGreeting = translations.fr?.chat?.initialGreeting ?? ''

    return [localizedGreeting, englishGreeting, frenchGreeting]
      .filter((value) => typeof value === 'string')
      .map((value) => value.trim())
      .filter((value, index, array) => value.length > 0 && array.indexOf(value) === index)
  }, [t])

  // Load chat sessions when popup becomes visible
  useEffect(() => {
    const loadChatSessions = async () => {
      if (!isVisible || !user) return
      
      setIsLoading(true)
      setLoadError(null)
      
      try {
        const { sessions, error } = await getUserChatSessions(user.id)
        if (error) {
          setLoadError(error || t('chatHistory.errorLoad'))
        } else {
          setChatSessions(sessions)
        }
      } catch (err) {
        setLoadError(t('chatHistory.errorLoad'))
        console.error('Error loading chat sessions:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadChatSessions()
  }, [isVisible, t, user])

  // Reset selection when popup closes
  useEffect(() => {
    if (!isVisible) {
      setSelectedSessionId(null)
      setSelectedSession(null)
      setSelectedMessages([])
      setSessionMessage({ type: 'idle', text: null })
      setIsSessionLoading(false)
    }
  }, [isVisible])

  // Ensure selected session still exists after list refresh
  useEffect(() => {
    if (!selectedSessionId || chatSessions.length === 0) {
      return
    }

    const sessionStillExists = chatSessions.some((session) => session.id === selectedSessionId)
    if (!sessionStillExists) {
      setSelectedSessionId(null)
      setSelectedSession(null)
      setSelectedMessages([])
      setSessionMessage({ type: 'idle', text: null })
      setIsSessionLoading(false)
    }
  }, [chatSessions, selectedSessionId])

  // Auto-select first previous session when list loads
  useEffect(() => {
    if (!isVisible || selectedSessionId || chatSessions.length === 0) {
      return
    }

    const firstPreviousSession = chatSessions.find((session) => session.id !== activeSessionId)
    if (firstPreviousSession) {
      setSessionMessage({ type: 'idle', text: null })
      setSelectedSession(null)
      setSelectedMessages([])
      setSelectedSessionId(firstPreviousSession.id)
    }
  }, [isVisible, chatSessions, selectedSessionId, activeSessionId])

  // Load selected session details
  useEffect(() => {
    let isCancelled = false

    const loadSessionDetail = async () => {
      if (!isVisible || !user || !selectedSessionId) {
        return
      }

      if (selectedSessionId === activeSessionId) {
        setSelectedSession(null)
        setSelectedMessages([])
        setIsSessionLoading(false)
        setSessionMessage({
          type: 'info',
          text: t('chatHistory.currentSessionNotice'),
        })
        return
      }

      setIsSessionLoading(true)
      setSelectedSession(null)
      setSelectedMessages([])

      try {
        const { session, messages, error } = await getChatSession(selectedSessionId, user.id)

        if (isCancelled) {
          return
        }

        if (error || !session) {
          setSessionMessage({
            type: 'error',
            text: error || t('chatHistory.detailError'),
          })
          return
        }

        setSessionMessage({ type: 'idle', text: null })
        setSelectedSession(session)
        setSelectedMessages(normalizeMessages(messages, initialGreetingCandidates))
      } catch (err) {
        if (!isCancelled) {
          console.error('Error loading chat session detail:', err)
          setSessionMessage({
            type: 'error',
            text: t('chatHistory.detailError'),
          })
        }
      } finally {
        if (!isCancelled) {
          setIsSessionLoading(false)
        }
      }
    }

    loadSessionDetail()

    return () => {
      isCancelled = true
    }
  }, [isVisible, selectedSessionId, user, activeSessionId, t, initialGreetingCandidates])

  useEffect(() => {
    if (detailScrollRef.current) {
      detailScrollRef.current.scrollTop = 0
    }
  }, [selectedMessages])

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) {
      return ''
    }

    const locale = language === 'fr' ? 'fr-FR' : 'en-US'
    const dateFormatter = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' })
    const timeFormatter = new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })

    return `${dateFormatter.format(date)} ${t('chatHistory.dateSeparator')} ${timeFormatter.format(date)}`
  }

  const formatSessionRange = (session) => {
    if (!session) return ''

    const startedAt = session.started_at || session.created_at
    const endedAt = session.ended_at || session.updated_at

    if (!startedAt) {
      return ''
    }

    const startDate = new Date(startedAt)
    const endDate = endedAt ? new Date(endedAt) : null

    if (Number.isNaN(startDate.getTime())) {
      return ''
    }

    const locale = language === 'fr' ? 'fr-FR' : 'en-US'
    const dateFormatter = new Intl.DateTimeFormat(locale, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    const timeFormatter = new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })

    const startTime = timeFormatter.format(startDate)
    const endTime = endDate && !Number.isNaN(endDate.getTime())
      ? ` - ${timeFormatter.format(endDate)}`
      : ''

    return `${dateFormatter.format(startDate)} • ${startTime}${endTime}`
  }

  const formatChannelLabel = (channel) => {
    if (channel === 'voice') {
      return t('chatHistory.channelVoice')
    }

    if (channel === 'text') {
      return t('chatHistory.channelText')
    }

    return t('chatHistory.channelUnknown')
  }

  const handleChatClick = (sessionId) => {
    if (showDeleteConfirm) {
      return
    }

    if (sessionId === selectedSessionId) {
      return
    }

    setSessionMessage({ type: 'idle', text: null })
    setSelectedSession(null)
    setSelectedMessages([])
    setSelectedSessionId(sessionId)
  }

  const handleDeleteAll = () => {
    setDeleteError(null)
    setShowDeleteConfirm(true)
  }

  const handleStartNewChat = () => {
    if (typeof onStartNewChat === 'function') {
      onStartNewChat()
    }
  }

  const handleCancelDelete = () => {
    if (isDeleting) return
    setShowDeleteConfirm(false)
    setDeleteError(null)
  }

  const handleConfirmDelete = async () => {
    if (!user || isDeleting) return

    setIsDeleting(true)
    setDeleteError(null)

    try {
      const { success, error: deleteError } = await deleteAllChatSessions(user.id)
      if (!success && deleteError) {
        setDeleteError(deleteError || t('chatHistory.errorDelete'))
        return
      }

      setChatSessions([])
      setShowDeleteConfirm(false)
    } catch (err) {
      console.error('Error deleting all chat sessions:', err)
      setDeleteError(t('chatHistory.errorDelete'))
    } finally {
      setIsDeleting(false)
    }
  }

  if (!isVisible) return null

  const isCurrentSessionSelected = Boolean(selectedSessionId && selectedSessionId === activeSessionId)
  const canContinueChat = Boolean(selectedSessionId) && !isCurrentSessionSelected

  return (
    <div className="chat-history-popup-overlay" onClick={onClose}>
      <div
        className={`chat-history-popup${showDeleteConfirm ? ' is-confirming' : ''}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          '--chat-history-surface': SERIN_COLORS.DEEP_SERIN_PURPLE.hex,
          '--chat-history-primary-text': SERIN_COLORS.COOL_WHITE.hex,
          '--chat-history-secondary-text': SERIN_COLORS.LILAC_GRAY.hex,
          '--chat-history-outline': SERIN_COLORS.SUNBEAM_YELLOW.hex,
          '--chat-history-user-bubble': SERIN_COLORS.SUNBEAM_YELLOW.hex,
          '--chat-history-assistant-bubble': 'rgba(255, 255, 255, 0.08)',
          '--chat-history-scroll-track': 'rgba(255, 255, 255, 0.08)',
          '--chat-history-scroll-thumb': 'rgba(255, 255, 255, 0.35)',
        }}
      >
        <div className="chat-history-topbar">
          <h2 className="chat-history-title">{t('chatHistory.title')}</h2>
          <button className="chat-history-close" onClick={onClose} aria-label={t('chatHistory.closeAria')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="chat-history-layout">
          <div className="chat-history-sidebar">
            <div className="chat-history-list">
              {isLoading && (
                <div className="chat-history-loading">
                  {t('chatHistory.loading')}
                </div>
              )}
              
              {loadError && (
                <div className="chat-history-error">
                  {loadError}
                </div>
              )}
              
              {!isLoading && !loadError && chatSessions.length === 0 && (
                <div className="chat-history-empty">
                  {t('chatHistory.empty')}
                </div>
              )}
              
              {!isLoading && !loadError && chatSessions.map((session) => {
                const isSelected = session.id === selectedSessionId
                const isCurrent = session.id === activeSessionId

                return (
                  <button
                    key={session.id}
                    className={`chat-history-item${isSelected ? ' is-selected' : ''}${isCurrent ? ' is-current' : ''}`}
                    type="button"
                    onClick={() => handleChatClick(session.id)}
                    aria-pressed={isSelected}
                    aria-current={isSelected ? 'true' : undefined}
                  >
                    <div className="chat-preview">
                      <span>{session.title}</span>
                      {isCurrent && (
                        <span className="chat-history-badge">
                          {t('chatHistory.currentChatBadge')}
                        </span>
                      )}
                    </div>
                    <div className="chat-date">{formatDate(session.updated_at)}</div>
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              className="chat-history-new-chat"
              onClick={handleStartNewChat}
              disabled={showDeleteConfirm}
            >
              {t('chatHistory.startNew')}
            </button>

            <button
              type="button"
              className="chat-history-delete"
              onClick={handleDeleteAll}
              disabled={showDeleteConfirm}
            >
              {t('chatHistory.deleteAll')}
            </button>
          </div>

          <div className="chat-history-detail">
            <div className="chat-history-detail-header">
              <div className="chat-history-detail-summary">
                <p className="chat-history-detail-title">
                  {selectedSession?.title || (selectedSessionId ? t('chatHistory.detailTitleFallback') : t('chatHistory.detailTitlePlaceholder'))}
                </p>
                {selectedSession && (
                  <div className="chat-history-detail-meta">
                    <span>{formatSessionRange(selectedSession)}</span>
                    <span>{formatChannelLabel(selectedSession.channel)}</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="chat-history-continue"
                onClick={() => canContinueChat && onSelectChat(selectedSessionId)}
                disabled={!canContinueChat}
              >
                {t('chatHistory.continue')}
              </button>
            </div>

            <div className="chat-history-detail-body">
              {!selectedSessionId && (
                <div className="chat-history-detail-placeholder">
                  {t('chatHistory.detailPlaceholder')}
                </div>
              )}

              {selectedSessionId && isSessionLoading && (
                <div className="chat-history-detail-placeholder is-loading">
                  {t('chatHistory.detailLoading')}
                </div>
              )}

              {selectedSessionId && !isSessionLoading && sessionMessage.text && (
                <div
                  className={`chat-history-detail-placeholder${sessionMessage.type === 'error' ? ' is-error' : ' is-info'}`}
                >
                  {sessionMessage.text}
                </div>
              )}

              {selectedSessionId && !isSessionLoading && !sessionMessage.text && selectedSession && selectedMessages.length === 0 && (
                <div className="chat-history-detail-placeholder">
                  {t('chatHistory.detailEmpty')}
                </div>
              )}

              {selectedSessionId && !isSessionLoading && !sessionMessage.text && selectedSession && selectedMessages.length > 0 && (
                <div className="chat-history-detail-messages" ref={detailScrollRef}>
                  {selectedMessages.map((message, index) => {
                    const roleClass = message.role === 'user' ? 'chat-history-message--user' : 'chat-history-message--assistant'
                    const messageKey = message.id || `${message.role}-${index}`
                    const timestamp = message.created_at ? new Date(message.created_at) : null
                    const timeLabel = timestamp && !Number.isNaN(timestamp.getTime())
                      ? timestamp.toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US')
                      : undefined

                    return (
                      <div
                        key={messageKey}
                        className={`chat-history-message ${roleClass}`}
                        title={timeLabel}
                      >
                        <p>{message.content}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {showDeleteConfirm && (
          <div className="chat-history-confirm-overlay" role="alertdialog" aria-modal="true">
            <div className="chat-history-confirm-card">
              <p className="chat-history-confirm-title">
                {t('chatHistory.deleteConfirmTitle')}
              </p>
              {deleteError && (
                <p className="chat-history-confirm-error" role="alert">
                  {deleteError}
                </p>
              )}
              <div className="chat-history-confirm-actions">
                <button
                  type="button"
                  className="chat-history-confirm-btn chat-history-confirm-btn--cancel"
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                >
                  {t('chatHistory.deleteConfirmCancel')}
                </button>
                <button
                  type="button"
                  className="chat-history-confirm-btn chat-history-confirm-btn--confirm"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? t('chatHistory.deleteConfirmDeleting') : t('chatHistory.deleteConfirmConfirm')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatHistoryPopup
