/**
 * Registrable-domain extraction without a full public-suffix-list
 * dependency. Good enough for this pipeline's actual traffic (.nl/.com/.eu/
 * .be business domains) — logged as an ASSUMPTION rather than adding a new
 * dependency for edge cases (multi-label ccTLDs like .co.uk) this repo's
 * ICP (Den Haag/Rijswijk/Delft/... Dutch MKB) essentially never hits.
 */
export function toRegistrableDomain(input: string): string | null {
  if (!input) return null;
  let host: string;
  try {
    const url = input.includes("://") ? input : `https://${input}`;
    host = new URL(url).hostname;
  } catch {
    return null;
  }
  host = host.toLowerCase().replace(/^www\./, "");
  if (!host.includes(".")) return null;
  return host;
}

export function normalizePhoneE164NL(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("0031")) return `+${digits.slice(2)}`;
  if (digits.startsWith("31")) return `+${digits}`;
  if (digits.startsWith("0")) return `+31${digits.slice(1)}`;
  return null;
}
