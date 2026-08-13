import { db } from "@/lib/db";
import { leads } from "@/drizzle/schema";
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
      .select({ id: leads.id })
      .from(leads)
      .where(eq(leads.registrableDomain, candidate.registrableDomain));
    if (byDomain) return byDomain.id;
  }

  const kvkNumber = typeof candidate.raw.kvkNummer === "string" ? candidate.raw.kvkNummer : undefined;
  if (kvkNumber) {
    const [byKvk] = await db.select({ id: leads.id }).from(leads).where(eq(leads.kvkNumber, kvkNumber));
    if (byKvk) return byKvk.id;
  }

  const phoneE164 = candidate.phone ? normalizePhoneE164NL(candidate.phone) : null;
  if (phoneE164) {
    const [byPhone] = await db.select({ id: leads.id }).from(leads).where(eq(leads.phoneE164, phoneE164));
    if (byPhone) return byPhone.id;
  }

  if (candidate.postcode) {
    const sameArea = await db
      .select({ id: leads.id, name: leads.company })
      .from(leads)
      .where(and(eq(leads.postcode, candidate.postcode), isNotNull(leads.company)));
    for (const existing of sameArea) {
      if (!existing.name) continue;
      const similarity = diceSimilarity(existing.name, candidate.companyName);
      if (similarity >= FUZZY_THRESHOLD) return existing.id;
    }
  }

  return null;
}
