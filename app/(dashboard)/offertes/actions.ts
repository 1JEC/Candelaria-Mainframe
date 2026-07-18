"use server";

import { db } from "@/lib/db";
import { intakeSubmissions } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function toggleSpam(id: string, isSpam: boolean) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await db.update(intakeSubmissions).set({ isSpam }).where(eq(intakeSubmissions.id, id));

  await logAudit({
    userId: session.user.id,
    action: isSpam ? "intake_marked_spam" : "intake_unmarked_spam",
    resourceType: "intake_submission",
    resourceId: id,
  });

  revalidatePath("/offertes");
  revalidatePath(`/offertes/${id}`);
}

export async function toggleReviewed(id: string, reviewed: boolean) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await db
    .update(intakeSubmissions)
    .set({ reviewedAt: reviewed ? new Date() : null })
    .where(eq(intakeSubmissions.id, id));

  await logAudit({
    userId: session.user.id,
    action: reviewed ? "intake_marked_reviewed" : "intake_unmarked_reviewed",
    resourceType: "intake_submission",
    resourceId: id,
  });

  revalidatePath("/offertes");
  revalidatePath(`/offertes/${id}`);
}
