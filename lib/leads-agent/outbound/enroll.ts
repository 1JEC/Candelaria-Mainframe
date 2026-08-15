import { db } from "@/db";
import { prospectEnrollments, prospectPacks, prospectSequences } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { recordAudit } from "@/lib/audit";
import type { ProspectActor } from "@/lib/leads-agent/config";

const MAX_ENROLL_PER_ACTION = Number(process.env.MAX_ENROLL_PER_ACTION ?? 10);
const DEFAULT_SEQUENCE_NAME = "Standaard 3-mail reeks";

export class EnrollmentLimitError extends Error {}

/** No sequence-authoring UI exists yet — seeds the one default sequence (day 0/4/9, matching §8's outreach pack cadence) the first time it's needed, rather than requiring configuration before this feature is usable at all. */
async function getOrCreateDefaultSequence(): Promise<string> {
  const [existing] = await db.select({ id: prospectSequences.id }).from(prospectSequences).where(eq(prospectSequences.name, DEFAULT_SEQUENCE_NAME));
  if (existing) return existing.id;

  const id = crypto.randomUUID();
  await db.insert(prospectSequences).values({
    id,
    name: DEFAULT_SEQUENCE_NAME,
    stepsJson: [
      { step: 0, offsetDays: 0, field: "email1" },
      { step: 1, offsetDays: 4, field: "email2" },
      { step: 2, offsetDays: 9, field: "email3" },
    ],
    active: true,
  });
  return id;
}

export interface EnrollOutcome {
  enrolled: string[];
  skipped: { leadId: string; reason: string }[];
}

/** §9: "Enrollment is always deliberate... no auto-enroll... cap MAX_ENROLL_PER_ACTION (10)." */
export async function createEnrollments(leadIds: string[], actor: ProspectActor): Promise<EnrollOutcome> {
  if (leadIds.length > MAX_ENROLL_PER_ACTION) {
    throw new EnrollmentLimitError(`Maximaal ${MAX_ENROLL_PER_ACTION} leads per actie inschrijven.`);
  }
  if (leadIds.length === 0) return { enrolled: [], skipped: [] };

  const packs = await db.select({ leadId: prospectPacks.leadId }).from(prospectPacks).where(inArray(prospectPacks.leadId, leadIds));
  const leadsWithPack = new Set(packs.map((p) => p.leadId));

  const existingActive = await db
    .select({ leadId: prospectEnrollments.leadId })
    .from(prospectEnrollments)
    .where(and(inArray(prospectEnrollments.leadId, leadIds), eq(prospectEnrollments.status, "active")));
  const alreadyActive = new Set(existingActive.map((e) => e.leadId));

  const sequenceId = await getOrCreateDefaultSequence();
  const enrolled: string[] = [];
  const skipped: { leadId: string; reason: string }[] = [];

  for (const leadId of leadIds) {
    if (!leadsWithPack.has(leadId)) {
      skipped.push({ leadId, reason: "Geen outreach-pack voor deze lead." });
      continue;
    }
    if (alreadyActive.has(leadId)) {
      skipped.push({ leadId, reason: "Al actief ingeschreven." });
      continue;
    }

    await db.insert(prospectEnrollments).values({
      leadId,
      sequenceId,
      status: "active",
      currentStep: 0,
      nextSendAt: new Date(),
      enrolledBy: actor.userId,
    });
    enrolled.push(leadId);
  }

  await recordAudit({
    orgId: actor.orgId,
    userId: actor.userId,
    action: "prospecting_enrollment_created",
    entity: "prospect_enrollment",
    meta: { enrolled: enrolled.length, skipped: skipped.length, scope: "global" },
  });
  return { enrolled, skipped };
}
