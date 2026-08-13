import { db } from "@/lib/db";
import { suppression } from "@/drizzle/schema";
import { and, eq, or } from "drizzle-orm";

/**
 * §4 rule 8: suppression is checked before enrichment, before export,
 * before pack generation, and again at send time. This is the "before
 * enrichment" check — called right after discovery/dedupe, before any
 * crawl or contact-extraction work happens for a candidate.
 */
export async function isSuppressed(check: { domain?: string; email?: string; phone?: string; kvk?: string }): Promise<boolean> {
  const conditions = [];
  if (check.domain) conditions.push(and(eq(suppression.kind, "domain"), eq(suppression.value, check.domain)));
  if (check.email) conditions.push(and(eq(suppression.kind, "email"), eq(suppression.value, check.email)));
  if (check.phone) conditions.push(and(eq(suppression.kind, "phone"), eq(suppression.value, check.phone)));
  if (check.kvk) conditions.push(and(eq(suppression.kind, "kvk"), eq(suppression.value, check.kvk)));
  if (conditions.length === 0) return false;

  const [hit] = await db.select({ id: suppression.id }).from(suppression).where(or(...conditions));
  return Boolean(hit);
}

export async function addSuppression(kind: "domain" | "email" | "phone" | "kvk" | "hash", value: string, source: string, reason?: string) {
  await db
    .insert(suppression)
    .values({ id: crypto.randomUUID(), kind, value, source, reason })
    .onConflictDoNothing({ target: [suppression.kind, suppression.value] });
}
