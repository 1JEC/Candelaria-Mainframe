import { osmOverpassSource } from "./osm-overpass";
import { googlePlacesSource } from "./google-places";
import { kvkSource } from "./kvk";
import { csvSeedSource } from "./csv-seed";
import { siteExpansionSource } from "./site-expansion";
import { findExistingLeadId } from "@/lib/leads-agent/dedupe";
import { isSuppressed } from "@/lib/leads-agent/suppression";
import type { DiscoveredCandidate, DiscoveryParams, DiscoverySource } from "./types";

export const DISCOVERY_SOURCES: DiscoverySource[] = [
  osmOverpassSource,
  googlePlacesSource,
  kvkSource,
  csvSeedSource,
  siteExpansionSource,
];

export function enabledSources(): DiscoverySource[] {
  return DISCOVERY_SOURCES.filter((s) => s.isEnabled());
}

export interface DiscoveryOutcome {
  candidate: DiscoveredCandidate;
  status: "new" | "duplicate" | "suppressed";
  existingLeadId?: string;
}

/**
 * Runs every enabled discovery source for one city/sector, then dedupes
 * (§5/§8 order) and checks prospectSuppression (§4 rule 8, "before enrichment")
 * before any candidate is handed to the crawler/audit pipeline (Phase 3).
 * Sources that error (a flaky API, a rate limit) are skipped, not fatal —
 * one broken source never blocks the others.
 */
export async function discoverCandidates(params: DiscoveryParams): Promise<{
  outcomes: DiscoveryOutcome[];
  sourceErrors: { source: string; error: string }[];
}> {
  const outcomes: DiscoveryOutcome[] = [];
  const sourceErrors: { source: string; error: string }[] = [];

  for (const source of enabledSources()) {
    if (source.key === "csv_seed" || source.key === "site_expansion") continue; // not city/sector search sources
    try {
      const candidates = await source.discover(params);
      for (const candidate of candidates) {
        outcomes.push(await classifyCandidate(candidate));
      }
    } catch (err) {
      sourceErrors.push({ source: source.key, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return { outcomes, sourceErrors };
}

export async function classifyCandidate(candidate: DiscoveredCandidate): Promise<DiscoveryOutcome> {
  const suppressed = await isSuppressed({
    domain: candidate.registrableDomain,
    phone: candidate.phone,
  });
  if (suppressed) return { candidate, status: "suppressed" };

  const existingLeadId = await findExistingLeadId(candidate);
  if (existingLeadId) return { candidate, status: "duplicate", existingLeadId };

  return { candidate, status: "new" };
}

export { osmOverpassSource, googlePlacesSource, kvkSource, csvSeedSource, siteExpansionSource };
export type { DiscoveredCandidate, DiscoveryParams, DiscoverySource } from "./types";
