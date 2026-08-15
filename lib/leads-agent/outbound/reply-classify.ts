import { z } from "zod";
import { db } from "@/db";
import { prospectReplies, prospectEnrollments, prospectLeads, prospectSignals } from "@/db/schema";
import { eq, and, or, ilike, desc } from "drizzle-orm";
import { callModel, MODEL_CHEAP } from "@/lib/agents/anthropic-client";
import { checkAiGate } from "@/lib/leads-agent/ai/gate";
import { generateCallPrepBrief } from "@/lib/leads-agent/ai";
import { addSuppression } from "@/lib/leads-agent/suppression";
import type { ScoredSignal } from "@/lib/leads-agent/scoring/types";

export type ReplyClassification = "positive" | "neutral" | "negative" | "optout" | "ooo" | "bounce";

const OPT_OUT_KEYWORDS = ["nee", "geen interesse", "uitschrijven", "stop", "verwijder", "niet meer mailen", "afmelden"];

/**
 * §9: "Keyword pre-filter runs before the model as a safety net." Not the
 * fifth job the spec's §5 "four jobs only" list would suggest exists —
 * flagged as a deliberate, necessary addition: §9's reply pipeline
 * cannot be built without *some* classification call, and none of the
 * four listed jobs (sector/pain-brief/outreach-pack/call-prep) fit. See
 * docs/DECISIONS.md.
 */
export function keywordPreFilter(text: string): ReplyClassification | null {
  const lower = text.toLowerCase();
  return OPT_OUT_KEYWORDS.some((kw) => lower.includes(kw)) ? "optout" : null;
}

const ClassificationSchema = z.object({
  classification: z.enum(["positive", "neutral", "negative", "optout", "ooo", "bounce"]),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
});

/**
 * §9: "stop the enrollment first, then classify." Call this the moment a
 * reply is received (no inbound mailbox-polling mechanism exists in this
 * environment to trigger it automatically — see docs/DECISIONS.md
 * LIMITATION — this is the function that mechanism would call).
 */
export async function recordReplyAndStopEnrollments(leadId: string, fromAddress: string, bodyText: string): Promise<string> {
  const replyId = crypto.randomUUID();
  await db.insert(prospectReplies).values({ id: replyId, leadId, fromAddress, bodyText });

  await db
    .update(prospectEnrollments)
    .set({ status: "stopped", stoppedReason: "reply_received" })
    .where(and(eq(prospectEnrollments.leadId, leadId), eq(prospectEnrollments.status, "active")));

  return replyId;
}

export async function classifyAndHandleReply(replyId: string, runId?: string): Promise<void> {
  const [reply] = await db.select().from(prospectReplies).where(eq(prospectReplies.id, replyId));
  if (!reply || !reply.bodyText) return;

  const [lead] = await db.select().from(prospectLeads).where(eq(prospectLeads.id, reply.leadId));
  if (!lead) return;

  let classification: ReplyClassification;
  let confidence = 1;
  let rationale = "Trefwoord-filter";

  const keywordHit = keywordPreFilter(reply.bodyText);
  if (keywordHit) {
    classification = keywordHit;
  } else {
    const gate = await checkAiGate();
    if (!gate.ok) {
      // No AI available — leave unclassified rather than guessing; a
      // human reviews it. Never invent a classification.
      return;
    }
    const prompt = `Classificeer deze reactie van een bedrijf op onze outreach-e-mail:

"${reply.bodyText}"

Kies één classificatie: positive, neutral, negative, optout, ooo (afwezig/out-of-office), bounce.
Antwoord met JSON: {"classification":"...","confidence":0.0,"rationale":"korte reden in het Nederlands"}`;

    const { json } = await callModel<unknown>({ purpose: "reply_classification", model: MODEL_CHEAP, prompt, maxTokens: 300, runId: runId });
    const parsed = ClassificationSchema.safeParse(json);
    if (!parsed.success) return; // fails open to "unclassified, review manually" — never guesses
    classification = parsed.data.classification;
    confidence = parsed.data.confidence;
    rationale = parsed.data.rationale;
  }

  await db.update(prospectReplies).set({ classification, confidence: confidence.toFixed(3), handledAt: new Date() }).where(eq(prospectReplies.id, replyId));

  switch (classification) {
    case "optout":
    case "negative":
      if (lead.registrableDomain) await addSuppression("domain", lead.registrableDomain, "optout", rationale);
      await db.update(prospectLeads).set({ status: "lost" }).where(eq(prospectLeads.id, lead.id));
      break;

    case "bounce":
      if (lead.emailGeneral) await addSuppression("email", lead.emailGeneral, "bounce", "E-mail bounced.");
      break;

    case "ooo":
      // Not counted as a real reply — resume the sequence in 7 days rather than leaving it permanently stopped.
      await db
        .update(prospectEnrollments)
        .set({ status: "active", stoppedReason: null, nextSendAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) })
        .where(and(eq(prospectEnrollments.leadId, lead.id), eq(prospectEnrollments.status, "stopped"), eq(prospectEnrollments.stoppedReason, "reply_received")));
      break;

    case "positive": {
      await db.update(prospectLeads).set({ status: "replied" }).where(eq(prospectLeads.id, lead.id));
      const leadSignalRows = await db.select().from(prospectSignals).where(eq(prospectSignals.leadId, lead.id));
      const scoredSignals: ScoredSignal[] = leadSignalRows.map((s) => ({
        code: s.code,
        labelNl: s.labelNl ?? s.code,
        evidence: s.evidence ?? "",
        sourceUrl: s.sourceUrl ?? "",
        points: s.points ?? 0,
      }));
      const brief = await generateCallPrepBrief(lead.company ?? lead.name ?? "Onbekend bedrijf", scoredSignals, reply.bodyText, runId);
      if (brief.ok) {
        await db.update(prospectReplies).set({ prepBrief: brief.data }).where(eq(prospectReplies.id, replyId));
      }
      break;
    }

    case "neutral":
      await db.update(prospectLeads).set({ status: "replied" }).where(eq(prospectLeads.id, lead.id));
      break;
  }
}

/** Any reply, from the lead or anyone at the same domain — used by the send gates. */
export async function hasAnyReply(leadId: string, registrableDomain: string | null): Promise<boolean> {
  const conditions = [eq(prospectReplies.leadId, leadId)];
  if (registrableDomain) conditions.push(ilike(prospectReplies.fromAddress, `%@${registrableDomain}`));
  const [hit] = await db.select({ id: prospectReplies.id }).from(prospectReplies).where(or(...conditions)).orderBy(desc(prospectReplies.receivedAt)).limit(1);
  return Boolean(hit);
}
