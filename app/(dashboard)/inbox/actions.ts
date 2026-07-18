"use server";

import { db } from "@/lib/db";
import { emails } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function markEmailRead(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const email = await db.query.emails.findFirst({ where: eq(emails.id, id) });
  if (!email) throw new Error("E-mail niet gevonden");

  const flags = new Set(email.flags || []);
  flags.add("read");

  await db.update(emails).set({ flags: Array.from(flags) }).where(eq(emails.id, id));

  await logAudit({
    userId: session.user.id,
    action: "email_marked_read",
    resourceType: "email",
    resourceId: id,
  });

  revalidatePath("/inbox");
}

export async function archiveEmail(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await db.update(emails).set({ folder: "archived" }).where(eq(emails.id, id));

  await logAudit({
    userId: session.user.id,
    action: "email_archived",
    resourceType: "email",
    resourceId: id,
  });

  revalidatePath("/inbox");
}
