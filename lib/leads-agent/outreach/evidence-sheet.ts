import type { ScoredSignal } from "@/lib/leads-agent/scoring/types";

/** Every claim traces to a stored signal — this is that trace, in a shape Johan can actually read before a call. */
export function buildEvidenceSheetMarkdown(companyName: string, signals: ScoredSignal[]): string {
  const scored = signals.filter((s) => s.points > 0).sort((a, b) => b.points - a.points);
  const lines = [`# Bewijs — ${companyName}`, ""];

  if (scored.length === 0) {
    lines.push("Geen signalen met bewijs gevonden.");
    return lines.join("\n");
  }

  for (const signal of scored) {
    lines.push(`## ${signal.labelNl} (+${signal.points})`);
    lines.push(signal.evidence);
    lines.push(`Bron: ${signal.sourceUrl}`);
    lines.push("");
  }

  return lines.join("\n");
}
