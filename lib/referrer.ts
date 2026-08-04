/** Parses a referrer URL into a bare hostname; empty/invalid -> '(direct)'. */
export function referrerDomain(referrer: string | null | undefined): string {
  if (!referrer) return '(direct)'
  try {
    return new URL(referrer).hostname.replace(/^www\./, '')
  } catch {
    return '(direct)'
  }
}
