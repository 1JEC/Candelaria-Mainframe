import { gte } from 'drizzle-orm'

import { db } from '@/db'
import { prospectAiCalls } from '@/db/schema'
import { chat, estimateCost, isAiConfigured } from './providers'

export { isAiConfigured, activeProvider, describeProvider } from './providers'

// Defaults are Anthropic model IDs; on a free backend both are overridden by
// MODEL_CHEAP/MODEL_SMART (e.g. "llama-3.3-70b-versatile" on Groq).
export const MODEL_CHEAP = process.env.MODEL_CHEAP || 'claude-haiku-4-5'
export const MODEL_SMART = process.env.MODEL_SMART || 'claude-sonnet-5'

const GROUNDING_SUFFIX =
  '\n\nUse only the facts provided. If a fact is missing, omit it. Never invent numbers, names or findings.'

/**
 * Missing key -> the whole AI layer disables itself gracefully (pipeline
 * continues without AI).
 * @deprecated Use isAiConfigured — kept so existing call sites keep compiling.
 */
export function isAnthropicConfigured(): boolean {
  return isAiConfigured()
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
    const response = await chat({
      model: opts.model,
      maxTokens: opts.maxTokens ?? 1024,
      system: opts.system,
      prompt: opts.prompt + GROUNDING_SUFFIX,
    })

    const text = response.text
    const json = extractJson<T>(text)
    const cost = estimateCost(opts.model, response.inputTokens, response.outputTokens)

    await db.insert(prospectAiCalls).values({
      runId: opts.runId ?? null,
      purpose: opts.purpose,
      model: opts.model,
      success: true,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
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
