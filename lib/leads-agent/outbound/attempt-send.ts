import { db } from "@/lib/db";
import { outbox, sendLog, enrollments, mailboxes, leads } from "@/drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { checkSendGates, type SendGateContext } from "./send-gates";
import { jitterMs } from "./send-window";

export interface AttemptSendResult {
  sent: boolean;
  reason: string | null;
  gate: number | null;
}

/**
 * The single send entry point every scheduled message goes through.
 * `OUTBOUND_ENABLED=false` (the hard default — see §0/§15) means gate 1
 * fails every time right now, so every attempt writes to `outbox` and
 * stops: "the system writes drafts and payloads; it sends nothing to a
 * prospect." The actual sequencer/SMTP call for when all five gates pass
 * is intentionally not implemented — §11 lists "actual SMTP delivery" as
 * explicitly outside what this portal owns, and there is no sequencer
 * credential in this environment to integrate against. That call site is
 * marked below rather than stubbed silently.
 */
export async function attemptSend(ctx: SendGateContext & { channel: string; payload: Record<string, unknown> }): Promise<AttemptSendResult> {
  const result = await checkSendGates(ctx);

  if (!result.allowed) {
    await db.insert(outbox).values({
      id: crypto.randomUUID(),
      leadId: ctx.leadId,
      channel: ctx.channel,
      payloadJson: { ...ctx.payload, gateFailure: result.failure },
    });

    if (result.failure.gate !== 1) {
      // Gate 1 (dry-run) isn't a failure worth logging per-send — it's the
      // permanent default state. Gates 2-5 are real, specific stops.
      await db.insert(sendLog).values({
        id: crypto.randomUUID(),
        mailboxId: ctx.mailboxId,
        leadId: ctx.leadId,
        result: "blocked",
        reason: `Gate ${result.failure.gate}: ${result.failure.reason}`,
      });
    }

    if (result.failure.gate === 2) {
      // Suppression hit — cancel the enrollment outright, never retry (§9).
      await db.update(enrollments).set({ status: "stopped", stoppedReason: "suppressed" }).where(eq(enrollments.id, ctx.enrollmentId));
    }

    return { sent: false, reason: result.failure.reason, gate: result.failure.gate };
  }

  // All five gates passed. This is the point where a real integration
  // would call the sequencer/SMTP provider — not built (see comment
  // above). Recorded as a blocked attempt so it's visible and auditable
  // rather than silently vanishing, exactly like every other stop.
  await db.insert(outbox).values({
    id: crypto.randomUUID(),
    leadId: ctx.leadId,
    channel: ctx.channel,
    payloadJson: { ...ctx.payload, note: "Alle 5 gates geslaagd — sequencer/SMTP-integratie niet gebouwd (buiten scope, zie docs)." },
  });
  await db.insert(sendLog).values({
    id: crypto.randomUUID(),
    mailboxId: ctx.mailboxId,
    leadId: ctx.leadId,
    result: "blocked",
    reason: "Alle gates geslaagd, maar geen sequencer-integratie beschikbaar.",
  });

  return { sent: false, reason: "Sequencer-integratie niet gebouwd.", gate: null };
}

/** Called after a successful (hypothetical, currently unreachable) live send — increments the mailbox's daily counter and schedules the jittered next-send time. */
export async function recordSentAndScheduleNext(enrollmentId: string, mailboxId: string) {
  await db.update(mailboxes).set({ sentToday: sql`${mailboxes.sentToday} + 1` }).where(eq(mailboxes.id, mailboxId));
  await db
    .update(enrollments)
    .set({ nextSendAt: new Date(Date.now() + jitterMs()), currentStep: sql`${enrollments.currentStep} + 1` })
    .where(eq(enrollments.id, enrollmentId));
}

export async function leadDomain(leadId: string): Promise<string | null> {
  const [lead] = await db.select({ registrableDomain: leads.registrableDomain }).from(leads).where(eq(leads.id, leadId));
  return lead?.registrableDomain ?? null;
}
