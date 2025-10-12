import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProfilePopup from '../ProfilePopup.jsx'

const authState = {
  user: {
    id: 'user-123',
    user_metadata: { full_name: 'Taylor Example' },
    email: 'taylor@example.com',
  },
}

const translationMap = {
  'profile.encouragement': 'Keep going, {{name}}, you got this',
  'profile.streakLabel': 'Streak',
  'profile.chatHistory': 'Chat history',
  'profile.settings': 'Settings',
  'profile.privacy': 'We keep it private.',
  'profile.friendFallback': 'friend',
  'profile.signedOutTitle': 'Hi there!',
  'profile.signedOutSubtitle':
    'Create an account or sign in now to save your chats, keep your streak, and sync across devices.',
  'profile.signIn': 'Sign In',
}

const mockGetCurrentStreak = vi.fn()

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => authState,
}))

vi.mock('../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: vi.fn(),
    t: (key, replacements = {}) => {
      const template = translationMap[key] ?? key
      return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, token) => replacements[token] ?? '')
    },
  }),
}))

vi.mock('../lib/activityService', () => ({
  getCurrentStreak: (...args) => mockGetCurrentStreak(...args),
}))

describe('ProfilePopup', () => {
  beforeEach(() => {
    authState.user = {
      id: 'user-123',
      user_metadata: { full_name: 'Taylor Example' },
      email: 'taylor@example.com',
    }
    mockGetCurrentStreak.mockResolvedValue({ count: 5 })
  })

  it('returns null when not visible', () => {
    const { container } = renderComponent({ isVisible: false })
    expect(container.firstChild).toBeNull()
  })

  it('shows user info and streak when visible', async () => {
    renderComponent({ isVisible: true })

    await waitFor(() => expect(mockGetCurrentStreak).toHaveBeenCalledWith('user-123'))

    expect(screen.getByText('Keep going, Taylor, you got this')).toBeInTheDocument()
    expect(screen.getByText('Streak')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('Chat history')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('invokes callbacks for chat history and sign-in actions', async () => {
    const onChatHistoryClick = vi.fn()
    const onSignInClick = vi.fn()

    renderComponent({
      isVisible: true,
      onChatHistoryClick,
      onSignInClick,
    })

    await waitFor(() => expect(mockGetCurrentStreak).toHaveBeenCalled())

    const user = userEvent.setup()
    await user.click(screen.getByText('Chat history'))
    expect(onChatHistoryClick).toHaveBeenCalled()
  })

  it('renders signed-out state when user missing', () => {
    authState.user = null
    renderComponent({ isVisible: true, onSignInClick: vi.fn() })

    expect(screen.getByText('Hi there!')).toBeInTheDocument()
    expect(screen.getByText(/Create an account/)).toBeInTheDocument()
    expect(screen.getByText('Sign In')).toBeInTheDocument()
  })
})

function renderComponent(props) {
  const defaultProps = {
    isVisible: true,
    onClose: vi.fn(),
    onSignInClick: vi.fn(),
    onChatHistoryClick: vi.fn(),
    onSettingsClick: vi.fn(),
  }

  return render(<ProfilePopup {...defaultProps} {...props} />)
}
