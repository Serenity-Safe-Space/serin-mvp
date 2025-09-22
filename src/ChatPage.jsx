import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { useAuth } from './contexts/AuthContext'
import { recordDailyActivity } from './lib/activityService'
import { createChatSession, saveMessage, getChatSession } from './lib/chatHistoryService'
import { analyzeMoodShift } from './lib/memoryAnalyzer'
import { upsertMoodMemory } from './lib/memoryService'
import { useVoiceToGemini } from './useVoiceToGemini'
import { getSerinPrompt } from './utils/serinPrompt'
import ProfilePopup from './ProfilePopup'
import ChatHistoryPopup from './ChatHistoryPopup'
import SignInModal from './SignInModal'
import SettingsPopup from './SettingsPopup'
import './ChatPage.css'

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)

function ChatPage() {
  const { user } = useAuth()
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [currentMessage, setCurrentMessage] = useState("Gotchu. Let's talk.")
  const [inputValue, setInputValue] = useState('')
  const [chatHistory, setChatHistory] = useState([])
  const [currentSessionId, setCurrentSessionId] = useState(sessionId || null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingSession, setIsLoadingSession] = useState(false)
  const [isFirstMessage, setIsFirstMessage] = useState(true)
  const [hasStartedChat, setHasStartedChat] = useState(false)
  const [isProfilePopupVisible, setIsProfilePopupVisible] = useState(false)
  const [isChatHistoryPopupVisible, setIsChatHistoryPopupVisible] = useState(false)
  const [isSignInModalVisible, setIsSignInModalVisible] = useState(false)
  const [isSettingsPopupVisible, setIsSettingsPopupVisible] = useState(false)
  const [testAudioFiles, setTestAudioFiles] = useState([])
  const [showTestPanel, setShowTestPanel] = useState(false)
  const inputRef = useRef(null)
  const sessionIdRef = useRef(currentSessionId)
  const userRef = useRef(user)
  const pendingAnalysisRef = useRef(null)
  const lastAnalyzedUserMessageRef = useRef(null)
  const voiceTranscriptRef = useRef([])

  const triggerMoodAnalysis = useCallback((history, source = 'text') => {
    if (!userRef.current?.id || !Array.isArray(history)) {
      return
    }

    const sanitizedHistory = history
      .filter((message) => message && typeof message.content === 'string')
      .map((message) => ({
        role: message.role,
        content: message.content.trim()
      }))
      .filter((message) => message.content.length > 0)

    if (sanitizedHistory.length === 0) {
      return
    }

    const recentHistory = sanitizedHistory.slice(-8)
    const userMessages = recentHistory.filter((message) => message.role === 'user')

    if (userMessages.length < 2) {
      return
    }

    const lastUserMessage = userMessages[userMessages.length - 1]
    const lastUserContent = lastUserMessage.content?.trim()

    if (!lastUserContent) {
      return
    }

    const cacheKey = `${source}:${lastUserContent}`

    if (lastAnalyzedUserMessageRef.current === cacheKey) {
      return
    }

    lastAnalyzedUserMessageRef.current = cacheKey

    const analysisPromise = (async () => {
      try {
        const analysis = await analyzeMoodShift(recentHistory)

        if (!analysis || !analysis.transitionDetected || analysis.confidence < 0.55) {
          return
        }

        const result = await upsertMoodMemory({
          userId: userRef.current.id,
          sessionId: sessionIdRef.current,
          triggerSummary: analysis.triggerSummary,
          supportingQuote: analysis.supportingUserQuote,
          keywords: analysis.keywords,
          confidence: analysis.confidence
        })

        if (result.error) {
          console.warn('Failed to store mood memory:', result.error)
        }
      } catch (error) {
        console.error('Mood analysis pipeline error:', error)
      }
    })()

    pendingAnalysisRef.current = analysisPromise

    analysisPromise.finally(() => {
      if (pendingAnalysisRef.current === analysisPromise) {
        pendingAnalysisRef.current = null
      }
    })
  }, [])

  const handleVoiceConversationUpdate = useCallback((message) => {
    if (!message || typeof message.content !== 'string') {
      return
    }

    voiceTranscriptRef.current = [
      ...voiceTranscriptRef.current,
      {
        role: message.role,
        content: message.content.trim()
      }
    ].slice(-12)

    if (message.role === 'user') {
      const snapshot = voiceTranscriptRef.current.slice()
      Promise.resolve().then(() => triggerMoodAnalysis(snapshot, 'voice'))
    }
  }, [triggerMoodAnalysis])

  const { isRecording, isPlaying, isLoading: isVoiceLoading, isError, startRecording, stopRecording, sendTestAudio } = useVoiceToGemini({
    onConversationUpdate: handleVoiceConversationUpdate
  })

  useEffect(() => {
    // Focus input field when component mounts
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  useEffect(() => {
    sessionIdRef.current = currentSessionId
  }, [currentSessionId])

  useEffect(() => {
    userRef.current = user
  }, [user])

  useEffect(() => {
    voiceTranscriptRef.current = []
    lastAnalyzedUserMessageRef.current = null
  }, [currentSessionId, user])

  // Load existing session if sessionId is provided
  useEffect(() => {
    const loadSession = async () => {
      if (sessionId && user) {
        setIsLoadingSession(true)
        try {
          const { session, messages, error } = await getChatSession(sessionId, user.id)
          
          if (error || !session) {
            console.error('Error loading session:', error)
            // Redirect to home if session not found
            navigate('/', { replace: true })
            return
          }

          // Restore chat history
          const formattedHistory = messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
          
          setChatHistory(formattedHistory)
          setCurrentSessionId(session.id)
          setHasStartedChat(formattedHistory.length > 0)
          setIsFirstMessage(formattedHistory.length === 0)
          
          // Set current message to last assistant message or default
          const lastAssistantMessage = formattedHistory
            .filter(msg => msg.role === 'assistant')
            .pop()
          
          if (lastAssistantMessage) {
            setCurrentMessage(lastAssistantMessage.content)
          }
        } catch (error) {
          console.error('Error loading session:', error)
          navigate('/', { replace: true })
        } finally {
          setIsLoadingSession(false)
        }
      } else if (!sessionId) {
        // Reset state for new chat
        setChatHistory([])
        setCurrentSessionId(null)
        setHasStartedChat(false)
        setIsFirstMessage(true)
        setCurrentMessage("Gotchu. Let's talk.")
      }
    }

    loadSession()
  }, [sessionId, user, navigate])

  // Load test audio files in development mode
  useEffect(() => {
    if (import.meta.env.DEV) {
      fetch('/test-audio/audio-files.json')
        .then(response => response.json())
        .then(data => {
          setTestAudioFiles(data.testAudioFiles || [])
        })
        .catch(error => {
          console.warn('Could not load test audio files:', error)
        })
    }
  }, [])


  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    // Record daily activity for chat interaction
    if (user) {
      recordDailyActivity(user.id).catch(error => 
        console.warn('Failed to record daily activity:', error)
      )
    }

    const userMessage = inputValue.trim()
    setInputValue('')
    setCurrentMessage(userMessage)
    setHasStartedChat(true)
    setIsLoading(true)

    try {
      let sessionIdToUse = currentSessionId
      
      // Create new session if this is the first message and user is logged in
      if (!sessionIdToUse && user && isFirstMessage) {
        const { session, error } = await createChatSession(user.id, userMessage)
        if (error) {
          console.error('Error creating session:', error)
        } else if (session) {
          sessionIdToUse = session.id
          setCurrentSessionId(session.id)
          sessionIdRef.current = session.id
          // Update URL to include session ID
          navigate(`/chat/${session.id}`, { replace: true })
        }
      }

      if (sessionIdToUse) {
        sessionIdRef.current = sessionIdToUse
      }

      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })
      
      const prompt = getSerinPrompt(chatHistory, userMessage)
      const result = await model.generateContent(prompt)
      const response = result.response.text()
      
      if (isFirstMessage) {
        setIsFirstMessage(false)
      }

      const newHistory = [
        ...chatHistory,
        { role: 'user', content: userMessage },
        { role: 'assistant', content: response }
      ]

      setChatHistory(newHistory)
      setCurrentMessage(response)
      Promise.resolve().then(() => triggerMoodAnalysis(newHistory, 'text'))

      // Save messages to database if user is logged in and we have a session
      if (user && sessionIdToUse) {
        // Save user message
        saveMessage(sessionIdToUse, 'user', userMessage).catch(error => 
          console.warn('Failed to save user message:', error)
        )
        
        // Save assistant message
        saveMessage(sessionIdToUse, 'assistant', response).catch(error => 
          console.warn('Failed to save assistant message:', error)
        )
      }
    } catch (error) {
      console.error('Error calling Gemini API:', error)
      setCurrentMessage("Sorry, I'm having trouble connecting right now. Try again in a moment.")
    } finally {
      setIsLoading(false)
      // Focus the input field after response
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 100)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage()
    }
  }

  const handleProfileClick = () => {
    setIsProfilePopupVisible(true)
  }

  const handleClosePopup = () => {
    setIsProfilePopupVisible(false)
  }

  const handleSignInClick = () => {
    setIsProfilePopupVisible(false)
    setIsSignInModalVisible(true)
  }

  const handleCloseSignInModal = () => {
    setIsSignInModalVisible(false)
  }

  const handleChatHistoryClick = () => {
    setIsProfilePopupVisible(false)
    setIsChatHistoryPopupVisible(true)
  }

  const handleCloseChatHistory = () => {
    setIsChatHistoryPopupVisible(false)
  }

  const handleBackToProfile = () => {
    setIsChatHistoryPopupVisible(false)
    setIsProfilePopupVisible(true)
  }

  const handleSelectChatHistory = (selectedSessionId) => {
    setIsChatHistoryPopupVisible(false)
    setIsProfilePopupVisible(false)
    
    // Navigate to the selected session
    navigate(`/chat/${selectedSessionId}`)
  }

  const handleSettingsClick = () => {
    setIsProfilePopupVisible(false)
    setIsSettingsPopupVisible(true)
  }

  const handleCloseSettings = () => {
    setIsSettingsPopupVisible(false)
  }

  const handleVoiceButtonClick = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const handleTestAudioClick = async (filename) => {
    try {
      await sendTestAudio(filename)
    } catch (error) {
      console.error('Error sending test audio:', error)
    }
  }

  const toggleTestPanel = () => {
    setShowTestPanel(!showTestPanel)
  }

  return (
    <div className="chat-page">
      <div className="profile-icon" onClick={handleProfileClick}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="white"/>
        </svg>
      </div>

      {/* Development Test Audio Panel */}
      {import.meta.env.DEV && (
        <div className="test-audio-panel">
          <button
            className="test-panel-toggle"
            onClick={toggleTestPanel}
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              background: '#FFEB5B',
              color: '#6B1FAD',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              zIndex: 1000,
              fontFamily: 'Hangyaboly, sans-serif'
            }}
          >
            {showTestPanel ? 'Hide Test' : 'Test Audio'}
          </button>

          {showTestPanel && (
            <div
              className="test-audio-files"
              style={{
                position: 'fixed',
                top: '60px',
                right: '20px',
                background: 'rgba(255, 255, 255, 0.95)',
                border: '2px solid #6B1FAD',
                borderRadius: '12px',
                padding: '16px',
                maxWidth: '200px',
                zIndex: 1000,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
              }}
            >
              <h3 style={{
                margin: '0 0 12px 0',
                fontSize: '14px',
                color: '#6B1FAD',
                fontFamily: 'Hangyaboly, sans-serif'
              }}>
                Test Audio Files
              </h3>
              {testAudioFiles.length > 0 ? (
                testAudioFiles.map((file, index) => (
                  <button
                    key={index}
                    onClick={() => handleTestAudioClick(file.filename)}
                    disabled={isVoiceLoading}
                    style={{
                      display: 'block',
                      width: '100%',
                      margin: '4px 0',
                      padding: '8px 12px',
                      background: isVoiceLoading ? '#ccc' : '#FFEB5B',
                      color: '#6B1FAD',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: isVoiceLoading ? 'not-allowed' : 'pointer',
                      fontFamily: 'Hangyaboly, sans-serif'
                    }}
                  >
                    {file.name}
                  </button>
                ))
              ) : (
                <p style={{
                  margin: 0,
                  fontSize: '12px',
                  color: '#666',
                  fontStyle: 'italic'
                }}>
                  No test audio files found.<br/>
                  Add files to /public/test-audio/
                </p>
              )}
            </div>
          )}
        </div>
      )}
      
      <div className="chat-content">
        <div className="character-container">
          <div className="character-circle">
            <img src="/llama.png" alt="Serin the llama" className="llama-image" />
          </div>
        </div>


        <div className="chat-title-section">
          {isLoadingSession ? (
            <p className="thinking-indicator">Loading chat...</p>
          ) : (
            <>
              <h1 className="chat-main-title">
                {currentMessage}
              </h1>
              {(isLoading || isVoiceLoading) && hasStartedChat && (
                <p className="thinking-indicator">Serin is thinking...</p>
              )}
              {!hasStartedChat && (
                <h2 className="chat-subtitle">Mood's all yours – spill it</h2>
              )}
              {isRecording && (
                <p className="thinking-indicator">Recording...</p>
              )}
              {isPlaying && (
                <p className="thinking-indicator">Serin is speaking...</p>
              )}
              {isError && (
                <p className="error-message">Voice connection error. Please try again.</p>
              )}
            </>
          )}
        </div>

        <div className="chat-input-section">
          <div className="input-container">
            <div className="input-icons">
              <button 
                className={`input-icon voice-icon ${isRecording ? 'recording' : ''}`} 
                onClick={handleVoiceButtonClick}
                disabled={isVoiceLoading}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" fill={isRecording ? "#FF0000" : "#FFEB5B"}/>
                </svg>
              </button>
              <button className="input-icon connection-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" fill="#6B1FAD"/>
                </svg>
              </button>
            </div>
            <input 
              ref={inputRef}
              type="text" 
              placeholder="Write something" 
              className="chat-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <button 
              className="send-button"
              onClick={handleSendMessage}
              disabled={isLoading || !inputValue.trim()}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="#6B1FAD"/>
              </svg>
            </button>
          </div>
          
          <div className="privacy-notice">
            <Link to="/privacy" className="privacy-link">Learn how we use your data</Link>
          </div>
        </div>
      </div>

      <ProfilePopup 
        isVisible={isProfilePopupVisible} 
        onClose={handleClosePopup}
        onSignInClick={handleSignInClick}
        onChatHistoryClick={handleChatHistoryClick}
        onSettingsClick={handleSettingsClick}
      />

      <ChatHistoryPopup 
        isVisible={isChatHistoryPopupVisible}
        onClose={handleCloseChatHistory}
        onBackToProfile={handleBackToProfile}
        onSelectChat={handleSelectChatHistory}
      />

      <SignInModal 
        isVisible={isSignInModalVisible}
        onClose={handleCloseSignInModal}
      />

      <SettingsPopup 
        isVisible={isSettingsPopupVisible}
        onClose={handleCloseSettings}
      />
    </div>
  )
}

export default ChatPage
