import { db } from "@/lib/db";
import { auditLog } from "@/drizzle/schema";
import { headers } from "next/headers";

export async function logAudit({
  userId,
  action,
  resourceType,
  resourceId,
  before,
  after,
  metadata,
}: {
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  before?: Record<string, any>;
  after?: Record<string, any>;
  metadata?: Record<string, any>;
}) {
  try {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") || "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      userId,
      action,
      resourceType,
      resourceId,
      before,
      after,
      ip,
      userAgent,
      metadata,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to log audit:", error);
    // Don't throw; audit failure shouldn't break the operation
  }
}
