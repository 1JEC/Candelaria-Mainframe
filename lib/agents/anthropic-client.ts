import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { agentRuns } from "@/drizzle/schema";
import { and, eq, gte, sql } from "drizzle-orm";

const client = new Anthropic();

// Real current model IDs (verified against the claude-api skill's cached
// catalog, 2026-06-24) — not the "claude-opus-4-7" string the three existing
// agent files use, which is not a real model ID.
export const MODEL_CHEAP = process.env.MODEL_CHEAP || "claude-haiku-4-5";
export const MODEL_SMART = process.env.MODEL_SMART || "claude-sonnet-5";

// USD list price per million tokens. Compared directly against
// AI_DAILY_BUDGET_EUR without currency conversion — deliberately
// conservative (USD ≥ EUR most of the time), logged as an ASSUMPTION rather
// than pulling in an FX dependency for a soft budget guard.
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-5": { input: 3.0, output: 15.0 },
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
};

const GROUNDING_SUFFIX =
  "\n\nUse only the facts provided. If a fact is missing, omit it. Never invent numbers, names or findings.";

/** Missing key -> the whole AI layer disables itself gracefully, same as any other optional adapter (§5: "pipeline continues without AI"). */
export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
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
    const message = await client.messages.create({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 1024,
      system: opts.system,
      messages: [{ role: "user", content: opts.prompt + GROUNDING_SUFFIX }],
    });

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    const json = extractJson<T>(text);

    const pricing = PRICING[opts.model];
    const cost = pricing
      ? (message.usage.input_tokens / 1_000_000) * pricing.input +
        (message.usage.output_tokens / 1_000_000) * pricing.output
      : 0;

    await db.insert(agentRuns).values({
      id: runId,
      agentType: "leads_agent",
      module: "leads",
      inputSummary: opts.purpose,
      toolsCalled: [],
      outputSummary: text.slice(0, 500),
      success: true,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
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
