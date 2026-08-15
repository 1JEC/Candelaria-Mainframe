import { db } from "@/lib/db";
import { agentEvents } from "@/drizzle/schema";

export type EventLevel = "info" | "warn" | "error";

/** Every code the live console renders. Telemetry, never theatre — only emitted by the code actually doing the work, never synthesized narration. */
export type EventCode =
  | "run.started"
  | "run.planned"
  | "source.query"
  | "candidate.found"
  | "dedupe.skip"
  | "suppression.skip"
  | "robots.check"
  | "robots.blocked"
  | "fetch.page"
  | "extract.contact"
  | "audit.signal"
  | "ai.request"
  | "ai.response"
  | "score.computed"
  | "risk.assessed"
  | "decision"
  | "pack.generated"
  | "ai.ungrounded_claim"
  | "warn"
  | "error"
  | "run.finished"
  | "run.cancelled";

export async function emitEvent(opts: {
  runId: string;
  taskId?: string;
  code: EventCode;
  messageNl: string;
  level?: EventLevel;
  payload?: Record<string, unknown>;
  leadId?: string;
  durationMs?: number;
}) {
  await db.insert(agentEvents).values({
    runId: opts.runId,
    taskId: opts.taskId ?? null,
    level: opts.level ?? "info",
    code: opts.code,
    messageNl: opts.messageNl,
    payloadJson: opts.payload ?? null,
    leadId: opts.leadId ?? null,
    durationMs: opts.durationMs ?? null,
  });
}
