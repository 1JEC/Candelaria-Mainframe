"use server";

import { db } from "@/lib/db";
import { outreachTasks } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function completeTask(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await db
    .update(outreachTasks)
    .set({ status: "completed", completedAt: new Date(), completedBy: session.user.id })
    .where(eq(outreachTasks.id, id));

  await logAudit({
    userId: session.user.id,
    action: "outreach_task_completed",
    resourceType: "outreach_task",
    resourceId: id,
  });

  revalidatePath("/outreach");
}

export async function deleteTask(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await db.delete(outreachTasks).where(eq(outreachTasks.id, id));

  await logAudit({
    userId: session.user.id,
    action: "outreach_task_deleted",
    resourceType: "outreach_task",
    resourceId: id,
  });

  revalidatePath("/outreach");
}
