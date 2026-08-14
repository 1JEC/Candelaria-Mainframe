import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leadRuns } from "@/drizzle/schema";
import { and, eq, lt } from "drizzle-orm";
import { runTick } from "@/lib/leads-agent/orchestration/tick";
import { emitEvent } from "@/lib/leads-agent/orchestration/events";

const STALE_THRESHOLD_MS = 3 * 60 * 1000;

/**
 * §8 step 5: restarts runs whose heartbeat is >3 minutes stale — the
 * safety net for when nobody's browser tab is polling a run anymore.
 * CRON_SECRET-gated, disabled by default (LEAD_SWEEPER_ENABLED) since
 * this repo has no cron scheduler wired up yet (ships disabled per the
 * master spec's own instruction: "Cron routes ship disabled behind a
 * config toggle").
 */
export async function GET(req: NextRequest) {
  if (process.env.LEAD_SWEEPER_ENABLED !== "true") {
    return NextResponse.json({ disabled: true }, { status: 200 });
  }

  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const staleSince = new Date(Date.now() - STALE_THRESHOLD_MS);
  const stale = await db
    .select({ id: leadRuns.id })
    .from(leadRuns)
    .where(and(eq(leadRuns.status, "running"), lt(leadRuns.heartbeatAt, staleSince)));

  const results = [];
  for (const run of stale) {
    await emitEvent({ runId: run.id, code: "warn", messageNl: "Sweeper: verouderde heartbeat gedetecteerd, run wordt hervat." });
    const summary = await runTick(run.id);
    results.push(summary);
  }

  return NextResponse.json({ swept: results.length, results });
}
