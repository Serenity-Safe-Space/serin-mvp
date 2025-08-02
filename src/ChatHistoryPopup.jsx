import { useState, useEffect } from 'react'
import { useAuth } from './contexts/AuthContext'
import { getUserChatSessions } from './lib/chatHistoryService'
import './ChatHistoryPopup.css'

function ChatHistoryPopup({ isVisible, onClose, onBackToProfile, onSelectChat }) {
  const { user } = useAuth()
  const [chatSessions, setChatSessions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Load chat sessions when popup becomes visible
  useEffect(() => {
    const loadChatSessions = async () => {
      if (!isVisible || !user) return
      
      setIsLoading(true)
      setError(null)
      
      try {
        const { sessions, error } = await getUserChatSessions(user.id)
        if (error) {
          setError(error)
        } else {
          setChatSessions(sessions)
        }
      } catch (err) {
        setError('Failed to load chat history')
        console.error('Error loading chat sessions:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadChatSessions()
  }, [isVisible, user])

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const chatDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: false
    })
    
    if (chatDate.getTime() === today.getTime()) {
      return `Today, ${timeStr}`
    } else if (chatDate.getTime() === yesterday.getTime()) {
      return `Yesterday, ${timeStr}`
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: false
      })
    }
  }

  const handleChatClick = (sessionId) => {
    onSelectChat(sessionId)
  }

  if (!isVisible) return null

  return (
    <div className="chat-history-popup-overlay" onClick={onClose}>
      <div className="chat-history-popup" onClick={(e) => e.stopPropagation()}>
        <div className="chat-history-header">
          <button className="chat-history-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="chat-history-content">
          <div className="chat-history-avatar">
            <img src="/llama.png" alt="Serin the llama" className="llama-image" />
          </div>

          <h2 className="chat-history-title">Chat History</h2>

          <div className="chat-history-list">
            {isLoading && (
              <div className="chat-history-loading">
                Loading your chats...
              </div>
            )}
            
            {error && (
              <div className="chat-history-error">
                {error}
              </div>
            )}
            
            {!isLoading && !error && chatSessions.length === 0 && (
              <div className="chat-history-empty">
                No chat history yet. Start a conversation to see it here!
              </div>
            )}
            
            {!isLoading && !error && chatSessions.map((session) => (
              <div 
                key={session.id} 
                className="chat-history-item" 
                onClick={() => handleChatClick(session.id)}
              >
                <div className="chat-preview">{session.title}</div>
                <div className="chat-date">{formatDate(session.updated_at)}</div>
              </div>
            ))}
          </div>

          <div className="chat-history-footer">
            Learn about my data
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatHistoryPopup