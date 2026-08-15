import { db } from "@/db";
import { prospectRuns, prospectAiCalls, prospectPacks } from "@/db/schema";
import { eq, or, sql } from "drizzle-orm";
import { enabledSources } from "@/lib/leads-agent/discovery";
import { createTasks, countTasksByStatus } from "./task-queue";
import { emitEvent } from "./events";

const MAX_CONCURRENT_RUNS = Number(process.env.MAX_CONCURRENT_RUNS ?? 1);
// City/sector search sources only — csv_seed and site_expansion aren't
// city/sector queries (see their Phase 2 registry no-op notes).
const CITY_SECTOR_SOURCE_KEYS = new Set(["osm_overpass", "google_places", "kvk"]);

export interface CreateRunParams {
  label?: string;
  city: string;
  sectors: string[];
  limit: number;
  startedBy: string;
}

export class RunConflictError extends Error {}

/** §8 step 1: creates the run, expands the task list, returns in <1s — never does the work itself. */
export async function createRun(params: CreateRunParams): Promise<{ runId: string }> {
  const [active] = await db
    .select({ id: prospectRuns.id })
    .from(prospectRuns)
    .where(or(eq(prospectRuns.status, "running"), eq(prospectRuns.status, "queued")));

  if (active && MAX_CONCURRENT_RUNS <= 1) {
    throw new RunConflictError("Er loopt al een run. Wacht tot deze klaar is of annuleer hem eerst.");
  }

  const runId = crypto.randomUUID();
  await db.insert(prospectRuns).values({
    id: runId,
    label: params.label ?? `${params.sectors.join(", ")} — ${params.city}`,
    paramsJson: { ...params },
    status: "running",
    startedBy: params.startedBy,
    startedAt: new Date(),
    heartbeatAt: new Date(),
  });

  const sources = enabledSources().filter((s) => CITY_SECTOR_SOURCE_KEYS.has(s.key));
  const discoverTargets: string[] = [];
  for (const source of sources) {
    for (const sector of params.sectors) {
      discoverTargets.push(JSON.stringify({ sourceKey: source.key, city: params.city, sector, limit: params.limit }));
    }
  }
  await createTasks(runId, "discover", discoverTargets);

  await emitEvent({ runId, code: "run.started", messageNl: `Run gestart voor ${params.sectors.join(", ")} in ${params.city}.` });
  await emitEvent({
    runId,
    code: "run.planned",
    messageNl: `${discoverTargets.length} zoekopdracht(en) gepland over ${sources.length} actieve bron(nen).`,
    payload: { sources: sources.map((s) => s.key), sectorCount: params.sectors.length },
  });

  if (sources.length === 0) {
    await emitEvent({ runId, code: "warn", messageNl: "Geen actieve discovery-bronnen — controleer Instellingen." });
  }

  return { runId };
}

export async function requestCancel(runId: string) {
  await db.update(prospectRuns).set({ cancelRequested: true }).where(eq(prospectRuns.id, runId));
}

export async function getRun(runId: string) {
  const [run] = await db.select().from(prospectRuns).where(eq(prospectRuns.id, runId));
  return run ?? null;
}

export async function touchHeartbeat(runId: string) {
  await db.update(prospectRuns).set({ heartbeatAt: new Date() }).where(eq(prospectRuns.id, runId));
}

export async function finishRun(runId: string, status: "done" | "failed" | "cancelled", error?: string) {
  const stats = await computeRunStats(runId);
  await db
    .update(prospectRuns)
    .set({ status, finishedAt: new Date(), error: error ?? null, statsJson: stats.counts, aiCostEur: stats.aiCostEur.toFixed(4) })
    .where(eq(prospectRuns.id, runId));
}

async function computeRunStats(runId: string) {
  const [costRow] = await db
    .select({ total: sql<string>`coalesce(sum(${prospectAiCalls.costEur}),0)` })
    .from(prospectAiCalls)
    .where(eq(prospectAiCalls.runId, runId));

  const [packRow] = await db.select({ count: sql<number>`count(*)::int` }).from(prospectPacks).where(eq(prospectPacks.runId, runId));

  const taskCounts = await countTasksByStatus(runId);

  return {
    counts: { tasks: taskCounts, leadsPacked: packRow?.count ?? 0 },
    aiCostEur: Number(costRow?.total ?? 0),
  };
}
