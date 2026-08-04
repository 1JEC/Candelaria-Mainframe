import { and, count, eq, gte } from 'drizzle-orm'

import { db } from '@/db'
import { leads } from '@/db/schema'

const WINDOW_MINUTES = 10
const MAX_PER_WINDOW = 5

/**
 * DB-backed rate limit: reject if this IP has already submitted
 * `MAX_PER_WINDOW` leads in the last `WINDOW_MINUTES`. Deliberately not
 * in-memory — this runs on Vercel serverless functions, where each
 * invocation can be a cold instance with no shared memory, so an in-memory
 * counter would not actually limit anything. Costs one extra indexed query
 * per submission (`leads_ip_created_idx`).
 */
export async function isRateLimited(ip: string | null): Promise<boolean> {
  if (!ip) return false // no IP to key on — nothing to rate limit against

  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000)
  const [row] = await db
    .select({ n: count() })
    .from(leads)
    .where(and(eq(leads.ipAddress, ip), gte(leads.createdAt, since)))

  return (row?.n ?? 0) >= MAX_PER_WINDOW
}
