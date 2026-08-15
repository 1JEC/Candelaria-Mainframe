import { callModel, MODEL_SMART } from "@/lib/agents/anthropic-client";
import type { ScoredSignal } from "@/lib/leads-agent/scoring/types";
import { groundAiOutput } from "./grounding";
import { checkAiGate, gateFailure } from "./gate";
import type { AiJobResult } from "./types";

/**
 * §5: input is the signals array only — never raw HTML. A short, plain
 * Dutch summary of what's actually wrong with the prospect's site, used
 * internally (call prep, evidence review) and as raw material for the
 * outreach pack — not sent to the prospect verbatim.
 */
export async function generatePainBrief(companyName: string, signals: ScoredSignal[], runId?: string): Promise<AiJobResult<string>> {
  const gate = await checkAiGate();
  if (!gate.ok) return gateFailure(gate.reason);

  const painSignals = signals.filter((s) => s.points > 0);
  if (painSignals.length === 0) {
    return { ok: true, data: "Geen pijnpunten met bewijs gevonden.", model: MODEL_SMART, strippedSentences: [] };
  }

  const signalList = painSignals.map((s) => `- ${s.labelNl}: ${s.evidence}`).join("\n");
  const prompt = `Bedrijf: ${companyName}

Gevonden signalen (elk met bewijs):
${signalList}

Schrijf een korte, zakelijke samenvatting (max 3 zinnen) van de belangrijkste problemen met hun website, in het Nederlands. Geen opsomming, gewoon lopende tekst. Geen superlatieven, geen overdrijving.`;

  const { text } = await callModel<never>({
    purpose: "pain_brief",
    model: MODEL_SMART,
    prompt,
    maxTokens: 400,
    runId,
  });

  const grounded = groundAiOutput(text, painSignals);
  return { ok: true, data: grounded.text, model: MODEL_SMART, strippedSentences: grounded.strippedSentences };
}
