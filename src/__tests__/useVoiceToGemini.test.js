import { describe, expect, it } from 'vitest'
import { __testables } from '../useVoiceToGemini.js'

const {
  convertInt16ToBase64,
  parseSampleRateFromMime,
  computeRms,
} = __testables

describe('useVoiceToGemini helpers', () => {
  it('converts PCM data to base64 and back', () => {
    const samples = new Int16Array([0, 32767, -32768])
    const encoded = convertInt16ToBase64(samples)
    expect(encoded).toBeTruthy()

    const decodedString = atob(encoded)
    const decodedBytes = new Uint8Array(decodedString.length)
    for (let i = 0; i < decodedString.length; i += 1) {
      decodedBytes[i] = decodedString.charCodeAt(i)
    }
    const roundTripped = new Int16Array(decodedBytes.buffer)

    expect(Array.from(roundTripped)).toEqual(Array.from(samples))
  })

  it('parses sample rate from mime string with fallback', () => {
    expect(parseSampleRateFromMime('audio/pcm;rate=44100')).toBe(44100)
    expect(parseSampleRateFromMime('audio/pcm')).toBe(24000)
    expect(parseSampleRateFromMime(undefined)).toBe(24000)
  })

  it('computes RMS for given PCM data', () => {
    const rms = computeRms(new Int16Array([32767, -32768, 0]))
    expect(rms).toBeGreaterThan(0.8)
    expect(rms).toBeLessThan(0.82)
  })
})
