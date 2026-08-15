import { stripUngroundedNumbers } from "@/lib/agents/anthropic-client";
import type { ScoredSignal } from "@/lib/leads-agent/scoring/types";

const NUMBER_REGEX = /\d+([.,]\d+)?/g;

/** Every digit sequence that appears in the lead's own evidence — the only numbers AI output is allowed to repeat. */
export function extractGroundedNumbers(signals: ScoredSignal[]): Set<string> {
  const numbers = new Set<string>();
  for (const signal of signals) {
    const found = signal.evidence.match(NUMBER_REGEX) ?? [];
    found.forEach((n) => numbers.add(n));
  }
  return numbers;
}

export interface GroundingResult {
  text: string;
  strippedSentences: string[]; // logged by the caller as AI_UNGROUNDED_CLAIM
}

/** §5 post-validation: any digit in AI output absent from the lead's signals -> strip the sentence. */
export function groundAiOutput(text: string, signals: ScoredSignal[]): GroundingResult {
  const grounded = extractGroundedNumbers(signals);
  const { text: cleaned, stripped } = stripUngroundedNumbers(text, grounded);
  return { text: cleaned, strippedSentences: stripped };
}
