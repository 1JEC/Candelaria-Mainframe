import { getRun, touchHeartbeat, finishRun } from "./run";
import { claimTasks, markTaskDone, markTaskFailed, countPendingTasks } from "./task-queue";
import { processDiscoverTask } from "./process-discover";
import { processCandidateTask } from "./process-candidate";
import { emitEvent } from "./events";

const TICK_BUDGET = Number(process.env.TICK_BUDGET ?? 4);
// Netlify's standard synchronous function execution has a much shorter
// timeout than Vercel's (the spec's 45000ms default assumes Vercel — see
// docs/DECISIONS.md Phase 0). Defaulting well under Netlify's ~10s ceiling.
const TICK_MS = Number(process.env.TICK_MS ?? 8000);

export interface TickSummary {
  runId: string;
  status: string;
  processed: number;
  pendingRemaining: number;
}

/**
 * One bounded tick: claims and processes tasks until TICK_BUDGET or
 * TICK_MS is hit, then returns. No `after()` — the caller (the admin's
 * browser tab polling, or the sweeper) is responsible for calling this
 * again while the run is still `running`. Bounded by both task count and
 * wall clock so a single invocation never risks the platform's own
 * function timeout.
 */
export async function runTick(runId: string): Promise<TickSummary> {
  const startedAt = Date.now();
  const run = await getRun(runId);
  if (!run) throw new Error(`Run ${runId} bestaat niet.`);
  if (run.status !== "running") {
    return { runId, status: run.status ?? "unknown", processed: 0, pendingRemaining: 0 };
  }

  await touchHeartbeat(runId);

  let processed = 0;
  let cancelled = false;

  while (processed < TICK_BUDGET && Date.now() - startedAt < TICK_MS) {
    const fresh = await getRun(runId);
    if (fresh?.cancelRequested) {
      await emitEvent({ runId, code: "run.cancelled", messageNl: "Run geannuleerd door gebruiker." });
      await finishRun(runId, "cancelled");
      cancelled = true;
      break;
    }

    const tasks = await claimTasks(runId, 1);
    if (tasks.length === 0) break;
    const task = tasks[0];

    try {
      if (task.type === "discover") {
        await processDiscoverTask(runId, task.id, task.target);
      } else {
        await processCandidateTask(runId, task.id, task.target, run.startedBy);
      }
      await markTaskDone(task.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await markTaskFailed(task.id, message, task.attempts);
      await emitEvent({ runId, taskId: task.id, code: "error", level: "error", messageNl: `Taak mislukt: ${message}` });
    }

    processed++;
  }

  const pendingRemaining = await countPendingTasks(runId);
  if (!cancelled) {
    if (pendingRemaining === 0) {
      const stillRunning = (await getRun(runId))?.status === "running";
      if (stillRunning) {
        await emitEvent({ runId, code: "run.finished", messageNl: "Run voltooid." });
        await finishRun(runId, "done");
      }
    } else {
      await touchHeartbeat(runId);
    }
  }

  const finalRun = await getRun(runId);
  return { runId, status: finalRun?.status ?? "unknown", processed, pendingRemaining };
}
