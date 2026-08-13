import { db } from "@/lib/db";
import { auditLog } from "@/drizzle/schema";
import { and, eq, gte, sql } from "drizzle-orm";

/**
 * Minimal DB-backed rate limiter. No rate limiter existed anywhere in this
 * repo (grepped) — this one counts recent audit_log rows for the given
 * action/user within a sliding window, reusing a table that already exists
 * instead of adding a new dependency or a new counters table.
 */
export async function checkRateLimit(options: {
  userId: string;
  action: string;
  limit: number;
  windowMs: number;
}): Promise<{ allowed: boolean; count: number }> {
  const since = new Date(Date.now() - options.windowMs);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.userId, options.userId),
        eq(auditLog.action, options.action),
        gte(auditLog.createdAt, since)
      )
    );
  const count = row?.count ?? 0;
  return { allowed: count < options.limit, count };
}
