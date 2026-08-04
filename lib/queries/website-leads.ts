import { and, asc, desc, eq, gte, lte } from 'drizzle-orm'

import { db } from '@/db'
import { leads, pageviews, type LeadStatus } from '@/db/schema'
import { periodStart, type Period } from '@/lib/period'

export async function listLeads(filters: { status?: LeadStatus; period?: Period }) {
  const conditions = []
  if (filters.status) conditions.push(eq(leads.status, filters.status))
  const since = filters.period ? periodStart(filters.period) : null
  if (since) conditions.push(gte(leads.createdAt, since))

  return db
    .select()
    .from(leads)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(leads.createdAt))
}

export async function getLead(id: string) {
  const [row] = await db.select().from(leads).where(eq(leads.id, id)).limit(1)
  if (!row) return null

  const journey = row.visitorHash
    ? await db
        .select({
          id: pageviews.id,
          path: pageviews.path,
          referrerDomain: pageviews.referrerDomain,
          createdAt: pageviews.createdAt,
        })
        .from(pageviews)
        .where(
          and(
            eq(pageviews.visitorHash, row.visitorHash),
            lte(pageviews.createdAt, row.createdAt),
          ),
        )
        .orderBy(asc(pageviews.createdAt))
        .limit(100)
    : []

  return { ...row, journey }
}
