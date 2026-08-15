import { db } from "@/db";
import { prospectRunTasks } from "@/db/schema";
import { and, asc, eq, sql } from "drizzle-orm";

export type TaskType = "discover" | "process_candidate";
export type TaskStatus = "pending" | "claimed" | "done" | "failed";

export async function createTasks(runId: string, type: TaskType, targets: string[]) {
  if (targets.length === 0) return;
  await db.insert(prospectRunTasks).values(
    targets.map((target) => ({
      id: crypto.randomUUID(),
      runId,
      type,
      target,
      status: "pending" as const,
    }))
  );
}

/**
 * Atomic claim: a single UPDATE...WHERE id IN (subquery)...RETURNING
 * statement. Under Postgres's default READ COMMITTED isolation this is
 * safe without an explicit `SELECT ... FOR UPDATE SKIP LOCKED` — two
 * concurrent claims against overlapping candidate rows serialize via
 * Postgres's own row-level locking, and the loser's EvalPlanQual re-check
 * sees the row is no longer 'pending' and skips it. `FOR UPDATE SKIP
 * LOCKED` is a throughput optimization (avoids blocking), not a
 * correctness requirement here — skipped since the realistic concurrency
 * for one run (one browser tab or the sweeper, never both meaningfully
 * overlapping) doesn't need it, and it also isn't reliably supported
 * through every Postgres HTTP-driver connection mode.
 */
export async function claimTasks(runId: string, limit: number) {
  const result = await db.execute(sql`
    UPDATE prospect_run_tasks
    SET status = 'claimed', claimed_at = now(), attempts = attempts + 1
    WHERE id IN (
      SELECT id FROM prospect_run_tasks
      WHERE run_id = ${runId} AND status = 'pending' AND attempts < 3
      ORDER BY created_at ASC
      LIMIT ${limit}
    )
    RETURNING id, run_id AS "runId", type, target, status, attempts, claimed_at AS "claimedAt", finished_at AS "finishedAt", error, result_json AS "resultJson", created_at AS "createdAt"
  `);
  return result as unknown as Array<{
    id: string;
    runId: string;
    type: TaskType;
    target: string;
    status: TaskStatus;
    attempts: number;
  }>;
}

export async function markTaskDone(taskId: string, resultJson?: Record<string, unknown>) {
  await db
    .update(prospectRunTasks)
    .set({ status: "done", finishedAt: new Date(), resultJson: resultJson ?? null })
    .where(eq(prospectRunTasks.id, taskId));
}

/** Failed but under the retry cap -> back to pending (retried on a later tick); at the cap -> failed permanently. One dead site never kills the run either way. */
export async function markTaskFailed(taskId: string, error: string, attempts: number) {
  const permanentlyFailed = attempts >= 3;
  await db
    .update(prospectRunTasks)
    .set({
      status: permanentlyFailed ? "failed" : "pending",
      finishedAt: permanentlyFailed ? new Date() : null,
      error,
    })
    .where(eq(prospectRunTasks.id, taskId));
}

export async function countPendingTasks(runId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(prospectRunTasks)
    .where(and(eq(prospectRunTasks.runId, runId), eq(prospectRunTasks.status, "pending")));
  return row?.count ?? 0;
}

export async function countTasksByStatus(runId: string) {
  const rows = await db
    .select({ status: prospectRunTasks.status, count: sql<number>`count(*)::int` })
    .from(prospectRunTasks)
    .where(eq(prospectRunTasks.runId, runId))
    .groupBy(prospectRunTasks.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.count]));
}

export async function listTasks(runId: string) {
  return db.select().from(prospectRunTasks).where(eq(prospectRunTasks.runId, runId)).orderBy(asc(prospectRunTasks.createdAt));
}
