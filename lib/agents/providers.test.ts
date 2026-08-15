import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { activeProvider, describeProvider, estimateCost, isAiConfigured, resolveBaseUrl } from './providers'

const AI_ENV_KEYS = ['AI_PROVIDER', 'AI_BASE_URL', 'AI_API_KEY', 'ANTHROPIC_API_KEY'] as const
let saved: Record<string, string | undefined>

beforeEach(() => {
  saved = Object.fromEntries(AI_ENV_KEYS.map((k) => [k, process.env[k]]))
  for (const key of AI_ENV_KEYS) delete process.env[key]
})

afterEach(() => {
  for (const key of AI_ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
})

describe('provider selection', () => {
  it('defaults to anthropic when nothing is configured', () => {
    expect(activeProvider()).toBe('anthropic')
  })

  it('switches to the openai-compatible transport on request', () => {
    process.env.AI_PROVIDER = 'openai'
    expect(activeProvider()).toBe('openai')
  })

  it("infers the free path from AI_BASE_URL when AI_PROVIDER was forgotten", () => {
    process.env.AI_BASE_URL = 'groq'
    expect(activeProvider()).toBe('openai')
  })

  it('lets an explicit anthropic setting win over a stray base URL', () => {
    process.env.AI_PROVIDER = 'anthropic'
    process.env.AI_BASE_URL = 'groq'
    expect(activeProvider()).toBe('anthropic')
  })

  it('ignores casing and surrounding whitespace on AI_PROVIDER', () => {
    process.env.AI_PROVIDER = ' OpenAI '
    expect(activeProvider()).toBe('openai')
  })
})

describe('base URL resolution', () => {
  it('expands every documented free preset', () => {
    const expected: Record<string, string> = {
      ollama: 'http://localhost:11434/v1',
      groq: 'https://api.groq.com/openai/v1',
      openrouter: 'https://openrouter.ai/api/v1',
      gemini: 'https://generativelanguage.googleapis.com/v1beta/openai',
      mistral: 'https://api.mistral.ai/v1',
    }
    for (const [preset, url] of Object.entries(expected)) {
      process.env.AI_BASE_URL = preset
      expect(resolveBaseUrl()).toBe(url)
    }
  })

  it('is case-insensitive on presets', () => {
    process.env.AI_BASE_URL = 'Ollama'
    expect(resolveBaseUrl()).toBe('http://localhost:11434/v1')
  })

  it('passes a full URL through and strips a trailing slash', () => {
    process.env.AI_BASE_URL = 'https://my-endpoint.example/v1/'
    expect(resolveBaseUrl()).toBe('https://my-endpoint.example/v1')
  })

  it('returns null for an unknown bare word rather than guessing a URL', () => {
    process.env.AI_BASE_URL = 'nonexistent-provider'
    expect(resolveBaseUrl()).toBeNull()
  })
})

describe('configuration gate', () => {
  it('requires an Anthropic key on the paid path', () => {
    process.env.AI_PROVIDER = 'anthropic'
    expect(isAiConfigured()).toBe(false)
    process.env.ANTHROPIC_API_KEY = 'sk-test'
    expect(isAiConfigured()).toBe(true)
  })

  it('needs no key for a local endpoint', () => {
    process.env.AI_PROVIDER = 'openai'
    process.env.AI_BASE_URL = 'ollama'
    expect(isAiConfigured()).toBe(true)
  })

  it('requires a key for a hosted free tier', () => {
    process.env.AI_PROVIDER = 'openai'
    process.env.AI_BASE_URL = 'groq'
    expect(isAiConfigured()).toBe(false)
    process.env.AI_API_KEY = 'gsk-test'
    expect(isAiConfigured()).toBe(true)
  })

  it('is not configured when the endpoint is missing entirely', () => {
    process.env.AI_PROVIDER = 'openai'
    process.env.AI_API_KEY = 'key-without-endpoint'
    expect(isAiConfigured()).toBe(false)
  })

  it('says out loud that a local endpoint is free', () => {
    process.env.AI_PROVIDER = 'openai'
    process.env.AI_BASE_URL = 'ollama'
    expect(describeProvider()).toContain('geen kosten')
  })
})

describe('cost estimation', () => {
  it('prices known Anthropic models', () => {
    expect(estimateCost('claude-sonnet-5', 1_000_000, 1_000_000)).toBeCloseTo(18.0, 5)
  })

  it('charges nothing for free-tier and local models', () => {
    expect(estimateCost('llama-3.3-70b-versatile', 500_000, 200_000)).toBe(0)
    expect(estimateCost('qwen2.5:14b', 1_000_000, 1_000_000)).toBe(0)
  })

  it('handles a backend that reports no usage', () => {
    expect(estimateCost('qwen2.5:7b', 0, 0)).toBe(0)
  })
})
