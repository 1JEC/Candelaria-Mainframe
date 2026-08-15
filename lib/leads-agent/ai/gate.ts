import { checkAiBudget, isAnthropicConfigured } from "@/lib/agents/anthropic-client";
import type { AiJobResult } from "./types";

/** Checked before every AI job: missing key or exhausted daily budget both degrade gracefully, never crash the run. */
export async function checkAiGate(): Promise<{ ok: true } | { ok: false; reason: "budget_exceeded" | "no_api_key" }> {
  if (!isAnthropicConfigured()) return { ok: false, reason: "no_api_key" };
  const budget = await checkAiBudget();
  if (!budget.ok) return { ok: false, reason: "budget_exceeded" };
  return { ok: true };
}

export function gateFailure<T>(reason: "budget_exceeded" | "no_api_key"): AiJobResult<T> {
  return { ok: false, reason };
}
