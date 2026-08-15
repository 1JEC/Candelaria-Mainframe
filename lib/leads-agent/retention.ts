import { db } from "@/db";
import { prospectLeads, prospectEvents, prospectPageCache } from "@/db/schema";
import { and, eq, lt, isNull, like, sql } from "drizzle-orm";
import { getConfig, DEFAULT_THRESHOLDS } from "./config";

export interface RetentionResult {
  leadsPurged: number;
  eventsPurged: number;
  placesContentPurged: number;
}

/**
 * §4 rule 9 / §11: uncontacted prospectLeads purge after RETENTION_DAYS (180);
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
    .delete(prospectLeads)
    .where(and(eq(prospectLeads.status, "new"), isNull(prospectLeads.lastContactedAt), lt(prospectLeads.createdAt, retentionCutoff)))
    .returning({ id: prospectLeads.id });

  const purgedEvents = await db.delete(prospectEvents).where(lt(prospectEvents.ts, eventsCutoff)).returning({ id: prospectEvents.id });

  const purgedPlaces = await db
    .delete(prospectPageCache)
    .where(and(like(prospectPageCache.url, "%googleapis.com/maps/place%"), lt(prospectPageCache.fetchedAt, placesCutoff)))
    .returning({ urlHash: prospectPageCache.urlHash });

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
    .from(prospectLeads)
    .where(and(eq(prospectLeads.status, "new"), isNull(prospectLeads.lastContactedAt), lt(prospectLeads.createdAt, retentionCutoff)));
  const [eventsCount] = await db.select({ count: sql<number>`count(*)::int` }).from(prospectEvents).where(lt(prospectEvents.ts, eventsCutoff));
  const [placesCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(prospectPageCache)
    .where(and(like(prospectPageCache.url, "%googleapis.com/maps/place%"), lt(prospectPageCache.fetchedAt, placesCutoff)));

  return {
    leadsPurged: leadsCount?.count ?? 0,
    eventsPurged: eventsCount?.count ?? 0,
    placesContentPurged: placesCount?.count ?? 0,
  };
}
