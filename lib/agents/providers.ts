/**
 * Model transport layer. One reason to exist: the AI calls are the only
 * per-use cost in the whole prospecting pipeline — everything else (Overpass,
 * the crawler, DNS-over-HTTPS, RDAP, PageSpeed Insights) is free. Making the
 * transport swappable lets the same pipeline run on a zero-cost backend
 * without touching a single agent file.
 *
 * Two providers cover every option that matters:
 *   anthropic  — the native SDK, paid per token.
 *   openai     — the OpenAI chat-completions shape, which Groq, OpenRouter,
 *                Gemini, Mistral and a local Ollama all speak. This is the
 *                free path.
 */

import Anthropic from '@anthropic-ai/sdk'

export type ProviderName = 'anthropic' | 'openai'

/**
 * Shorthands for AI_BASE_URL so .env.local stays readable. All of these have
 * a genuinely free tier or are local; rate limits differ and are the caller's
 * problem, not this module's.
 */
const BASE_URL_PRESETS: Record<string, string> = {
  ollama: 'http://localhost:11434/v1', // local, unlimited, no key
  groq: 'https://api.groq.com/openai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai',
  mistral: 'https://api.mistral.ai/v1',
}

/** USD list price per million tokens. Anything absent here costs nothing to call — free tier or local — and is logged as 0.00. */
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-5': { input: 3.0, output: 15.0 },
  'claude-haiku-4-5': { input: 1.0, output: 5.0 },
}

/**
 * Explicit AI_PROVIDER wins. Absent, an AI_BASE_URL implies the free path —
 * silently falling back to the paid backend because one env var was forgotten
 * is exactly the failure mode this layer exists to prevent.
 */
export function activeProvider(): ProviderName {
  const explicit = process.env.AI_PROVIDER?.trim().toLowerCase()
  if (explicit === 'anthropic') return 'anthropic'
  if (explicit === 'openai') return 'openai'
  return process.env.AI_BASE_URL?.trim() ? 'openai' : 'anthropic'
}

export function resolveBaseUrl(): string | null {
  const raw = process.env.AI_BASE_URL?.trim()
  if (!raw) return null
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw.replace(/\/$/, '')
  return BASE_URL_PRESETS[raw.toLowerCase()] ?? null
}

/** A local Ollama needs no key; every hosted endpoint does, free tier or not. */
function isLocalEndpoint(baseUrl: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(baseUrl)
}

/**
 * Missing configuration disables the whole AI layer gracefully rather than
 * throwing — the pipeline still discovers, enriches, audits, scores and
 * assesses risk. Only the drafting steps go quiet.
 */
export function isAiConfigured(): boolean {
  if (activeProvider() === 'anthropic') return Boolean(process.env.ANTHROPIC_API_KEY)
  const baseUrl = resolveBaseUrl()
  if (!baseUrl) return false
  return isLocalEndpoint(baseUrl) || Boolean(process.env.AI_API_KEY)
}

/** Human-readable description of what's active, for the settings screen and the doctor. */
export function describeProvider(): string {
  if (activeProvider() === 'anthropic') return 'Anthropic API (betaald per token)'
  const baseUrl = resolveBaseUrl()
  if (!baseUrl) return 'OpenAI-compatibel endpoint (AI_BASE_URL ontbreekt)'
  return `OpenAI-compatibel endpoint: ${baseUrl}${isLocalEndpoint(baseUrl) ? ' (lokaal, geen kosten)' : ''}`
}

export interface ChatRequest {
  model: string
  system?: string
  prompt: string
  maxTokens: number
}

export interface ChatResponse {
  text: string
  inputTokens: number
  outputTokens: number
}

export async function chat(req: ChatRequest): Promise<ChatResponse> {
  return activeProvider() === 'anthropic' ? chatAnthropic(req) : chatOpenAiCompatible(req)
}

async function chatAnthropic(req: ChatRequest): Promise<ChatResponse> {
  const client = new Anthropic()
  const message = await client.messages.create({
    model: req.model,
    max_tokens: req.maxTokens,
    system: req.system,
    messages: [{ role: 'user', content: req.prompt }],
  })

  return {
    text: message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n'),
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  }
}

interface OpenAiChatResponse {
  choices?: { message?: { content?: string } }[]
  usage?: { prompt_tokens?: number; completion_tokens?: number }
  error?: { message?: string }
}

async function chatOpenAiCompatible(req: ChatRequest): Promise<ChatResponse> {
  const baseUrl = resolveBaseUrl()
  if (!baseUrl) throw new Error('AI_BASE_URL ontbreekt of is geen bekende preset (ollama, groq, openrouter, gemini, mistral).')

  const messages: { role: 'system' | 'user'; content: string }[] = []
  if (req.system) messages.push({ role: 'system', content: req.system })
  messages.push({ role: 'user', content: req.prompt })

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (process.env.AI_API_KEY) headers.Authorization = `Bearer ${process.env.AI_API_KEY}`

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model: req.model, messages, max_tokens: req.maxTokens, temperature: 0.3 }),
    // Local models on modest hardware are slow; hosted free tiers queue.
    signal: AbortSignal.timeout(Number(process.env.AI_TIMEOUT_MS ?? 120000)),
  })

  const json = (await res.json().catch(() => null)) as OpenAiChatResponse | null
  if (!res.ok) {
    throw new Error(`AI-endpoint gaf status ${res.status}${json?.error?.message ? `: ${json.error.message}` : ''}`)
  }

  const text = json?.choices?.[0]?.message?.content
  if (typeof text !== 'string') throw new Error('AI-endpoint gaf geen bruikbare tekst terug.')

  // Ollama and most free tiers report usage; when they don't, 0 is honest —
  // it means "not reported", and cost is 0 on these backends anyway.
  return {
    text,
    inputTokens: json?.usage?.prompt_tokens ?? 0,
    outputTokens: json?.usage?.completion_tokens ?? 0,
  }
}

/** Cost in USD. Unknown model -> 0, which is correct for every free-tier and local backend. */
export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING[model]
  if (!pricing) return 0
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output
}

/**
 * Distinguishes "genuinely free" (a free-tier or local model) from "we simply
 * have no price for this" — estimateCost() alone can't, since both return 0.
 * A caller showing cost to a human needs that distinction: reporting €0,00
 * for an unpriced proprietary model would read as a measurement, not a gap.
 */
export function hasKnownPricing(model: string): boolean {
  return model in PRICING
}
