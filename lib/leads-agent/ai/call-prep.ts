import { callModel, MODEL_SMART } from "@/lib/agents/anthropic-client";
import type { ScoredSignal } from "@/lib/leads-agent/scoring/types";
import { groundAiOutput } from "./grounding";
import { checkAiGate, gateFailure } from "./gate";
import type { AiJobResult } from "./types";

/**
 * §9: when a reply is classified `positive`, generate "a reply-prep brief
 * from the evidence" — distinct from the outreach pack's call script
 * (which is a generic opener written before any contact). This is a
 * short, specific brief for the actual call, grounded in both the lead's
 * evidence and what they said in their reply.
 */
export async function generateCallPrepBrief(
  companyName: string,
  signals: ScoredSignal[],
  replyText: string,
  leadRunId?: string
): Promise<AiJobResult<string>> {
  const gate = await checkAiGate();
  if (!gate.ok) return gateFailure(gate.reason);

  const evidenceList = signals
    .filter((s) => s.points > 0)
    .map((s) => `- ${s.labelNl}: ${s.evidence}`)
    .join("\n");

  const prompt = `Bedrijf: ${companyName}

Hun reactie op onze eerdere e-mail:
"${replyText}"

Bewijs over hun website (gebruik alleen deze feiten, verzin niets):
${evidenceList}

Schrijf een korte belvoorbereiding (max 4 zinnen) voor Johan van Candelaria Agency: wat hij moet weten voordat hij belt, gebaseerd op zowel hun reactie als het bewijs. Geen script, gewoon de belangrijkste context en één concreet aanknopingspunt.`;

  const { text } = await callModel<never>({
    purpose: "call_prep",
    model: MODEL_SMART,
    prompt,
    maxTokens: 400,
    leadRunId,
  });

  const grounded = groundAiOutput(text, signals);
  return { ok: true, data: grounded.text, model: MODEL_SMART, strippedSentences: grounded.strippedSentences };
}
