import { createAnthropic } from '@ai-sdk/anthropic'

// Server-side only — ANTHROPIC_API_KEY must never be exposed client-side.
// Never import this file in client components.
export const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const CLAUDE_MODEL = 'claude-sonnet-4-6'
