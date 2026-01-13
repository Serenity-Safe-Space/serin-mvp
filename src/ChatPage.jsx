import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { useLanguage } from './contexts/LanguageContext'
import { usePremium } from './contexts/PremiumContext'
import { useLastChat, DEFAULT_LAST_CHAT_TTL_MS } from './contexts/LastChatContext'
import { useModelPreference } from './contexts/ModelPreferenceContext'
import { recordDailyActivity, getCurrentStreak } from './lib/activityService'
import { awardCoins } from './lib/coinService'
import { createChatSession, createVoiceSession, finalizeSession, saveMessage, getChatSession } from './lib/chatHistoryService'
import { analyzeMoodShift } from './lib/memoryAnalyzer'
import { upsertMoodMemory } from './lib/memoryService'
import { generateTextResponse } from './lib/aiModelClient'
import { rememberSessionModel, getSessionModel, clearSessionModel } from './lib/sessionModelStorage'
import { useVoiceToGemini } from './useVoiceToGemini'
import { trackAnonymousEvent } from './lib/anonymousAnalyticsService'
import { getDailyMessageCount, FREE_DAILY_MESSAGE_LIMIT } from './lib/usageLimitService'
import { useAppOpenReward } from './hooks/useAppOpenReward'
import PremiumBanner from './components/PremiumBanner'
import MyProgressPopup from './MyProgressPopup'
import ProfilePopup from './ProfilePopup'
import PremiumPaywall from './PremiumPaywall'
import ChatHistoryPopup from './ChatHistoryPopup'
import SignInModal from './SignInModal'
import SettingsPopup from './SettingsPopup'
import EditProfilePopup from './EditProfilePopup'
import ModelSelector from './ModelSelector'
import StreakModal from './StreakModal'
import VoiceModeOverlay from './VoiceModeOverlay'
import './ChatPage.css'

const SESSION_INACTIVITY_THRESHOLD_MS = DEFAULT_LAST_CHAT_TTL_MS

// Daily check-in timer persistence
const CHECKIN_STORAGE_KEY = 'serin_daily_checkin'
const CHECKIN_DURATION_SECONDS = 120 // 2 minutes

const getStoredCheckIn = () => {
  try {
    const stored = localStorage.getItem(CHECKIN_STORAGE_KEY)
    if (!stored) return null
    return JSON.parse(stored)
  } catch {
    return null
  }
}

const saveCheckInState = (secondsRemaining, completed) => {
  const today = new Date().toLocaleDateString('en-CA')
  localStorage.setItem(CHECKIN_STORAGE_KEY, JSON.stringify({
    date: today,
    secondsRemaining,
    completed
  }))
}

const getInitialCheckInState = () => {
  const today = new Date().toLocaleDateString('en-CA')
  const stored = getStoredCheckIn()

  // If stored data is from today, use it
  if (stored && stored.date === today) {
    return {
      timer: stored.completed ? 0 : stored.secondsRemaining,
      completed: stored.completed
    }
  }

  // New day - reset everything
  return {
    timer: CHECKIN_DURATION_SECONDS,
    completed: false
  }
}

function ChatPage() {
  const { user } = useAuth()
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useLanguage()
  const { isPremium, premiumEndsAt, coinBalance } = usePremium()
  const { lastChat, rememberChat, clearLastChat } = useLastChat()
  const {
    currentModel,
    availableModels,
    canEdit,
    setModel: setPreferredModel,
  } = useModelPreference()
  useAppOpenReward()
  const [currentMessage, setCurrentMessage] = useState(() => t('chat.initialGreeting'))
  const [inputValue, setInputValue] = useState('')
  const [chatHistory, setChatHistory] = useState([])
  const [currentSessionId, setCurrentSessionId] = useState(sessionId || null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingSession, setIsLoadingSession] = useState(false)
  const [isFirstMessage, setIsFirstMessage] = useState(true)
  const [hasStartedChat, setHasStartedChat] = useState(false)
  const [isProfilePopupVisible, setIsProfilePopupVisible] = useState(false)
  const [isProgressPopupVisible, setIsProgressPopupVisible] = useState(false)
  const [isPaywallVisible, setIsPaywallVisible] = useState(false)
  const [isChatHistoryPopupVisible, setIsChatHistoryPopupVisible] = useState(false)
  const [isSignInModalVisible, setIsSignInModalVisible] = useState(false)
  const [isSettingsPopupVisible, setIsSettingsPopupVisible] = useState(false)
  const [isEditProfilePopupVisible, setIsEditProfilePopupVisible] = useState(false)
  const [testAudioFiles, setTestAudioFiles] = useState([])
  const [showTestPanel, setShowTestPanel] = useState(false)
  const [showExpirationBanner, setShowExpirationBanner] = useState(false)
  const [activeModel, setActiveModel] = useState(currentModel)
  const [isModelLocked, setIsModelLocked] = useState(false)
  const [currentStreak, setCurrentStreak] = useState(0)
  const [isTypingMode, setIsTypingMode] = useState(false)
  const [isStreakModalVisible, setIsStreakModalVisible] = useState(false)
  const [checkInTimer, setCheckInTimer] = useState(() => getInitialCheckInState().timer)
  const [isTimerActive, setIsTimerActive] = useState(false)
  const [isCheckInCompleted, setIsCheckInCompleted] = useState(() => getInitialCheckInState().completed)
  const [showCheckInCelebration, setShowCheckInCelebration] = useState(false)
  const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false)
  const inputRef = useRef(null)
  const sessionIdRef = useRef(currentSessionId)
  const userRef = useRef(user)
  const pendingAnalysisRef = useRef(null)
  const lastAnalyzedUserMessageRef = useRef(null)
  const voiceTranscriptRef = useRef([])
  const voiceSessionRef = useRef(null)
  const voiceMessageCacheRef = useRef({
    user: new Set(),
    assistant: new Set(),
  })
  const skipRestoreRef = useRef(false)
  const lastInteractionRef = useRef(null)
  const isNavigatingToNewSessionRef = useRef(false)
  const hasStartedChatRef = useRef(hasStartedChat)
  const anonymousSessionIdRef = useRef(null)

  const unlockModelSelection = useCallback(() => {
    setIsModelLocked(false)
    setActiveModel(currentModel)
  }, [currentModel])

  const lockSessionModel = useCallback((sessionIdentifier) => {
    if (!sessionIdentifier) {
      return
    }

    const storedModel = getSessionModel(sessionIdentifier)
    const modelToApply = storedModel || currentModel
    setActiveModel(modelToApply)
    setIsModelLocked(true)

    if (!storedModel) {
      rememberSessionModel(sessionIdentifier, modelToApply)
    }
  }, [currentModel])

  useEffect(() => {
    // Check if premium expired recently (e.g. within last 7 days)
    if (!isPremium && premiumEndsAt) {
      const end = new Date(premiumEndsAt)
      const now = new Date()
      // If expired in the past and not more than 7 days ago
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      if (end < now && end > sevenDaysAgo) {
        setShowExpirationBanner(true)
      }
    } else {
      setShowExpirationBanner(false)
    }
  }, [isPremium, premiumEndsAt])

  useEffect(() => {
    if (!isModelLocked) {
      setActiveModel(currentModel)
    }
  }, [currentModel, isModelLocked])

  useEffect(() => {
    hasStartedChatRef.current = hasStartedChat
    if (!hasStartedChat) {
      setCurrentMessage(t('chat.initialGreeting'))
    }
  }, [hasStartedChat, t])

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

  const ensureFreshSession = useCallback(async (referenceTimestampMs) => {
    const nowMs = typeof referenceTimestampMs === 'number' ? referenceTimestampMs : Date.now()
    const activeSessionId = sessionIdRef.current || anonymousSessionIdRef.current
    const lastInteractionMs = lastInteractionRef.current

    if (!activeSessionId || !lastInteractionMs) {
      lastInteractionRef.current = nowMs
      return false
    }

    if ((nowMs - lastInteractionMs) < SESSION_INACTIVITY_THRESHOLD_MS) {
      return false
    }

    try {
      if (sessionIdRef.current) {
        await finalizeSession(sessionIdRef.current, new Date(lastInteractionMs).toISOString())
      } else if (anonymousSessionIdRef.current) {
        trackAnonymousEvent(anonymousSessionIdRef.current, 'session_end', { reason: 'timeout' }).catch(() => { })
      }
    } catch (error) {
      console.warn('Failed to finalize stale session:', error)
    }

    clearLastChat()
    if (sessionIdRef.current) {
      clearSessionModel(sessionIdRef.current)
    }
    setCurrentSessionId(null)
    sessionIdRef.current = null
    anonymousSessionIdRef.current = null
    setChatHistory([])
    setHasStartedChat(false)
    setIsFirstMessage(true)
    setCurrentMessage(t('chat.initialGreeting'))
    lastInteractionRef.current = nowMs
    unlockModelSelection()
    return true
  }, [clearLastChat, t, unlockModelSelection])

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

    const sessionId = voiceSessionRef.current
    const normalizedContent = message.content.trim()

    if (
      sessionId &&
      normalizedContent &&
      (message.role === 'user' || message.role === 'assistant')
    ) {
      const cacheForRole = voiceMessageCacheRef.current[message.role] || new Set()

      if (!cacheForRole.has(normalizedContent)) {
        cacheForRole.add(normalizedContent)
        voiceMessageCacheRef.current[message.role] = cacheForRole

        saveMessage(sessionId, message.role, normalizedContent, {
          occurredAt: new Date().toISOString(),
        }).catch(error => {
          console.warn('Failed to persist voice message:', error)
        })

        if (userRef.current?.id) {
          rememberChat(sessionId, { userId: userRef.current.id })
        }
      }
    }
  }, [triggerMoodAnalysis, rememberChat])

  const handleVoiceSessionClosed = useCallback((details) => {
    if (!voiceSessionRef.current) {
      return
    }

    const sessionId = voiceSessionRef.current
    voiceSessionRef.current = null
    voiceMessageCacheRef.current = {
      user: new Set(),
      assistant: new Set(),
    }

    const endedAt = details?.endedAt || new Date().toISOString()

    finalizeSession(sessionId, endedAt).catch(error => {
      console.warn('Failed to finalize voice session:', error)
    })
  }, [])

  const { isRecording, isPlaying, isLoading: isVoiceLoading, isError, startRecording, stopRecording, sendTestAudio } = useVoiceToGemini({
    onConversationUpdate: handleVoiceConversationUpdate,
    onSessionClosed: handleVoiceSessionClosed,
  })
  const isVoiceActive = isRecording || isPlaying

  useEffect(() => {
    // Focus input field when component mounts
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // Load streak count on mount
  useEffect(() => {
    const loadStreak = async () => {
      if (user?.id) {
        const { count } = await getCurrentStreak(user.id)
        setCurrentStreak(count)
      }
    }
    loadStreak()
  }, [user])

  // Timer countdown effect with persistence
  useEffect(() => {
    let interval = null
    if (isTimerActive && checkInTimer > 0 && !isCheckInCompleted) {
      interval = setInterval(() => {
        setCheckInTimer(prev => {
          const newValue = prev - 1
          // Save progress to localStorage
          saveCheckInState(newValue, false)
          return newValue
        })
      }, 1000)
    } else if (checkInTimer === 0 && isTimerActive && !isCheckInCompleted) {
      setIsTimerActive(false)
      setIsCheckInCompleted(true)
      setShowCheckInCelebration(true)
      // Mark as completed in localStorage
      saveCheckInState(0, true)
      // Award daily check-in coins when timer completes
      if (user) {
        const localDate = new Date().toLocaleDateString('en-CA')
        awardCoins(user.id, 'daily_checkin', 3, { local_date: localDate })
          .then(() => {
            console.info('Daily check-in coins awarded for completing 2-minute session')
          })
          .catch(error => {
            console.warn('Failed to award daily check-in coins:', error)
          })
      }
      // Auto-dismiss celebration after 3 seconds
      setTimeout(() => {
        setShowCheckInCelebration(false)
      }, 3000)
    }
    return () => clearInterval(interval)
  }, [isTimerActive, checkInTimer, user, isCheckInCompleted])

  useEffect(() => {
    sessionIdRef.current = currentSessionId
  }, [currentSessionId])

  useEffect(() => {
    userRef.current = user
  }, [user])

  useEffect(() => {
    voiceTranscriptRef.current = []
    lastAnalyzedUserMessageRef.current = null
    voiceSessionRef.current = null
    voiceMessageCacheRef.current = {
      user: new Set(),
      assistant: new Set(),
    }
  }, [currentSessionId, user])

  useEffect(() => {
    if (!currentSessionId || !user?.id) {
      return
    }
    rememberChat(currentSessionId, { userId: user.id })
  }, [currentSessionId, user, rememberChat])

  // Load existing session if sessionId is provided
  useEffect(() => {
    const loadSession = async () => {
      if (isNavigatingToNewSessionRef.current) {
        isNavigatingToNewSessionRef.current = false
        return
      }

      if (sessionId && user) {
        setIsLoadingSession(true)
        try {
          const { session, messages, error } = await getChatSession(sessionId, user.id)

          if (error || !session) {
            console.error('Error loading session:', error)
            // Redirect to home if session not found
            if (lastChat?.sessionId === sessionId) {
              clearLastChat()
            }
            navigate('/', { replace: true, state: { skipLastChatRestore: true } })
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
          lockSessionModel(session.id)

          const lastMessageRecord = messages[messages.length - 1]
          const fallbackTimestamp = lastMessageRecord?.created_at || session.ended_at || session.updated_at || session.created_at || null
          if (fallbackTimestamp) {
            const parsed = new Date(fallbackTimestamp).getTime()
            lastInteractionRef.current = Number.isNaN(parsed) ? null : parsed
          } else {
            lastInteractionRef.current = null
          }

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
      } else if (!sessionId && !hasStartedChatRef.current) {
        // Reset state for new chat
        setChatHistory([])
        setCurrentSessionId(null)
        setHasStartedChat(false)
        setIsFirstMessage(true)
        lastInteractionRef.current = null
        unlockModelSelection()
      }
    }

    loadSession()
  }, [sessionId, user, navigate, lastChat, clearLastChat, lockSessionModel, unlockModelSelection])

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

    // CHECK FREE LIMIT
    if (user && !isPremium) {
      const { count } = await getDailyMessageCount(user.id)
      if (count >= FREE_DAILY_MESSAGE_LIMIT) {
        setIsPaywallVisible(true)
        return
      }
    }

    // Record daily activity for chat interaction
    if (user) {
      recordDailyActivity(user.id).catch(error =>
        console.warn('Failed to record daily activity:', error)
      )
    }

    const userMessage = inputValue.trim()
    const userMessageTimestamp = new Date()
    const sessionWasReset = await ensureFreshSession(userMessageTimestamp.getTime())
    setInputValue('')
    setCurrentMessage(userMessage)
    setHasStartedChat(true)
    setIsLoading(true)
    lastInteractionRef.current = userMessageTimestamp.getTime()

    try {
      let sessionIdToUse = sessionIdRef.current
      const modelForMessage = isModelLocked ? (activeModel || currentModel) : currentModel

      if (!isModelLocked) {
        setActiveModel(modelForMessage)
        setIsModelLocked(true)
      }

      // Create new session if this is the first message and user is logged in
      if (!sessionIdToUse && user && (isFirstMessage || sessionWasReset)) {
        const { session, error } = await createChatSession(user.id, userMessage)
        if (error) {
          console.error('Error creating session:', error)
        } else if (session) {
          sessionIdToUse = session.id
          setCurrentSessionId(session.id)
          sessionIdRef.current = session.id
          rememberSessionModel(session.id, modelForMessage)
          // Update URL to include session ID
          isNavigatingToNewSessionRef.current = true
          navigate(`/chat/${session.id}`, { replace: true })
        }
      }

      if (sessionIdToUse) {
        sessionIdRef.current = sessionIdToUse

        if (user?.id) {
          rememberChat(sessionIdToUse, { userId: user.id })

          // Save user message immediately
          saveMessage(sessionIdToUse, 'user', userMessage, {
            occurredAt: userMessageTimestamp.toISOString(),
          }).catch(error =>
            console.warn('Failed to save user message:', error)
          )
        }
      } else if (!user) {
        // Anonymous user tracking
        if (!anonymousSessionIdRef.current) {
          anonymousSessionIdRef.current = crypto.randomUUID()
          trackAnonymousEvent(anonymousSessionIdRef.current, 'session_start')
        }
        trackAnonymousEvent(anonymousSessionIdRef.current, 'message_sent')
      }

      const historyForPrompt = sessionWasReset ? [] : chatHistory
      const responseResult = await generateTextResponse({
        modelId: modelForMessage,
        history: historyForPrompt,
        userMessage,
      })
      const responseText = responseResult?.text?.trim()

      if (!responseText) {
        throw new Error('The selected model did not return any text.')
      }

      const response = responseText
      let assistantMessageTimestamp = new Date()

      if (assistantMessageTimestamp <= userMessageTimestamp) {
        assistantMessageTimestamp = new Date(userMessageTimestamp.getTime() + 1)
      }

      if (isFirstMessage || sessionWasReset) {
        setIsFirstMessage(false)
      }

      const newHistory = [
        ...historyForPrompt,
        { role: 'user', content: userMessage },
        { role: 'assistant', content: response }
      ]

      setChatHistory(newHistory)
      setCurrentMessage(response)
      Promise.resolve().then(() => triggerMoodAnalysis(newHistory, 'text'))
      lastInteractionRef.current = assistantMessageTimestamp.getTime()

      // Save assistant message to database if user is logged in and we have a session
      if (user && sessionIdToUse) {
        saveMessage(sessionIdToUse, 'assistant', response, {
          occurredAt: assistantMessageTimestamp.toISOString(),
        }).catch(error =>
          console.warn('Failed to save assistant message:', error)
        )
      }
    } catch (error) {
      console.error('Error generating AI response:', error)
      const friendlyMessage = typeof error?.message === 'string' && error.message.trim().length > 0
        ? error.message
        : t('chat.connectionError')
      setCurrentMessage(friendlyMessage)
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

  const handleStartNewChat = () => {
    if (sessionIdRef.current) {
      clearSessionModel(sessionIdRef.current)
    }
    // Don't clear last chat here, so we can offer to resume it
    skipRestoreRef.current = true
    setIsChatHistoryPopupVisible(false)
    setIsProfilePopupVisible(false)
    setChatHistory([])
    setCurrentSessionId(null)
    setHasStartedChat(false)
    setIsFirstMessage(true)
    setIsTypingMode(false)
    setCurrentMessage(t('chat.initialGreeting'))
    setInputValue('')
    lastInteractionRef.current = null
    unlockModelSelection()
    navigate('/', { replace: true, state: { skipLastChatRestore: true } })
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

  const handleEditProfile = () => {
    setIsEditProfilePopupVisible(true)
  }

  const handleCloseEditProfile = () => {
    setIsEditProfilePopupVisible(false)
  }

  const handleAdminDashboardLink = () => {
    setIsProfilePopupVisible(false)
    navigate('/admin')
  }

  const handleOpenPaywall = () => {
    setIsSettingsPopupVisible(false)
    setIsProfilePopupVisible(false)
    setIsPaywallVisible(true)
  }

  const handleOpenProgress = () => {
    setIsProfilePopupVisible(false)
    setIsProgressPopupVisible(true)
  }

  const handleVoiceButtonClick = async () => {
    if (isRecording) {
      stopRecording()
      return
    }



    let voiceSessionCreated = false

    if (user?.id) {
      const startedAt = new Date().toISOString()
      try {
        const { session, error } = await createVoiceSession(user.id, startedAt)

        if (error) {
          console.error('Error creating voice session:', error)
        } else if (session) {
          voiceSessionRef.current = session.id
          voiceMessageCacheRef.current = {
            user: new Set(),
            assistant: new Set(),
          }
          voiceSessionCreated = true
          recordDailyActivity(user.id).catch(activityError =>
            console.warn('Failed to record daily activity for voice session:', activityError),
          )
        }
      } catch (error) {
        console.error('Unexpected error creating voice session:', error)
      }
    } else {
      voiceSessionRef.current = null
      voiceMessageCacheRef.current = {
        user: new Set(),
        assistant: new Set(),
      }
    }

    await startRecording()

    if (!voiceSessionCreated) {
      voiceMessageCacheRef.current = {
        user: new Set(),
        assistant: new Set(),
      }
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

  const handleLastChatClick = () => {
    if (lastChat?.sessionId) {
      navigate(`/chat/${lastChat.sessionId}`)
    }
  }

  const handleTypeClick = () => {
    setIsTypingMode(true)
    // Only start timer if not already completed for today
    if (!isCheckInCompleted) {
      setIsTimerActive(true)
    }
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }, 100)
  }

  const handleTalkClick = async () => {
    // Only start timer if not already completed for today
    if (!isCheckInCompleted) {
      setIsTimerActive(true)
    }
    setIsVoiceModeOpen(true)
    await handleVoiceButtonClick()
  }

  const handleCloseVoiceMode = () => {
    setIsVoiceModeOpen(false)
    stopRecording()
    // Don't reset timer - it persists across sessions for the day
  }

  const handleStreakClick = () => {
    setIsStreakModalVisible(true)
  }

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="chat-page">
      {/* Top Stats Bar */}
      <div className="chat-top-bar">
        <div className="top-bar-left">
          {(hasStartedChat || isTypingMode) && (
            <button className="home-button" onClick={handleStartNewChat} aria-label="Back to home">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          <div className="top-stats">
            <button className="stat-item" onClick={handleStreakClick} aria-label="View streak">
              <span className="stat-icon">🔥</span>
              <span className="stat-value">{currentStreak}</span>
            </button>
            <button className="stat-item" onClick={handleOpenProgress} aria-label="View coins">
              <svg className="stat-icon coin-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#FFD700" stroke="#DAA520" strokeWidth="1.5"/>
                <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#B8860B">S</text>
              </svg>
              <span className="stat-value">{coinBalance}</span>
            </button>
          </div>
        </div>
        <button className="chat-sidebar-trigger" onClick={handleProfileClick} aria-label="Open Menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {showExpirationBanner && (
        <PremiumBanner
          message="Your Premium access has ended."
          onAction={() => setIsPaywallVisible(true)}
          onDismiss={() => setShowExpirationBanner(false)}
        />
      )}

      {/* Development Test Audio Panel */}
      {
        import.meta.env.DEV && (
          <div className="test-audio-panel">
            <div
              style={{
                position: 'fixed',
                bottom: '120px',
                left: '20px',
                display: 'flex',
                gap: '12px',
                zIndex: 999,
              }}
            >
              <button
                className="test-panel-toggle"
                onClick={toggleTestPanel}
                style={{
                  background: '#FFEB5B',
                  color: '#3C2A73',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontFamily: 'Hangyaboly, sans-serif',
                  boxShadow: '0 6px 18px rgba(255, 235, 91, 0.35)',
                }}
              >
                {showTestPanel ? t('chat.devPanel.hide') : t('chat.devPanel.show')}
              </button>
            </div>

            {showTestPanel && (
              <div
                className="test-audio-files"
                style={{
                  position: 'fixed',
                  bottom: '170px',
                  left: '20px',
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: '2px solid #3C2A73',
                  borderRadius: '12px',
                  padding: '16px',
                  maxWidth: '200px',
                  zIndex: 999,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                }}
              >
                <h3 style={{
                  margin: '0 0 12px 0',
                  fontSize: '14px',
                  color: '#3C2A73',
                  fontFamily: 'Hangyaboly, sans-serif'
                }}>
                  {t('chat.devPanel.title')}
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
                        color: '#3C2A73',
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
                  <p
                    style={{
                      margin: 0,
                      fontSize: '12px',
                      color: '#666',
                      fontStyle: 'italic'
                    }}
                  >
                    {t('chat.devPanel.empty')}<br />
                    {t('chat.devPanel.hint')}
                  </p>
                )}
              </div>
            )}
          </div>
        )
      }

      <div className="chat-content">
        <div className="character-container">
          {/* Sparkle decorations */}
          <div className="sparkle sparkle-1">✦</div>
          <div className="sparkle sparkle-2">✧</div>
          <div className="sparkle sparkle-3">✦</div>
          <div className="sparkle sparkle-4">✧</div>
          <div className="character-circle">
            <div className="character-inner-glow"></div>
            <img src="/serin-llama.png" alt="Serin the llama" className="llama-image" />
            {isTimerActive && !isCheckInCompleted && (
              <div className="timer-badge">
                {formatTimer(checkInTimer)}
              </div>
            )}
            {isCheckInCompleted && (
              <div className="timer-badge completed">
                ✓
              </div>
            )}
          </div>
        </div>

        <div className="chat-title-section">
          {isLoadingSession ? (
            <p className="thinking-indicator">{t('chat.statuses.loadingSession')}</p>
          ) : hasStartedChat ? (
            <>
              <h1 className="chat-main-title">
                {currentMessage}
              </h1>
              {(isLoading || isVoiceLoading) && (
                <p className="thinking-indicator">{t('chat.statuses.thinking')}</p>
              )}
              {isRecording && (
                <p className="thinking-indicator">{t('chat.statuses.recording')}</p>
              )}
              {isPlaying && (
                <p className="thinking-indicator">{t('chat.statuses.speaking')}</p>
              )}
              {isError && (
                <p className="error-message">{t('chat.statuses.voiceError')}</p>
              )}
            </>
          ) : isCheckInCompleted ? (
            <>
              <h1 className="chat-main-title">You're all checked in! ✨</h1>
              <h2 className="chat-subtitle">Great job taking time for yourself</h2>
              <h2 className="chat-subtitle-secondary">Come back tomorrow</h2>
            </>
          ) : (
            <>
              <h1 className="chat-main-title">2-minute check-in</h1>
              <h2 className="chat-subtitle">Quick mental reset</h2>
              <h2 className="chat-subtitle-secondary">One small step today</h2>
            </>
          )}
        </div>

        <div className="chat-input-section">
          {(isTypingMode || hasStartedChat) ? (
            <div className="input-container">
              <input
                ref={inputRef}
                type="text"
                placeholder={t('chat.inputPlaceholder')}
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
                aria-label="Send message"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="action-buttons">
              <button className="action-btn type-btn" onClick={handleTypeClick}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="currentColor" />
                </svg>
                <span>Type</span>
              </button>
              <button
                className={`action-btn talk-btn ${isVoiceActive ? 'voice-active' : ''}`}
                onClick={handleTalkClick}
                disabled={isVoiceLoading}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" fill="currentColor" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" fill="currentColor" />
                </svg>
                <span>Talk</span>
              </button>
            </div>
          )}

          <div className="privacy-notice">
            <Link to="/privacy" className="privacy-link">{t('chat.privacyLink')}</Link>
          </div>
        </div>
      </div>

      <ProfilePopup
        isVisible={isProfilePopupVisible}
        onClose={handleClosePopup}
        onSignInClick={handleSignInClick}
        onChatHistoryClick={handleChatHistoryClick}
        onSettingsClick={handleSettingsClick}
        onAdminDashboardClick={handleAdminDashboardLink}
        onProgressClick={handleOpenProgress}
        onStreakClick={() => {
          setIsProfilePopupVisible(false)
          setIsStreakModalVisible(true)
        }}
      />

      <MyProgressPopup
        isVisible={isProgressPopupVisible}
        onClose={() => setIsProgressPopupVisible(false)}
      />

      <PremiumPaywall
        isVisible={isPaywallVisible}
        onClose={() => setIsPaywallVisible(false)}
      />

      <ChatHistoryPopup
        isVisible={isChatHistoryPopupVisible}
        onClose={handleCloseChatHistory}
        onSelectChat={handleSelectChatHistory}
        onStartNewChat={handleStartNewChat}
        activeSessionId={currentSessionId}
      />

      <SignInModal
        isVisible={isSignInModalVisible}
        onClose={handleCloseSignInModal}
      />

      <SettingsPopup
        isVisible={isSettingsPopupVisible}
        onClose={handleCloseSettings}
        onEditProfile={handleEditProfile}
      />

      <EditProfilePopup
        isVisible={isEditProfilePopupVisible}
        onClose={handleCloseEditProfile}
      />

      <StreakModal
        isVisible={isStreakModalVisible}
        onClose={() => setIsStreakModalVisible(false)}
      />

      <VoiceModeOverlay
        isVisible={isVoiceModeOpen}
        onClose={handleCloseVoiceMode}
        isRecording={isRecording}
        isPlaying={isPlaying}
        isLoading={isVoiceLoading}
        isError={isError}
        onTapToPause={stopRecording}
        timerDisplay={formatTimer(checkInTimer)}
        isCheckInCompleted={isCheckInCompleted}
      />

      {/* Check-in completion toast */}
      {showCheckInCelebration && (
        <div className="checkin-toast" onClick={() => setShowCheckInCelebration(false)}>
          <span className="checkin-toast-icon">🎉</span>
          <div className="checkin-toast-content">
            <span className="checkin-toast-title">Check-in complete!</span>
            <span className="checkin-toast-message">+3 coins earned</span>
          </div>
        </div>
      )}
    </div >
  )
}

export default ChatPage
