// Provider-agnostic since the free-backend work: the transport lives in
// ./providers.ts and may be Anthropic, a free hosted tier (Groq, OpenRouter,
// Gemini, Mistral) or a local Ollama. The filename is kept so the six call
// sites don't churn; everything below is backend-independent.
import { db } from "@/lib/db";
import { agentRuns } from "@/drizzle/schema";
import { and, eq, gte, sql } from "drizzle-orm";
import { chat, estimateCost, isAiConfigured } from "./providers";

export { isAiConfigured, activeProvider, describeProvider } from "./providers";

// Defaults are Anthropic model IDs; on a free backend both are overridden by
// MODEL_CHEAP/MODEL_SMART (e.g. "llama-3.3-70b-versatile" on Groq, or
// "qwen2.5:7b" on a local Ollama).
export const MODEL_CHEAP = process.env.MODEL_CHEAP || "claude-haiku-4-5";
export const MODEL_SMART = process.env.MODEL_SMART || "claude-sonnet-5";

const GROUNDING_SUFFIX =
  "\n\nUse only the facts provided. If a fact is missing, omit it. Never invent numbers, names or findings.";

/**
 * Missing key -> the whole AI layer disables itself gracefully, same as any
 * other optional adapter (§5: "pipeline continues without AI").
 * @deprecated Use isAiConfigured — kept so existing call sites keep compiling.
 */
export function isAnthropicConfigured(): boolean {
  return isAiConfigured();
}

export async function getTodaySpendEur(): Promise<number> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${agentRuns.estimatedCost}),0)` })
    .from(agentRuns)
    .where(and(eq(agentRuns.agentType, "leads_agent"), gte(agentRuns.createdAt, since)));
  return Number(row?.total ?? 0);
}

export async function checkAiBudget(): Promise<{ ok: boolean; spentEur: number; capEur: number }> {
  const capEur = Number(process.env.AI_DAILY_BUDGET_EUR ?? 2.0);
  const spentEur = await getTodaySpendEur();
  return { ok: spentEur < capEur, spentEur, capEur };
}

function extractJson<T = unknown>(text: string): T | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

/**
 * Shared wrapper: call model, log to agent_runs (doubles as the ai_usage
 * table via the leadRunId/purpose columns), extract JSON, ground the prompt.
 * Replaces the triplicated client-init + JSON-regex + try/catch logging
 * boilerplate in prospector.ts / email-triage.ts / content-generator.ts.
 */
export async function callModel<T = unknown>(opts: {
  purpose: string; // sector_classification | pain_brief | outreach_pack | call_prep
  model: string;
  system?: string;
  prompt: string;
  maxTokens?: number;
  leadRunId?: string;
}): Promise<{ text: string; json: T | null; runId: string }> {
  const runId = crypto.randomUUID();
  const startedAt = Date.now();

  try {
    const response = await chat({
      model: opts.model,
      maxTokens: opts.maxTokens ?? 1024,
      system: opts.system,
      prompt: opts.prompt + GROUNDING_SUFFIX,
    });

    const text = response.text;
    const json = extractJson<T>(text);
    const cost = estimateCost(opts.model, response.inputTokens, response.outputTokens);

    await db.insert(agentRuns).values({
      id: runId,
      agentType: "leads_agent",
      module: "leads",
      inputSummary: opts.purpose,
      toolsCalled: [],
      outputSummary: text.slice(0, 500),
      success: true,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      estimatedCost: cost.toFixed(4),
      startedAt: new Date(startedAt),
      completedAt: new Date(),
      duration: Date.now() - startedAt,
      leadRunId: opts.leadRunId ?? null,
      purpose: opts.purpose,
    });

    return { text, json, runId };
  } catch (err) {
    await db.insert(agentRuns).values({
      id: runId,
      agentType: "leads_agent",
      module: "leads",
      inputSummary: opts.purpose,
      toolsCalled: [],
      success: false,
      errorMessage: err instanceof Error ? err.message : String(err),
      startedAt: new Date(startedAt),
      completedAt: new Date(),
      duration: Date.now() - startedAt,
      leadRunId: opts.leadRunId ?? null,
      purpose: opts.purpose,
    });
    throw err;
  }
}

/**
 * Strips any sentence containing a digit that doesn't appear in the lead's
 * own signals — the post-validation gate against ungrounded AI claims.
 */
export function stripUngroundedNumbers(text: string, groundedNumbers: Set<string>): { text: string; stripped: string[] } {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const kept: string[] = [];
  const stripped: string[] = [];
  for (const sentence of sentences) {
    const digits = sentence.match(/\d+([.,]\d+)?/g) ?? [];
    const hasUngrounded = digits.some((d) => !groundedNumbers.has(d));
    if (hasUngrounded) stripped.push(sentence);
    else kept.push(sentence);
  }
  return { text: kept.join(" ").trim(), stripped };
}
