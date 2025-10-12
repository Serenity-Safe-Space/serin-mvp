import { useState, useEffect } from 'react'
import { useAuth } from './contexts/AuthContext'
import { useLanguage } from './contexts/LanguageContext'
import { getUserChatSessions, deleteAllChatSessions } from './lib/chatHistoryService'
import { SERIN_COLORS } from './utils/serinColors'
import './ChatHistoryPopup.css'

function ChatHistoryPopup({ isVisible, onClose, onSelectChat }) {
  const { user } = useAuth()
  const { t, language } = useLanguage()
  const [chatSessions, setChatSessions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

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

  const handleChatClick = (sessionId) => {
    onSelectChat(sessionId)
  }

  const handleDeleteAll = () => {
    setDeleteError(null)
    setShowDeleteConfirm(true)
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
        }}
      >
        <div className="chat-history-header">
          <button className="chat-history-close" onClick={onClose} aria-label={t('chatHistory.closeAria')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="chat-history-content">
          <h2 className="chat-history-title">{t('chatHistory.title')}</h2>

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
            
            {!isLoading && !loadError && chatSessions.map((session) => (
              <button
                key={session.id} 
                className="chat-history-item"
                type="button"
                onClick={() => handleChatClick(session.id)}
              >
                <div className="chat-preview">{session.title}</div>
                <div className="chat-date">{formatDate(session.updated_at)}</div>
              </button>
            ))}
          </div>

          <button
            type="button"
            className="chat-history-delete"
            onClick={handleDeleteAll}
            disabled={showDeleteConfirm}
          >
            {t('chatHistory.deleteAll')}
          </button>
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
