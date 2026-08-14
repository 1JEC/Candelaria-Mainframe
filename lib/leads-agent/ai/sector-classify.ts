import { z } from "zod";
import { callModel, MODEL_CHEAP } from "@/lib/agents/anthropic-client";
import { DEFAULT_ICP } from "@/lib/leads-agent/config";
import { checkAiGate } from "./gate";

const BATCH_SIZE = 20;

export interface ClassifyCandidate {
  id: string;
  name: string;
  context?: string; // e.g. OSM tags, crawled <title>/meta description — short, never raw HTML
}
export interface ClassifyResult {
  id: string;
  sector: string | null; // null = model couldn't confidently pick a known ICP sector
  confidence: number;
}

function buildSchema(sectors: string[]) {
  return z.object({
    results: z.array(
      z.object({
        id: z.string(),
        sector: z.enum(sectors as [string, ...string[]]).nullable(),
        confidence: z.number().min(0).max(1),
      })
    ),
  });
}

function buildPrompt(batch: ClassifyCandidate[], sectors: string[]): string {
  const list = batch.map((c) => `- id: ${c.id} | naam: ${c.name}${c.context ? ` | context: ${c.context.slice(0, 200)}` : ""}`).join("\n");
  return `Classificeer elk bedrijf hieronder naar precies één sector uit deze lijst: ${sectors.join(", ")}.
Als geen enkele sector duidelijk past, gebruik dan null voor sector en confidence 0.

Bedrijven:
${list}

Antwoord met JSON in dit exacte formaat, niets anders:
{"results":[{"id":"...","sector":"...of null","confidence":0.0}]}`;
}

async function classifyBatch(batch: ClassifyCandidate[], leadRunId?: string): Promise<ClassifyResult[]> {
  const sectors = DEFAULT_ICP.sectors;
  const schema = buildSchema(sectors);
  const prompt = buildPrompt(batch, sectors);

  for (let attempt = 0; attempt < 2; attempt++) {
    const { json } = await callModel<unknown>({
      purpose: "sector_classification",
      model: MODEL_CHEAP,
      prompt: attempt === 0 ? prompt : `${prompt}\n\n(Je vorige antwoord was geen geldige JSON in het gevraagde formaat. Probeer opnieuw.)`,
      maxTokens: 200 + batch.length * 40,
      leadRunId,
    });

    const parsed = schema.safeParse(json);
    if (parsed.success) return parsed.data.results;
  }

  // Both attempts failed validation — fail open with unclassified rather than throwing (one bad batch shouldn't kill a run).
  return batch.map((c) => ({ id: c.id, sector: null, confidence: 0 }));
}

/** Batched (20), structured JSON, zod-validated, one retry — per spec §5. */
export async function classifySectors(candidates: ClassifyCandidate[], leadRunId?: string): Promise<ClassifyResult[]> {
  const gate = await checkAiGate();
  if (!gate.ok) return candidates.map((c) => ({ id: c.id, sector: null, confidence: 0 }));

  const results: ClassifyResult[] = [];
  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);
    results.push(...(await classifyBatch(batch, leadRunId)));
  }
  return results;
}
