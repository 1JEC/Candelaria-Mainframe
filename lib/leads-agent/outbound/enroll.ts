import { db } from "@/lib/db";
import { enrollments, leadPacks, sequences } from "@/drizzle/schema";
import { and, eq, inArray } from "drizzle-orm";
import { logAudit } from "@/lib/audit";

const MAX_ENROLL_PER_ACTION = Number(process.env.MAX_ENROLL_PER_ACTION ?? 10);
const DEFAULT_SEQUENCE_NAME = "Standaard 3-mail reeks";

export class EnrollmentLimitError extends Error {}

/** No sequence-authoring UI exists yet — seeds the one default sequence (day 0/4/9, matching §8's outreach pack cadence) the first time it's needed, rather than requiring configuration before this feature is usable at all. */
async function getOrCreateDefaultSequence(): Promise<string> {
  const [existing] = await db.select({ id: sequences.id }).from(sequences).where(eq(sequences.name, DEFAULT_SEQUENCE_NAME));
  if (existing) return existing.id;

  const id = crypto.randomUUID();
  await db.insert(sequences).values({
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
export async function createEnrollments(leadIds: string[], userId: string): Promise<EnrollOutcome> {
  if (leadIds.length > MAX_ENROLL_PER_ACTION) {
    throw new EnrollmentLimitError(`Maximaal ${MAX_ENROLL_PER_ACTION} leads per actie inschrijven.`);
  }
  if (leadIds.length === 0) return { enrolled: [], skipped: [] };

  const packs = await db.select({ leadId: leadPacks.leadId }).from(leadPacks).where(inArray(leadPacks.leadId, leadIds));
  const leadsWithPack = new Set(packs.map((p) => p.leadId));

  const existingActive = await db
    .select({ leadId: enrollments.leadId })
    .from(enrollments)
    .where(and(inArray(enrollments.leadId, leadIds), eq(enrollments.status, "active")));
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

    await db.insert(enrollments).values({
      id: crypto.randomUUID(),
      leadId,
      sequenceId,
      status: "active",
      currentStep: 0,
      nextSendAt: new Date(),
      enrolledBy: userId,
    });
    enrolled.push(leadId);
  }

  await logAudit({ userId, action: "lead_enrollment_created", metadata: { enrolled: enrolled.length, skipped: skipped.length } });
  return { enrolled, skipped };
}
