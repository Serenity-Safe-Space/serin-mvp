import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ResetPassword from '../ResetPassword.jsx'

const mockNavigate = vi.fn()
const mockGetSession = vi.fn()
const mockOnAuthStateChange = vi.fn()
const mockUpdateUser = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args) => mockGetSession(...args),
      onAuthStateChange: (...args) => mockOnAuthStateChange(...args),
      updateUser: (...args) => mockUpdateUser(...args),
    },
  },
}))

const translationMap = {
  'resetPassword.title': 'Reset Password',
  'resetPassword.subtitle':
    "Enter a new password for your account. We'll sign you in with the updated credentials.",
  'resetPassword.verifying': 'Verifying your reset link…',
  'resetPassword.errors.verify': 'Something went wrong while verifying your reset link. Please request a new email.',
  'resetPassword.errors.length': 'Password must be at least 6 characters long.',
  'resetPassword.errors.mismatch': 'Passwords do not match.',
  'resetPassword.errors.inactive': 'Your reset link is not active. Try opening the link again from your email.',
  'resetPassword.errors.update': 'Failed to update password. Please try again.',
  'resetPassword.success': 'Your password has been updated! Redirecting you back to Serin…',
  'resetPassword.form.newPasswordLabel': 'New password',
  'resetPassword.form.newPasswordPlaceholder': 'Enter a new password',
  'resetPassword.form.confirmPasswordLabel': 'Confirm password',
  'resetPassword.form.confirmPasswordPlaceholder': 'Re-enter the new password',
  'resetPassword.buttons.submitIdle': 'Update Password',
  'resetPassword.buttons.submitLoading': 'Updating…',
  'resetPassword.buttons.back': 'Back to Serin',
}

vi.mock('../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: vi.fn(),
    t: (key) => translationMap[key] ?? key,
  }),
}))

describe('ResetPassword', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockGetSession.mockReset()
    mockOnAuthStateChange.mockReset()
    mockUpdateUser.mockReset()

    mockGetSession.mockResolvedValue({
      data: { session: {} },
      error: null,
    })

    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })

    mockUpdateUser.mockResolvedValue({ error: null })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('validates password length and mismatch', async () => {
    render(<ResetPassword />)

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('New password'), '123')
    await user.type(screen.getByLabelText('Confirm password'), '1234')
    await user.click(screen.getByRole('button', { name: 'Update Password' }))

    expect(
      screen.getByText('Password must be at least 6 characters long.'),
    ).toBeInTheDocument()

    await user.clear(screen.getByLabelText('New password'))
    await user.clear(screen.getByLabelText('Confirm password'))

    await user.type(screen.getByLabelText('New password'), 'secure123')
    await user.type(screen.getByLabelText('Confirm password'), 'different123')
    await user.click(screen.getByRole('button', { name: 'Update Password' }))

    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

  it('updates password successfully and redirects', async () => {
    render(<ResetPassword />)

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('New password'), 'secure123')
    await user.type(screen.getByLabelText('Confirm password'), 'secure123')
    await user.click(screen.getByRole('button', { name: 'Update Password' }))

    await waitFor(() =>
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'secure123' }),
    )

    expect(
      screen.getByText('Your password has been updated! Redirecting you back to Serin…'),
    ).toBeInTheDocument()

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'), {
      timeout: 1600,
    })
  })

  it('navigates back when back button clicked', async () => {
    render(<ResetPassword />)

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Back to Serin' }))
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })
})
