import { describe, expect, it } from 'vitest'
import { buildMoodShiftPrompt } from '../utils/memoryPrompts.js'

describe('buildMoodShiftPrompt', () => {
  it('returns empty string for invalid input', () => {
    expect(buildMoodShiftPrompt(null)).toBe('')
    expect(buildMoodShiftPrompt([])).toBe('')
  })

  it('formats messages and escapes backticks', () => {
    const prompt = buildMoodShiftPrompt([
      { role: 'user', content: 'hey `there`' },
      { role: 'assistant', content: 'hello friend' },
    ])

    expect(prompt).toContain('USER: hey \\`there\\`')
    expect(prompt).toContain('ASSISTANT: hello friend')
    expect(prompt).toContain('Transcript:')
  })
})
