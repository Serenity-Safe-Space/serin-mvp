import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SignInModal from '../SignInModal.jsx'

const authHandlers = {
  signIn: vi.fn(),
  signUp: vi.fn(),
  resetPassword: vi.fn(),
  loading: false,
}

const translationMap = {
  'auth.titles.signIn': 'Sign In',
  'auth.titles.signUp': 'Sign Up',
  'auth.titles.reset': 'Reset Password',
  'auth.subtitle': 'We keep it private',
  'auth.form.emailLabel': 'Email',
  'auth.form.passwordLabel': 'Password',
  'auth.form.emailPlaceholder': 'Enter your email',
  'auth.form.passwordPlaceholder': 'Enter your password',
  'auth.errors.emailRequired': 'Please enter your email',
  'auth.errors.fieldsRequired': 'Please fill in all fields',
  'auth.errors.passwordLength': 'Password must be at least 6 characters',
  'auth.success.signIn': 'Welcome back!',
  'auth.success.signUp': 'Account created!',
  'auth.success.signUpPending':
    'Account created! Please check your email to confirm your account before signing in.',
  'auth.buttons.loading': 'Please wait...',
  'auth.buttons.submitSignIn': 'Sign In',
  'auth.buttons.submitSignUp': 'Create Account',
  'auth.buttons.submitReset': 'Send Reset Link',
  'auth.toggle.signIn': 'Sign In',
  'auth.toggle.signUp': 'Sign Up',
  'auth.reset.link': 'Forgot your password?',
  'auth.backToSignIn': 'Back to Sign In',
  'auth.info.signUpPrompt': 'Already have an account? Click "Sign In" above.',
}

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => authHandlers,
}))

vi.mock('../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: vi.fn(),
    t: (key) => translationMap[key] ?? key,
  }),
}))

describe('SignInModal', () => {
  beforeEach(() => {
    authHandlers.signIn.mockReset()
    authHandlers.signUp.mockReset()
    authHandlers.resetPassword.mockReset()
    authHandlers.loading = false
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not render when hidden', () => {
    const { container } = render(
      <SignInModal isVisible={false} onClose={vi.fn()} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('submits sign in and shows success message', async () => {
    const onClose = vi.fn()
    authHandlers.signIn.mockResolvedValue({ data: { user: {} }, error: null })

    render(<SignInModal isVisible onClose={onClose} />)

    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    const [, submitButton] = screen.getAllByRole('button', { name: 'Sign In' })
    await user.click(submitButton)

    await waitFor(() => expect(authHandlers.signIn).toHaveBeenCalled())
    expect(authHandlers.signIn).toHaveBeenCalledWith('test@example.com', 'password123')
    expect(screen.getByText('Welcome back!')).toBeInTheDocument()

    await waitFor(() => expect(onClose).toHaveBeenCalled(), { timeout: 1500 })
  })

  it('shows validation error when email missing', async () => {
    render(<SignInModal isVisible onClose={vi.fn()} />)

    const user = userEvent.setup()
    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    emailInput.removeAttribute('required')
    passwordInput.removeAttribute('required')
    const [, submitButton] = screen.getAllByRole('button', { name: 'Sign In' })
    await user.click(submitButton)

    expect(await screen.findByText('Please enter your email')).toBeInTheDocument()
    expect(authHandlers.signIn).not.toHaveBeenCalled()
  })

  it('validates password length during sign up', async () => {
    render(<SignInModal isVisible onClose={vi.fn()} />)

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Sign Up' }))
    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), '123')
    await user.click(screen.getByRole('button', { name: 'Create Account' }))

    expect(
      screen.getByText('Password must be at least 6 characters'),
    ).toBeInTheDocument()
    expect(authHandlers.signUp).not.toHaveBeenCalled()
  })
})
