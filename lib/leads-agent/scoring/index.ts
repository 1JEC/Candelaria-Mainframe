import { DEFAULT_ICP, DEFAULT_RUBRIC } from "@/lib/leads-agent/config";
import { evaluateFitSignals, evaluatePainSignals } from "./signals";
import type { ScoringInput, ScoringResult } from "./types";

export type { ScoringInput, ScoringResult, ScoredSignal } from "./types";

/**
 * §7 rubric: fit (0-40) + pain (0-60), evidence-bound. `fit < minFitToQualify`
 * disqualifies regardless of pain. Only qualified prospectLeads (total >= minScore
 * AND fit >= minFitToQualify) should ever reach the prospectLeads list/exports —
 * the caller (Phase 6) is responsible for gating on `qualified`, this
 * function just computes it.
 */
export function scoreLead(
  input: ScoringInput,
  icp: typeof DEFAULT_ICP = DEFAULT_ICP,
  rubric: typeof DEFAULT_RUBRIC = DEFAULT_RUBRIC
): ScoringResult {
  const fitSignals = evaluateFitSignals(input, icp, rubric);
  const painSignals = evaluatePainSignals(input, rubric);

  const fitScore = Math.min(40, fitSignals.reduce((sum, s) => sum + s.points, 0));
  const painScore = Math.min(60, painSignals.reduce((sum, s) => sum + s.points, 0));
  const totalScore = Math.min(100, fitScore + painScore);

  const disqualified = fitScore < rubric.minFitToQualify;
  const priority = disqualified ? null : priorityFor(totalScore, rubric);
  const qualified = !disqualified && totalScore >= rubric.minScore;

  return {
    fitScore,
    painScore,
    totalScore,
    priority,
    qualified,
    disqualifiedReason: disqualified
      ? `Fit-score (${fitScore}) onder de drempel van ${rubric.minFitToQualify} — gediskwalificeerd ongeacht pain-score.`
      : null,
    signals: [...fitSignals, ...painSignals],
    recommendedOffer: recommendOffer(input, painScore),
    recommendedChannel: recommendChannel(input),
  };
}

function priorityFor(totalScore: number, rubric: typeof DEFAULT_RUBRIC): "A" | "B" | "C" | null {
  if (totalScore >= rubric.priorityA) return "A";
  if (totalScore >= rubric.priorityB) return "B";
  if (totalScore >= rubric.priorityC) return "C";
  return null;
}

// ASSUMPTION: the spec defines the scoring rubric precisely but not an
// exact offer/channel-recommendation algorithm — this is a reasonable,
// documented heuristic against Candelaria's real service ladder (never
// price-led in outreach; the offer only shapes internal prioritization).
function recommendOffer(input: ScoringInput, painScore: number): string {
  if (!input.hasWebsite || !input.audit) return "Foundation";
  if (painScore >= 40) return "Foundation";
  if (painScore >= 20) return "Storefront";
  return "Audit";
}

function recommendChannel(input: ScoringInput): string | null {
  if (input.contacts?.emailGeneral) return "email";
  if (input.contacts?.phoneE164) return "phone";
  if (input.contacts?.contactFormUrl) return "contact_form";
  return null;
}
