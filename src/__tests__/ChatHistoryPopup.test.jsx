import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ChatHistoryPopup from '../ChatHistoryPopup.jsx'

const authState = {
  user: {
    id: 'user-123',
  },
}

const translationMap = {
  'chatHistory.title': 'Chat History',
  'chatHistory.loading': 'Loading your chats...',
  'chatHistory.empty': 'No chat history yet. Start a conversation to see it here!',
  'chatHistory.detailTitlePlaceholder': 'Select a chat to preview.',
  'chatHistory.detailTitleFallback': 'Conversation preview',
  'chatHistory.detailPlaceholder': 'Select a conversation to see its history.',
  'chatHistory.detailLoading': 'Loading conversation…',
  'chatHistory.detailError': 'We could not load this conversation.',
  'chatHistory.detailEmpty': 'No messages were saved for this chat yet.',
  'chatHistory.continue': 'Continue chat',
  'chatHistory.channelText': 'Text chat',
  'chatHistory.channelVoice': 'Voice session',
  'chatHistory.channelUnknown': 'Conversation',
  'chatHistory.currentChatBadge': 'Live',
  'chatHistory.currentSessionNotice': 'You are currently in this chat. Chat history is only available for previous conversations.',
  'chatHistory.deleteAll': 'Delete all my history',
  'chatHistory.deleteConfirmTitle': 'Are you sure you want to delete everything?',
  'chatHistory.deleteConfirmCancel': 'Oops, was a mistake',
  'chatHistory.deleteConfirmConfirm': 'Yes, I am sure',
  'chatHistory.deleteConfirmDeleting': 'Deleting...',
  'chatHistory.errorLoad': 'Failed to load chat history',
  'chatHistory.errorDelete': 'Failed to delete your chat history. Please try again.',
  'chatHistory.closeAria': 'Close chat history',
  'chatHistory.dateSeparator': 'at',
}

const mockGetUserChatSessions = vi.fn()
const mockDeleteAllChatSessions = vi.fn()
const mockGetChatSession = vi.fn()

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => authState,
}))

vi.mock('../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: vi.fn(),
    t: (key) => translationMap[key] ?? key,
  }),
}))

vi.mock('../lib/chatHistoryService', () => ({
  getUserChatSessions: (...args) => mockGetUserChatSessions(...args),
  getChatSession: (...args) => mockGetChatSession(...args),
  deleteAllChatSessions: (...args) => mockDeleteAllChatSessions(...args),
}))

describe('ChatHistoryPopup', () => {
  beforeEach(() => {
    authState.user = { id: 'user-123' }
    mockGetUserChatSessions.mockReset()
    mockDeleteAllChatSessions.mockReset()
    mockGetChatSession.mockReset()

    mockGetUserChatSessions.mockResolvedValue({
      sessions: [
        {
          id: 'session-1',
          title: 'First conversation',
          updated_at: '2025-02-10T12:34:00Z',
          created_at: '2025-02-10T12:00:00Z',
          started_at: '2025-02-10T12:00:00Z',
          ended_at: '2025-02-10T12:40:00Z',
          channel: 'text',
        },
      ],
      error: null,
    })

    mockDeleteAllChatSessions.mockResolvedValue({ success: true })

    mockGetChatSession.mockResolvedValue({
      session: {
        id: 'session-1',
        title: 'First conversation',
        channel: 'text',
        started_at: '2025-02-10T12:00:00Z',
        ended_at: '2025-02-10T12:10:00Z',
        created_at: '2025-02-10T12:00:00Z',
        updated_at: '2025-02-10T12:10:00Z',
      },
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello there',
          created_at: '2025-02-10T12:01:00Z',
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Hi!',
          created_at: '2025-02-10T12:02:00Z',
        },
      ],
      error: null,
    })
  })

  it('shows conversation details and continues when requested', async () => {
    const onSelectChat = vi.fn()

    render(
      <ChatHistoryPopup
        isVisible
        onClose={vi.fn()}
        onSelectChat={onSelectChat}
        activeSessionId="session-live"
      />,
    )

    expect(screen.getByText('Chat History')).toBeInTheDocument()
    await waitFor(() => expect(mockGetChatSession).toHaveBeenCalledWith('session-1', 'user-123'))
    expect(await screen.findByText('Hello there')).toBeInTheDocument()

    const user = userEvent.setup()
    const continueBtn = await screen.findByRole('button', { name: 'Continue chat' })
    expect(continueBtn).not.toBeDisabled()

    await user.click(continueBtn)
    expect(onSelectChat).toHaveBeenCalledWith('session-1')
  })

  it('confirms before deleting all chat sessions', async () => {
    render(
      <ChatHistoryPopup
        isVisible
        onClose={vi.fn()}
        onSelectChat={vi.fn()}
        activeSessionId={null}
      />,
    )

    const user = userEvent.setup()
    await user.click(screen.getByText('Delete all my history'))
    expect(
      await screen.findByText('Are you sure you want to delete everything?'),
    ).toBeInTheDocument()

    await user.click(await screen.findByText('Yes, I am sure'))
    await waitFor(() =>
      expect(mockDeleteAllChatSessions).toHaveBeenCalledWith('user-123'),
    )

    await waitFor(() =>
      expect(
        screen.queryByText('Are you sure you want to delete everything?'),
      ).not.toBeInTheDocument(),
    )
  })

  it('prevents viewing the currently active chat', async () => {
    const onSelectChat = vi.fn()

    render(
      <ChatHistoryPopup
        isVisible
        onClose={vi.fn()}
        onSelectChat={onSelectChat}
        activeSessionId="session-1"
      />,
    )

    const user = userEvent.setup()
    const sessionButton = await screen.findByRole('button', { name: /First conversation/ })
    await user.click(sessionButton)

    expect(mockGetChatSession).not.toHaveBeenCalled()

    await waitFor(() =>
      expect(
        screen.getByText('You are currently in this chat. Chat history is only available for previous conversations.'),
      ).toBeInTheDocument(),
    )

    const continueBtn = screen.getByRole('button', { name: 'Continue chat' })
    expect(continueBtn).toBeDisabled()
    expect(onSelectChat).not.toHaveBeenCalled()
  })
})
