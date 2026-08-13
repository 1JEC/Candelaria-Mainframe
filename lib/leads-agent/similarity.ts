/** Dice's coefficient over character bigrams — used for fuzzy name+postcode dedupe (spec: ≥0.9). */
export function diceSimilarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const bigramsA = bigrams(na);
  const bigramsB = bigrams(nb);
  if (bigramsA.length === 0 || bigramsB.length === 0) return 0;

  let intersection = 0;
  const bCounts = new Map<string, number>();
  for (const bg of bigramsB) bCounts.set(bg, (bCounts.get(bg) ?? 0) + 1);
  for (const bg of bigramsA) {
    const remaining = bCounts.get(bg) ?? 0;
    if (remaining > 0) {
      intersection++;
      bCounts.set(bg, remaining - 1);
    }
  }
  return (2 * intersection) / (bigramsA.length + bigramsB.length);
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics after NFD decomposition
    .replace(/[^a-z0-9]/g, "");
}

function bigrams(s: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2));
  return out;
}
