import { desc, eq } from 'drizzle-orm'

import { db } from '@/db'
import { organizations, seoAudits } from '@/db/schema'
import type { AuditRaw } from '@/lib/leads-agent/audit'

export async function getOrgWebsite(orgId: string): Promise<string | null> {
  const [row] = await db.select({ websiteUrl: organizations.websiteUrl }).from(organizations).where(eq(organizations.id, orgId))
  return row?.websiteUrl ?? null
}

export async function getLatestSeoAudit(orgId: string) {
  const [row] = await db.select().from(seoAudits).where(eq(seoAudits.orgId, orgId)).orderBy(desc(seoAudits.createdAt)).limit(1)
  if (!row) return null
  return { ...row, raw: row.rawJson as unknown as AuditRaw }
}

export async function listSeoAuditHistory(orgId: string, limit = 10) {
  return db.select({ id: seoAudits.id, createdAt: seoAudits.createdAt }).from(seoAudits).where(eq(seoAudits.orgId, orgId)).orderBy(desc(seoAudits.createdAt)).limit(limit)
}
