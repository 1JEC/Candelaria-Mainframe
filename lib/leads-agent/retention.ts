import { db } from "@/lib/db";
import { leads, agentEvents, pageCache } from "@/drizzle/schema";
import { and, eq, lt, isNull, like, sql } from "drizzle-orm";
import { getConfig, DEFAULT_THRESHOLDS } from "./config";

export interface RetentionResult {
  leadsPurged: number;
  eventsPurged: number;
  placesContentPurged: number;
}

/**
 * §4 rule 9 / §11: uncontacted leads purge after RETENTION_DAYS (180);
 * agent_events purge after 30 days (stats_json on the run itself is kept
 * forever — this only touches the fine-grained event rows); Google Places
 * content refreshes/deletes after 30 days per its terms.
 *
 * Not wired to a cron trigger — same reasoning as the sweeper (Phase 6):
 * no cron scheduler exists in this environment yet. Callable directly, or
 * via the admin-triggered route this ships with; a real schedule is a
 * deployment-time decision for Johan, documented in the runbook.
 */
export async function runRetentionJob(): Promise<RetentionResult> {
  const thresholds = await getConfig<typeof DEFAULT_THRESHOLDS>("thresholds");
  const retentionCutoff = new Date(Date.now() - thresholds.retentionDays * 24 * 60 * 60 * 1000);
  const eventsCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const placesCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Uncontacted: never contacted (lastContactedAt null) and status still "new" — a qualified/packed/contacted lead is never silently purged.
  const purgedLeads = await db
    .delete(leads)
    .where(and(eq(leads.status, "new"), isNull(leads.lastContactedAt), lt(leads.createdAt, retentionCutoff)))
    .returning({ id: leads.id });

  const purgedEvents = await db.delete(agentEvents).where(lt(agentEvents.ts, eventsCutoff)).returning({ id: agentEvents.id });

  const purgedPlaces = await db
    .delete(pageCache)
    .where(and(like(pageCache.url, "%googleapis.com/maps/place%"), lt(pageCache.fetchedAt, placesCutoff)))
    .returning({ urlHash: pageCache.urlHash });

  return {
    leadsPurged: purgedLeads.length,
    eventsPurged: purgedEvents.length,
    placesContentPurged: purgedPlaces.length,
  };
}

/** Preview counts without deleting anything — used by the Settings UI before a manual run. */
export async function previewRetentionJob(): Promise<RetentionResult> {
  const thresholds = await getConfig<typeof DEFAULT_THRESHOLDS>("thresholds");
  const retentionCutoff = new Date(Date.now() - thresholds.retentionDays * 24 * 60 * 60 * 1000);
  const eventsCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const placesCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [leadsCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(leads)
    .where(and(eq(leads.status, "new"), isNull(leads.lastContactedAt), lt(leads.createdAt, retentionCutoff)));
  const [eventsCount] = await db.select({ count: sql<number>`count(*)::int` }).from(agentEvents).where(lt(agentEvents.ts, eventsCutoff));
  const [placesCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(pageCache)
    .where(and(like(pageCache.url, "%googleapis.com/maps/place%"), lt(pageCache.fetchedAt, placesCutoff)));

  return {
    leadsPurged: leadsCount?.count ?? 0,
    eventsPurged: eventsCount?.count ?? 0,
    placesContentPurged: placesCount?.count ?? 0,
  };
}
