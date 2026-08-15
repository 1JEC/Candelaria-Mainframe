import type { DiscoveredCandidate, DiscoverySource } from "./types";
import { DEFAULT_CRAWL } from "@/lib/leads-agent/config";

const CONTACT_PATH_KEYWORDS = ["contact", "over-ons", "team", "vestigingen", "locaties"];

/**
 * Enrichment, not discovery: given a known domain, finds candidate contact/
 * about/team page URLs from /sitemap.xml. Only fetches the sitemap itself
 * here (a machine-readable index conventionally open to crawlers) — actual
 * page fetching goes through Phase 3's robots.txt-respecting crawler, which
 * this function's output feeds into. Not registered as a DiscoverySource
 * (below) because it enriches a known lead, it doesn't discover new ones.
 */
export async function findExpansionUrls(baseUrl: string): Promise<string[]> {
  const sitemapUrl = new URL("/sitemap.xml", baseUrl).toString();
  let xml: string;
  try {
    const res = await fetch(sitemapUrl, {
      headers: { "User-Agent": DEFAULT_CRAWL.userAgent },
      signal: AbortSignal.timeout(DEFAULT_CRAWL.timeoutMs),
    });
    if (!res.ok) return [];
    xml = await res.text();
  } catch {
    return [];
  }

  const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/gi)].map((m) => m[1]);
  return locs.filter((url) => CONTACT_PATH_KEYWORDS.some((kw) => url.toLowerCase().includes(kw)));
}

// Registered in the source registry as a no-op DiscoverySource so
// enrichment adapters are visible in Settings/doctor alongside discovery
// ones, without pretending it produces new candidates from a city/sector
// query — real entry point is findExpansionUrls() above.
export const siteExpansionSource: DiscoverySource = {
  key: "site_expansion",
  label: "Site-uitbreiding (sitemap)",
  isEnabled: () => true,
  async discover(): Promise<DiscoveredCandidate[]> {
    return [];
  },
};
