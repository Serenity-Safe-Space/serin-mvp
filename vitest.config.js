import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig(() => {
  const isTest = process.env.VITEST === 'true'

  const alias = isTest
    ? [
        {
          find: '@google/generative-ai',
          replacement: resolve(__dirname, 'test/mocks/googleGenerativeAi.js'),
        },
        {
          find: '@supabase/supabase-js',
          replacement: resolve(__dirname, 'test/mocks/supabase.js'),
        },
        {
          find: './useVoiceToGemini',
          replacement: resolve(__dirname, 'test/mocks/useVoiceToGeminiModule.js'),
        },
        {
          find: '../useVoiceToGemini',
          replacement: resolve(__dirname, 'test/mocks/useVoiceToGeminiModule.js'),
        },
      ]
    : []

  return {
    plugins: [react()],
    resolve: {
      alias,
    },
    test: {
      environment: 'jsdom',
      setupFiles: './test/setup.ts',
      globals: true,
      css: true,
      restoreMocks: true,
      clearMocks: true,
      threads: false,
      deps: {
        optimizer: {
          web: {
            exclude: ['@google/generative-ai', '@supabase/supabase-js'],
          },
        },
      },
    },
  }
})
