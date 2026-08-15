import { db } from "@/db";
import { prospectLeads } from "@/db/schema";
import { and, eq, isNotNull } from "drizzle-orm";
import { normalizePhoneE164NL } from "@/lib/leads-agent/domain";
import { diceSimilarity } from "@/lib/leads-agent/similarity";
import type { DiscoveredCandidate } from "@/lib/leads-agent/discovery/types";

const FUZZY_THRESHOLD = 0.9;

/**
 * §5/§8 dedupe order: registrable domain → KvK → phone_e164 → fuzzy
 * name+postcode (≥0.9). Returns the existing lead id, or null if the
 * candidate looks new.
 */
export async function findExistingLeadId(candidate: DiscoveredCandidate): Promise<string | null> {
  if (candidate.registrableDomain) {
    const [byDomain] = await db
      .select({ id: prospectLeads.id })
      .from(prospectLeads)
      .where(eq(prospectLeads.registrableDomain, candidate.registrableDomain));
    if (byDomain) return byDomain.id;
  }

  const kvkNumber = typeof candidate.raw.kvkNummer === "string" ? candidate.raw.kvkNummer : undefined;
  if (kvkNumber) {
    const [byKvk] = await db.select({ id: prospectLeads.id }).from(prospectLeads).where(eq(prospectLeads.kvkNumber, kvkNumber));
    if (byKvk) return byKvk.id;
  }

  const phoneE164 = candidate.phone ? normalizePhoneE164NL(candidate.phone) : null;
  if (phoneE164) {
    const [byPhone] = await db.select({ id: prospectLeads.id }).from(prospectLeads).where(eq(prospectLeads.phoneE164, phoneE164));
    if (byPhone) return byPhone.id;
  }

  if (candidate.postcode) {
    const sameArea = await db
      .select({ id: prospectLeads.id, name: prospectLeads.company })
      .from(prospectLeads)
      .where(and(eq(prospectLeads.postcode, candidate.postcode), isNotNull(prospectLeads.company)));
    for (const existing of sameArea) {
      if (!existing.name) continue;
      const similarity = diceSimilarity(existing.name, candidate.companyName);
      if (similarity >= FUZZY_THRESHOLD) return existing.id;
    }
  }

  return null;
}
