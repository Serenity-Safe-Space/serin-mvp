import { useState, useEffect } from 'react'
import { useAuth } from './contexts/AuthContext'
import { getUserChatSessions, deleteAllChatSessions } from './lib/chatHistoryService'
import { SERIN_COLORS } from './utils/serinColors'
import './ChatHistoryPopup.css'

function ChatHistoryPopup({ isVisible, onClose, onSelectChat }) {
  const { user } = useAuth()
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
          setLoadError(error)
        } else {
          setChatSessions(sessions)
        }
      } catch (err) {
        setLoadError('Failed to load chat history')
        console.error('Error loading chat sessions:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadChatSessions()
  }, [isVisible, user])

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const month = date.toLocaleString('en-US', { month: 'short' })
    const day = date.getDate()
    const time = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    return `${month} ${day} at ${time}`
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
        setDeleteError(deleteError)
        return
      }

      setChatSessions([])
      setShowDeleteConfirm(false)
    } catch (err) {
      console.error('Error deleting all chat sessions:', err)
      setDeleteError('Failed to delete your chat history. Please try again.')
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
          <button className="chat-history-close" onClick={onClose} aria-label="Close chat history">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="chat-history-content">
          <h2 className="chat-history-title">Chat History</h2>

          <div className="chat-history-list">
            {isLoading && (
              <div className="chat-history-loading">
                Loading your chats...
              </div>
            )}
            
            {loadError && (
              <div className="chat-history-error">
                {loadError}
              </div>
            )}
            
            {!isLoading && !loadError && chatSessions.length === 0 && (
              <div className="chat-history-empty">
                No chat history yet. Start a conversation to see it here!
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
            Delete all my history
          </button>
        </div>
        {showDeleteConfirm && (
          <div className="chat-history-confirm-overlay" role="alertdialog" aria-modal="true">
            <div className="chat-history-confirm-card">
              <p className="chat-history-confirm-title">
                Are you sure you want to delete everything?
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
                  Oops, was a mistake
                </button>
                <button
                  type="button"
                  className="chat-history-confirm-btn chat-history-confirm-btn--confirm"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Yes, I am sure'}
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
