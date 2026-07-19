"use server";

import { db } from "@/lib/db";
import { posts, postVersions } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createPost(input: {
  platforms: string[];
  contentType: string;
  caption: string;
  scheduledFor?: string;
  mediaUrls?: string[];
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  if (input.platforms.length === 0) {
    throw new Error("Kies minstens één platform");
  }
  if (!input.caption.trim()) {
    throw new Error("Caption is verplicht");
  }

  const id = crypto.randomUUID();
  const scheduledFor = input.scheduledFor ? new Date(input.scheduledFor) : null;

  await db.insert(posts).values({
    id,
    userId: session.user.id,
    platforms: input.platforms,
    status: scheduledFor ? "scheduled" : "draft",
    contentType: input.contentType,
    scheduledFor,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await db.insert(postVersions).values({
    id: crypto.randomUUID(),
    postId: id,
    version: 1,
    caption: input.caption,
    mediaUrls: input.mediaUrls || [],
    createdAt: new Date(),
  });

  await logAudit({
    userId: session.user.id,
    action: "post_created",
    resourceType: "post",
    resourceId: id,
    after: input,
  });

  revalidatePath("/posts");
  redirect("/posts");
}

export async function updatePostStatus(id: string, status: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const updates: Record<string, unknown> = { status, updatedAt: new Date() };
  if (status === "published") updates.publishedAt = new Date();
  if (status === "approved") {
    updates.approvedAt = new Date();
    updates.approvedBy = session.user.id;
  }

  await db.update(posts).set(updates).where(eq(posts.id, id));

  await logAudit({
    userId: session.user.id,
    action: "post_status_updated",
    resourceType: "post",
    resourceId: id,
    after: { status },
  });

  revalidatePath("/posts");
}

export async function deletePost(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await db.delete(posts).where(eq(posts.id, id));

  await logAudit({
    userId: session.user.id,
    action: "post_deleted",
    resourceType: "post",
    resourceId: id,
  });

  revalidatePath("/posts");
}
