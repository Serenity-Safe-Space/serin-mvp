import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithRouter } from '../../test/utils.jsx'

const mockNavigate = vi.fn()
const mockCreateChatSession = vi.fn()
const mockSaveMessage = vi.fn()
const mockRecordDailyActivity = vi.fn()
const mockGetSerinPrompt = vi.fn()
const mockAnalyzeMoodShift = vi.fn()
const mockUpsertMoodMemory = vi.fn()
const mockUseVoiceToGemini = vi.fn()

const mockGenerateContent = vi.fn()
const mockGetGenerativeModel = vi.fn()
const mockGoogleGenerativeAI = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: mockGoogleGenerativeAI,
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-123' },
  }),
}))

const translations = {
  'chat.initialGreeting': 'Hello friend',
  'chat.subtitle': 'Your Safe Space',
  'chat.inputPlaceholder': 'How are you feeling today?',
  'chat.statuses.thinking': 'Serin is thinking…',
  'chat.statuses.loadingSession': 'Loading chat…',
  'chat.statuses.recording': 'Recording…',
  'chat.statuses.speaking': 'Speaking…',
  'chat.statuses.voiceError': 'Voice issue',
  'chat.privacyLink': 'Learn how we use your data',
  'chat.connectionError': 'Connection trouble',
}

vi.mock('../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: vi.fn(),
    t: (key) => translations[key] ?? key,
  }),
}))

vi.mock('../lib/activityService', () => ({
  recordDailyActivity: (...args) => mockRecordDailyActivity(...args),
}))

vi.mock('../lib/chatHistoryService', () => ({
  createChatSession: (...args) => mockCreateChatSession(...args),
  saveMessage: (...args) => mockSaveMessage(...args),
  getChatSession: vi.fn(),
}))

vi.mock('../lib/memoryAnalyzer', () => ({
  analyzeMoodShift: (...args) => mockAnalyzeMoodShift(...args),
}))

vi.mock('../lib/memoryService', () => ({
  upsertMoodMemory: (...args) => mockUpsertMoodMemory(...args),
}))

vi.mock('../utils/serinPrompt', () => ({
  getSerinPrompt: (...args) => mockGetSerinPrompt(...args),
}))

vi.mock('../useVoiceToGemini', () => ({
  useVoiceToGemini: (...args) => mockUseVoiceToGemini(...args),
}))

vi.mock('../ProfilePopup', () => ({
  default: () => <div data-testid="profile-popup-mock" />,
}))

vi.mock('../ChatHistoryPopup', () => ({
  default: () => <div data-testid="chat-history-popup-mock" />,
}))

vi.mock('../SignInModal', () => ({
  default: () => <div data-testid="signin-modal-mock" />,
}))

vi.mock('../SettingsPopup', () => ({
  default: () => <div data-testid="settings-popup-mock" />,
}))

let ChatPage

const applyDefaultMocks = () => {
  vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key')

  mockGoogleGenerativeAI.mockImplementation(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  }))

  mockGetGenerativeModel.mockReturnValue({
    generateContent: mockGenerateContent,
  })

  mockGenerateContent.mockResolvedValue({
    response: {
      text: () => 'Assistant reply',
    },
  })

  mockCreateChatSession.mockResolvedValue({
    session: { id: 'session-123' },
    error: null,
  })

  mockSaveMessage.mockResolvedValue({ message: {} })
  mockRecordDailyActivity.mockResolvedValue({ success: true })
  mockAnalyzeMoodShift.mockResolvedValue(null)
  mockUpsertMoodMemory.mockResolvedValue({ memory: {} })
  mockGetSerinPrompt.mockReturnValue('prompt-body')
  mockUseVoiceToGemini.mockReturnValue({
    isRecording: false,
    isPlaying: false,
    isLoading: false,
    isError: false,
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    sendTestAudio: vi.fn(),
  })
}

const loadComponent = async () => {
  applyDefaultMocks()

  ChatPage = (await import('../ChatPage.jsx')).default
}

const renderChatPage = () =>
  renderWithRouter(
    <Routes>
      <Route path="/" element={<ChatPage />} />
    </Routes>,
  )

const runChatPageTests = process.env.RUN_CHAT_PAGE_TESTS === '1'
const describeChatPage = runChatPageTests ? describe : describe.skip

describeChatPage('ChatPage', () => {
  beforeAll(async () => {
    await loadComponent()
  })

  beforeEach(() => {
    mockNavigate.mockReset()
    mockCreateChatSession.mockReset()
    mockSaveMessage.mockReset()
    mockRecordDailyActivity.mockReset()
    mockGetSerinPrompt.mockReset()
    mockAnalyzeMoodShift.mockReset()
    mockUpsertMoodMemory.mockReset()
    mockUseVoiceToGemini.mockReset()
    mockGenerateContent.mockReset()
    mockGetGenerativeModel.mockReset()
    mockGoogleGenerativeAI.mockReset()

    applyDefaultMocks()
  })

  it('renders initial greeting and subtitle', () => {
    renderChatPage()

    expect(
      screen.getByRole('heading', { level: 1 }),
    ).toHaveTextContent('Hello friend')
    expect(screen.getByText('Your Safe Space')).toBeInTheDocument()
    expect(screen.getByText('Learn how we use your data')).toBeInTheDocument()
  })

  it('creates a session and saves messages on first send', async () => {
    const user = userEvent.setup()
    renderChatPage()

    const input = screen.getByPlaceholderText('How are you feeling today?')
    await user.type(input, 'I feel okay{Enter}')

    await waitFor(() => {
      expect(mockGenerateContent).toHaveBeenCalledTimes(1)
    })

    expect(mockCreateChatSession).toHaveBeenCalledWith('user-123', 'I feel okay')
    expect(mockRecordDailyActivity).toHaveBeenCalledWith('user-123')
    expect(mockGetSerinPrompt).toHaveBeenCalledWith([], 'I feel okay')
    expect(mockSaveMessage).toHaveBeenCalledWith('session-123', 'user', 'I feel okay')
    expect(mockSaveMessage).toHaveBeenCalledWith('session-123', 'assistant', 'Assistant reply')
    expect(mockNavigate).toHaveBeenCalledWith('/chat/session-123', { replace: true })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Assistant reply')
  })
})
