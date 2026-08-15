import Anthropic from '@anthropic-ai/sdk'
import { gte } from 'drizzle-orm'

import { db } from '@/db'
import { prospectAiCalls } from '@/db/schema'

const client = new Anthropic()

export const MODEL_CHEAP = process.env.MODEL_CHEAP || 'claude-haiku-4-5'
export const MODEL_SMART = process.env.MODEL_SMART || 'claude-sonnet-5'

// USD list price per million tokens. Compared directly against
// AI_DAILY_BUDGET_EUR without currency conversion — deliberately
// conservative (USD >= EUR most of the time), a soft budget guard rather
// than a billing-accurate figure.
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-5': { input: 3.0, output: 15.0 },
  'claude-haiku-4-5': { input: 1.0, output: 5.0 },
}

const GROUNDING_SUFFIX =
  '\n\nUse only the facts provided. If a fact is missing, omit it. Never invent numbers, names or findings.'

/** Missing key -> the whole AI layer disables itself gracefully (pipeline continues without AI). */
export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

export async function getTodaySpendEur(): Promise<number> {
  const since = new Date()
  since.setHours(0, 0, 0, 0)
  const rows = await db
    .select({ costEur: prospectAiCalls.costEur })
    .from(prospectAiCalls)
    .where(gte(prospectAiCalls.createdAt, since))
  return rows.reduce((sum, r) => sum + Number(r.costEur ?? 0), 0)
}

export async function checkAiBudget(): Promise<{ ok: boolean; spentEur: number; capEur: number }> {
  const capEur = Number(process.env.AI_DAILY_BUDGET_EUR ?? 2.0)
  const spentEur = await getTodaySpendEur()
  return { ok: spentEur < capEur, spentEur, capEur }
}

function extractJson<T = unknown>(text: string): T | null {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    return JSON.parse(match[0]) as T
  } catch {
    return null
  }
}

/**
 * Shared wrapper: call model, log to prospect_ai_calls, extract JSON, ground
 * the prompt. Every prospecting AI job (sector-classify, pain-brief,
 * outreach-pack, call-prep, reply-classify) goes through this — no job talks
 * to the Anthropic SDK directly.
 */
export async function callModel<T = unknown>(opts: {
  purpose: string
  model: string
  system?: string
  prompt: string
  maxTokens?: number
  runId?: string
}): Promise<{ text: string; json: T | null }> {
  const startedAt = new Date()

  try {
    const message = await client.messages.create({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 1024,
      system: opts.system,
      messages: [{ role: 'user', content: opts.prompt + GROUNDING_SUFFIX }],
    })

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
    const json = extractJson<T>(text)

    const pricing = PRICING[opts.model]
    const cost = pricing
      ? (message.usage.input_tokens / 1_000_000) * pricing.input +
        (message.usage.output_tokens / 1_000_000) * pricing.output
      : 0

    await db.insert(prospectAiCalls).values({
      runId: opts.runId ?? null,
      purpose: opts.purpose,
      model: opts.model,
      success: true,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      costEur: cost.toFixed(4),
      outputSummary: text.slice(0, 500),
      startedAt,
      durationMs: Date.now() - startedAt.getTime(),
    })

    return { text, json }
  } catch (err) {
    await db.insert(prospectAiCalls).values({
      runId: opts.runId ?? null,
      purpose: opts.purpose,
      model: opts.model,
      success: false,
      errorMessage: err instanceof Error ? err.message : String(err),
      startedAt,
      durationMs: Date.now() - startedAt.getTime(),
    })
    throw err
  }
}

/**
 * Strips any sentence containing a digit that doesn't appear in the lead's
 * own signals — the post-validation gate against ungrounded AI claims.
 */
export function stripUngroundedNumbers(
  text: string,
  groundedNumbers: Set<string>,
): { text: string; stripped: string[] } {
  const sentences = text.split(/(?<=[.!?])\s+/)
  const kept: string[] = []
  const stripped: string[] = []
  for (const sentence of sentences) {
    const digits = sentence.match(/\d+([.,]\d+)?/g) ?? []
    const hasUngrounded = digits.some((d) => !groundedNumbers.has(d))
    if (hasUngrounded) stripped.push(sentence)
    else kept.push(sentence)
  }
  return { text: kept.join(' ').trim(), stripped }
}
