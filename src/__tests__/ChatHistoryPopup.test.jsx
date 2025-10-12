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
  'chatHistory.deleteAll': 'Delete all my history',
  'chatHistory.errorLoad': 'Failed to load chat history',
  'chatHistory.closeAria': 'Close chat history',
  'chatHistory.dateSeparator': 'at',
  'chatHistory.deleteConfirmTitle': 'Are you sure you want to delete everything?',
  'chatHistory.deleteConfirmCancel': 'Oops, was a mistake',
  'chatHistory.deleteConfirmConfirm': 'Yes, I am sure',
  'chatHistory.deleteConfirmDeleting': 'Deleting...',
  'chatHistory.errorDelete': 'Failed to delete your chat history. Please try again.',
}

const mockGetUserChatSessions = vi.fn()
const mockDeleteAllChatSessions = vi.fn()

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
  deleteAllChatSessions: (...args) => mockDeleteAllChatSessions(...args),
}))

describe('ChatHistoryPopup', () => {
  beforeEach(() => {
    authState.user = { id: 'user-123' }
    mockGetUserChatSessions.mockReset()
    mockDeleteAllChatSessions.mockReset()
    mockGetUserChatSessions.mockResolvedValue({
      sessions: [
        {
          id: 'session-1',
          title: 'First conversation',
          updated_at: '2025-02-10T12:34:00Z',
        },
      ],
      error: null,
    })
    mockDeleteAllChatSessions.mockResolvedValue({ success: true })
  })

  it('loads and displays chat sessions when visible', async () => {
    const onSelectChat = vi.fn()

    render(
      <ChatHistoryPopup
        isVisible
        onClose={vi.fn()}
        onSelectChat={onSelectChat}
      />,
    )

    expect(screen.getByText('Chat History')).toBeInTheDocument()
    await waitFor(() => screen.getByText('First conversation'))

    const user = userEvent.setup()
    await user.click(screen.getByText('First conversation'))
    expect(onSelectChat).toHaveBeenCalledWith('session-1')
  })

  it('confirms before deleting all chat sessions', async () => {
    render(
      <ChatHistoryPopup
        isVisible
        onClose={vi.fn()}
        onSelectChat={vi.fn()}
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
})
