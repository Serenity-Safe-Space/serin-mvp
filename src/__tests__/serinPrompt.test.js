import { describe, expect, it } from 'vitest'
import { getSerinPrompt } from '../utils/serinPrompt.js'

describe('getSerinPrompt', () => {
  it('includes greeting section for new chats', () => {
    const prompt = getSerinPrompt([], 'Hello there')
    expect(prompt).toContain('NEW CHAT GREETINGS')
    expect(prompt).toContain("You're Serin")
  })

  it('omits greeting section for ongoing chats and includes history', () => {
    const history = [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello!' },
    ]

    const prompt = getSerinPrompt(history, 'How are you?')

    expect(prompt).not.toContain('NEW CHAT GREETINGS')
    expect(prompt).toContain('user: hi')
    expect(prompt).toContain('assistant: hello!')
  })
})
