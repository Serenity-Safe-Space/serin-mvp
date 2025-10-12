import { afterAll, describe, expect, it, vi } from 'vitest'
import {
  createChatSession,
  saveMessage,
  deleteAllChatSessions,
} from '../lib/chatHistoryService.js'

const fromMock = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args) => fromMock(...args),
  },
}))


describe('chatHistoryService', () => {
  it('creates chat session with truncated title', async () => {
    const single = vi.fn(() =>
      Promise.resolve({
        data: { id: 'session-1', title: 'A very long message that will be truncated' },
        error: null,
      }),
    )
    const select = vi.fn(() => ({ single }))
    const insert = vi.fn(() => ({ select }))

    fromMock.mockImplementationOnce((table) => {
      expect(table).toBe('chat_sessions')
      return { insert }
    })

    const longMessage = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod.'
    const result = await createChatSession('user-1', longMessage)

    expect(insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      title: expect.stringContaining('Lorem ipsum dolor sit amet, consectetur '),
    })
    expect(insert.mock.calls[0][0].title.length).toBeLessThanOrEqual(50)
    expect(result.session.id).toBe('session-1')
    expect(result.error).toBeUndefined()
  })

  it('returns validation error when saving message with invalid role', async () => {
    const result = await saveMessage('session-1', 'system', 'Hello')
    expect(result.error).toBe('Role must be either "user" or "assistant"')
  })

  it('surface errors when deleteAllChatSessions rejects', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const eq = vi.fn(() => Promise.resolve({ error: { message: 'Boom' } }))
    const del = vi.fn(() => ({ eq }))

    fromMock.mockImplementationOnce((table) => {
      expect(table).toBe('chat_sessions')
      return {
        delete: del,
      }
    })

    const result = await deleteAllChatSessions('user-1')
    expect(del).toHaveBeenCalled()
    expect(eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Boom')
    errorSpy.mockRestore()
  })
})
