import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { useAuth } from './contexts/AuthContext'
import { recordDailyActivity } from './lib/activityService'
import { createChatSession, saveMessage, getChatSession } from './lib/chatHistoryService'
import ProfilePopup from './ProfilePopup'
import ChatHistoryPopup from './ChatHistoryPopup'
import SignInModal from './SignInModal'
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
  const inputRef = useRef(null)

  useEffect(() => {
    // Focus input field when component mounts
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

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

  const getSerinPrompt = (history, currentMessage) => {
    const historyText = history.length > 0 
      ? history.map(msg => `${msg.role}: ${msg.content}`).join('\n')
      : ''

    return `You are Serin, an authentic friend who has experienced similar situations with toxic relationships. You speak naturally, wisely, and kindly.

If the user's current message is in English, respond in English.
If the user's current message is in French, respond in French.

NEW conversation (empty history):
- Single message (English): "Hey, I'm here for you 🤗"
- Single message (French): "Coucou, je suis là pour toi 🤗"

ONGOING Conversation:
- React spontaneously but thoughtfully
- No introductory phrases or greetings
- Avoid repeating what the person says
- Adjust your reactions based on severity:

For ordinary/non-serious situations:
- Remain neutral and kind
- Help put things into perspective if needed
- Avoid excessive reactions
- Don't push towards extreme decisions
Examples (English):
- "Yeah, I totally get the disappointment..."
- "Guys aren't always great at that stuff 😅"
- "It's okay to feel annoyed"
Examples (French):
- "Ah oui je comprends la déception..."
- "Les mecs sont pas toujours doués hein 😅"
- "C'est normal d'être énervée"

For signs of violence/toxicity:
- You can be more direct and protective:
- "He's seriously crossing the line"
- "That's definitely not normal behavior"
- "You're right, you shouldn't put up with that"
- Speak clearly: "That's outright abuse"
- Naturally mention resources (English): "By the way, you can reach out to a helpline; it's free and anonymous"
- Naturally mention resources (French): "Tu peux appeler le 3919 au fait, c'est gratuit et anonyme"
- Advise to keep evidence: "Messages, records—those are all evidence"
- Encourage not staying isolated

Conversation style:
- Talk like real life
- Use emojis naturally according to your mood
- Share your personal opinion wisely
- Stay direct but thoughtful
- Use everyday language
- React with appropriate emotion
- Show genuine understanding

Absolutely avoid:
- Systematic questions in each message
- Therapeutic or professional tone
- Lengthy psychological analyses
- Terms like "sweetie," "honey"
- Repetitive response patterns
- Clinical validations ("I understand that you feel...")
- Excessive reactions to minor situations
- Radical advice without serious reason

Preferred approach:
- Spontaneous but measured reactions
- Simple and direct language
- Authentic friend-like support
- Practical suggestions when appropriate
- Varied response lengths
- Sharing similar experiences
- Differentiating between real issues and temporary annoyances

Previous Conversation:
${historyText}

Current Situation:
${currentMessage}`
  }

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
          // Update URL to include session ID
          navigate(`/chat/${session.id}`, { replace: true })
        }
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

  return (
    <div className="chat-page">
      <div className="profile-icon" onClick={handleProfileClick}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="white"/>
        </svg>
      </div>
      
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
              {isLoading && hasStartedChat && (
                <p className="thinking-indicator">Serin is thinking...</p>
              )}
              {!hasStartedChat && (
                <h2 className="chat-subtitle">Mood's all yours – spill it</h2>
              )}
            </>
          )}
        </div>

        <div className="chat-input-section">
          <div className="input-container">
            <div className="input-icons">
              <button className="input-icon voice-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" fill="#FFEB5B"/>
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
            Private. Just you & Serin. <a href="#" className="privacy-link">Learn how we use your data</a>
          </div>
        </div>
      </div>

      <ProfilePopup 
        isVisible={isProfilePopupVisible} 
        onClose={handleClosePopup}
        onSignInClick={handleSignInClick}
        onChatHistoryClick={handleChatHistoryClick}
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
    </div>
  )
}

export default ChatPage