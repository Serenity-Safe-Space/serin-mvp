import { useState, useRef, useEffect } from 'react'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { useAuth } from './contexts/AuthContext'
import { recordDailyActivity } from './lib/activityService'
import ProfilePopup from './ProfilePopup'
import SignInModal from './SignInModal'
import './ChatPage.css'

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)

function ChatPage() {
  const { user } = useAuth()
  const [currentMessage, setCurrentMessage] = useState("Gotchu. Let's talk.")
  const [inputValue, setInputValue] = useState('')
  const [chatHistory, setChatHistory] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFirstMessage, setIsFirstMessage] = useState(true)
  const [hasStartedChat, setHasStartedChat] = useState(false)
  const [isProfilePopupVisible, setIsProfilePopupVisible] = useState(false)
  const [isSignInModalVisible, setIsSignInModalVisible] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    // Focus input field when component mounts
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

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

  return (
    <div className="chat-page">
      <div className="profile-icon" onClick={handleProfileClick}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="#E67E22"/>
        </svg>
      </div>
      
      <div className="chat-content">
        <div className="character-container">
          <div className="character-circle">
            <img src="/llama.png" alt="Serin the llama" className="llama-image" />
          </div>
        </div>

        <div className="quick-actions">
          <div className="action-item">
            <div className="action-circle purple">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" fill="white"/>
              </svg>
            </div>
            <div className="action-text">
              <div>Too tired to type?</div>
              <div>Just say it out loud</div>
            </div>
          </div>

          <div className="action-item">
            <div className="action-circle teal">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A1.5 1.5 0 0 0 18.54 8H16c-.83 0-1.5.67-1.5 1.5S15.17 11 16 11h1.5l1.25 3.75L16 16.5V22h4zM12.5 11.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5S11 9.17 11 10s.67 1.5 1.5 1.5zM5.5 6c1.11 0 2-.89 2-2s-.89-2-2-2-2 .89-2 2 .89 2 2 2zm2 16v-7H9.5l-1.32-3.96A1.5 1.5 0 0 0 6.76 10H5.5c-.83 0-1.5.67-1.5 1.5S4.67 13 5.5 13H7l.75 2.25L6 17v5h1.5z" fill="white"/>
              </svg>
            </div>
            <div className="action-text">
              <div>Wanna talk</div>
              <div>to someone like you</div>
            </div>
          </div>
        </div>

        <div className="chat-title-section">
          <h1 className="chat-main-title">
            {currentMessage}
          </h1>
          {isLoading && hasStartedChat && (
            <p className="thinking-indicator">Serin is thinking...</p>
          )}
          {!hasStartedChat && (
            <h2 className="chat-subtitle">Mood's all yours – spill it</h2>
          )}
        </div>

        <div className="chat-input-section">
          <div className="input-container">
            <input 
              ref={inputRef}
              type="text" 
              placeholder="Say anything... I'm listening" 
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
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="white"/>
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
      />

      <SignInModal 
        isVisible={isSignInModalVisible}
        onClose={handleCloseSignInModal}
      />
    </div>
  )
}

export default ChatPage