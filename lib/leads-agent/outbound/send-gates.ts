import { db } from "@/lib/db";
import { leads, mailboxes, replies, enrollments } from "@/drizzle/schema";
import { eq, or, ilike } from "drizzle-orm";
import { isSuppressed } from "@/lib/leads-agent/suppression";
import { extractGroundedNumbers } from "@/lib/leads-agent/ai/grounding";
import type { ScoredSignal } from "@/lib/leads-agent/scoring/types";
import { checkSendWindow } from "./send-window";
import { getConfig, DEFAULT_OUTBOUND_HALT } from "@/lib/leads-agent/config";

export interface SendGateContext {
  enrollmentId: string;
  leadId: string;
  mailboxId: string | null;
  body: string;
  signals: ScoredSignal[];
  sourceUrl: string;
}

export interface GateFailure {
  gate: 1 | 2 | 3 | 4 | 5;
  reason: string;
}

export type SendGateResult = { allowed: true } | { allowed: false; failure: GateFailure };

/**
 * §9: five gates, checked at send time — not enrollment time, since days
 * may have passed between the two. Each gate is independently testable;
 * `attemptSend` (caller) is responsible for what happens on gate 1
 * failure specifically (write to outbox, stop — never an error).
 */
export async function checkSendGates(ctx: SendGateContext): Promise<SendGateResult> {
  // Gate 1: outbound must be explicitly live, and the kill switch must not be engaged.
  const outboundLive = process.env.OUTBOUND_ENABLED === "true" && process.env.OUTBOUND_MODE === "live";
  if (!outboundLive) {
    return { allowed: false, failure: { gate: 1, reason: "OUTBOUND_ENABLED/OUTBOUND_MODE niet op live gezet (proefmodus)." } };
  }
  const haltState = await getConfig<typeof DEFAULT_OUTBOUND_HALT>("outbound_halt");
  if (haltState.halted) {
    return { allowed: false, failure: { gate: 1, reason: "Noodstop actief — alle verzending is handmatig gepauzeerd." } };
  }

  // Gate 2: fresh suppression lookup.
  const [lead] = await db.select().from(leads).where(eq(leads.id, ctx.leadId));
  if (!lead) return { allowed: false, failure: { gate: 2, reason: "Lead niet gevonden." } };
  const suppressed = await isSuppressed({
    domain: lead.registrableDomain ?? undefined,
    email: lead.emailGeneral ?? undefined,
    phone: lead.phoneE164 ?? undefined,
    kvk: lead.kvkNumber ?? undefined,
  });
  if (suppressed) {
    return { allowed: false, failure: { gate: 2, reason: "Op onderdrukkingslijst — verzending permanent geannuleerd." } };
  }

  // Gate 3: any reply from this lead, or anyone at the same domain, stops every sequence to that company.
  const domainPattern = lead.registrableDomain ? `%@${lead.registrableDomain}` : null;
  const replyConditions = [eq(replies.leadId, ctx.leadId)];
  if (domainPattern) replyConditions.push(ilike(replies.fromAddress, domainPattern));
  const [existingReply] = await db.select({ id: replies.id }).from(replies).where(or(...replyConditions));
  if (existingReply) {
    return { allowed: false, failure: { gate: 3, reason: "Er is al een reactie ontvangen van dit bedrijf — sequentie gestopt." } };
  }
  const [enrollment] = await db.select().from(enrollments).where(eq(enrollments.id, ctx.enrollmentId));
  if (!enrollment || enrollment.status !== "active") {
    return { allowed: false, failure: { gate: 3, reason: "Inschrijving is niet actief." } };
  }

  // Gate 4: mailbox cap + send window (Mon-Fri, business hours, no Dutch public holiday).
  if (!ctx.mailboxId) return { allowed: false, failure: { gate: 4, reason: "Geen mailbox toegewezen." } };
  const [mailbox] = await db.select().from(mailboxes).where(eq(mailboxes.id, ctx.mailboxId));
  if (!mailbox) return { allowed: false, failure: { gate: 4, reason: "Mailbox niet gevonden." } };
  if (mailbox.health === "red") return { allowed: false, failure: { gate: 4, reason: "Mailbox gepauzeerd (slechte gezondheid)." } };
  if ((mailbox.sentToday ?? 0) >= (mailbox.dailyCap ?? 20)) {
    return { allowed: false, failure: { gate: 4, reason: "Dagelijkse verzendlimiet van deze mailbox is bereikt." } };
  }
  const windowCheck = checkSendWindow();
  if (!windowCheck.ok) {
    return { allowed: false, failure: { gate: 4, reason: windowCheck.reason ?? "Buiten verzendvenster." } };
  }

  // Gate 5: content validation. A failure here is a hard stop, not a warning (§9).
  const contentErrors = validateSendContent(ctx.body, ctx.signals, ctx.sourceUrl);
  if (contentErrors.length > 0) {
    return { allowed: false, failure: { gate: 5, reason: `Inhoud niet geldig: ${contentErrors.join(" ")}` } };
  }

  return { allowed: true };
}

// Numbers that are fixed business facts, never a claim about the prospect
// — "30" is the audit call's duration, mentioned in every outreach email
// by design. Without this exemption the grounding check below would flag
// Candelaria's own standing offer as an "invented" claim, which it isn't.
const ALWAYS_GROUNDED_NUMBERS = new Set(["30"]);
// The deterministic footer (identity-footer.ts) always starts with this
// marker line. Numbers after it (a real KvK number, once configured) are
// Candelaria's own company facts, not claims about the prospect — the
// grounding check only applies to the AI-written portion before it.
const FOOTER_MARKER = "\n\n—\n";

export function validateSendContent(body: string, signals: ScoredSignal[], sourceUrl: string): string[] {
  const errors: string[] = [];

  if (!body.includes("Candelaria Agency")) errors.push("Identiteitsblok ontbreekt.");
  if (!body.toLowerCase().includes("afmelden")) errors.push("Afmeldregel ontbreekt.");
  if (!body.includes(sourceUrl)) errors.push("Bronregel ontbreekt.");
  if (!body.includes("Privacyverklaring")) errors.push("Privacyverklaring-link ontbreekt.");

  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount > 140) errors.push(`Bericht is ${wordCount} woorden (limiet 140).`);

  // §9's "<=1 link" governs the persuasive body (no CTA-link stuffing) —
  // not the mandatory footer, which necessarily cites the source URL and
  // a working privacy link (both required by §4 rule 7). Scoping this
  // check to the AI-written portion the same way the grounding check
  // below is scoped; otherwise every compliant pack would fail its own
  // compliance footer.
  const aiWrittenPortion = body.split(FOOTER_MARKER)[0];

  const linkCount = (aiWrittenPortion.match(/https?:\/\//g) ?? []).length;
  if (linkCount > 1) errors.push(`Bericht bevat ${linkCount} links in de hoofdtekst (limiet 1).`);

  if (/<img\b/i.test(body) || /\btracking\b/i.test(body)) errors.push("Bericht lijkt een tracking-pixel of afbeelding te bevatten.");

  const grounded = extractGroundedNumbers(signals);
  const numbersInBody = aiWrittenPortion.match(/\d+([.,]\d+)?/g) ?? [];
  const ungrounded = numbersInBody.filter((n) => !grounded.has(n) && !ALWAYS_GROUNDED_NUMBERS.has(n));
  if (ungrounded.length > 0) errors.push(`Bericht bevat cijfers zonder bewijs: ${ungrounded.join(", ")}.`);

  return errors;
}
