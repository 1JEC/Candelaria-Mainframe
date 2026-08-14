import { z } from "zod";
import { callModel, MODEL_SMART } from "@/lib/agents/anthropic-client";
import type { ScoredSignal } from "@/lib/leads-agent/scoring/types";
import { groundAiOutput } from "./grounding";
import { checkAiGate, gateFailure } from "./gate";
import type { AiJobResult } from "./types";

export interface OutreachDrafts {
  email1Body: string; // <=120 words — observation, business cost, soft ask
  email2Body: string; // <=60 words — new angle, +4 days
  email3Body: string; // <=40 words — polite exit, +9 days
  dmBody: string; // 2 sentences, no link
  callScript: {
    opener: string;
    qualifyingQuestions: [string, string, string];
    objectionResponses: [string, string];
    close: string;
  };
}

const DraftsSchema = z.object({
  email1Body: z.string(),
  email2Body: z.string(),
  email3Body: z.string(),
  dmBody: z.string(),
  callScript: z.object({
    opener: z.string(),
    qualifyingQuestions: z.tuple([z.string(), z.string(), z.string()]),
    objectionResponses: z.tuple([z.string(), z.string()]),
    close: z.string(),
  }),
});

const TONE_RULES = `Toon: direct, kalm, geen hype, geen kunstmatige urgentie, geen vleierij, geen gedachtestreepjes, geen "in het huidige digitale landschap", geen superlatieven. Schrijf zoals een vakspecialist die iets concreets heeft opgemerkt — geen marketingtaal. Informeel "je", geen "u".

BELANGRIJK: schrijf alleen de kernboodschap. Voeg GEEN afzender, contactgegevens, privacyverklaring-link of afmeldlink toe — die worden automatisch en apart toegevoegd. Noem nooit prijzen.`;

/**
 * §8 raw draft content only — the identity block, source line, opt-out and
 * privacy link are NOT generated here. Those are compliance-critical (§4
 * rule 7) and get appended deterministically in code (Phase 8), not left
 * to model discretion.
 */
export async function generateOutreachDrafts(
  companyName: string,
  signals: ScoredSignal[],
  painBrief: string,
  leadRunId?: string
): Promise<AiJobResult<OutreachDrafts>> {
  const gate = await checkAiGate();
  if (!gate.ok) return gateFailure(gate.reason);

  const evidenceList = signals
    .filter((s) => s.points > 0)
    .map((s) => `- ${s.labelNl}: ${s.evidence}`)
    .join("\n");

  const prompt = `Bedrijf: ${companyName}
Pijnpunten-samenvatting: ${painBrief}

Bewijs (gebruik alleen deze feiten, verzin niets):
${evidenceList}

${TONE_RULES}

Schrijf outreach-materiaal voor Candelaria Agency (webdesign, richt zich op MKB) om dit bedrijf te benaderen over hun website:
1. email1Body (max 120 woorden): één concrete observatie van hun eigen site → wat het ze kost in zakelijke termen → één zin over de oplossing → zachte uitnodiging voor een gratis 30-minuten auditgesprek.
2. email2Body (max 60 woorden, +4 dagen later, andere invalshoek).
3. email3Body (max 40 woorden, +9 dagen later, beleefde afsluiter).
4. dmBody (2 zinnen, geen link).
5. callScript: opener, 3 kwalificerende vragen, 2 reacties op bezwaren, afsluiting.

Antwoord met JSON in dit exacte formaat:
{"email1Body":"...","email2Body":"...","email3Body":"...","dmBody":"...","callScript":{"opener":"...","qualifyingQuestions":["...","...","..."],"objectionResponses":["...","..."],"close":"..."}}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    const { json } = await callModel<unknown>({
      purpose: "outreach_pack",
      model: MODEL_SMART,
      prompt: attempt === 0 ? prompt : `${prompt}\n\n(Je vorige antwoord was geen geldige JSON in het gevraagde formaat. Probeer opnieuw.)`,
      maxTokens: 1500,
      leadRunId,
    });

    const parsed = DraftsSchema.safeParse(json);
    if (parsed.success) {
      const strippedSentences: string[] = [];
      const groundField = (value: string) => {
        const g = groundAiOutput(value, signals);
        strippedSentences.push(...g.strippedSentences);
        return g.text;
      };

      const data: OutreachDrafts = {
        email1Body: groundField(parsed.data.email1Body),
        email2Body: groundField(parsed.data.email2Body),
        email3Body: groundField(parsed.data.email3Body),
        dmBody: groundField(parsed.data.dmBody),
        callScript: {
          opener: groundField(parsed.data.callScript.opener),
          qualifyingQuestions: parsed.data.callScript.qualifyingQuestions.map(groundField) as [string, string, string],
          objectionResponses: parsed.data.callScript.objectionResponses.map(groundField) as [string, string],
          close: groundField(parsed.data.callScript.close),
        },
      };
      return { ok: true, data, model: MODEL_SMART, strippedSentences };
    }
  }

  throw new Error("Outreach pack generation: model returned invalid JSON twice.");
}
