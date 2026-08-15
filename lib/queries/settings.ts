import { desc, eq } from 'drizzle-orm'

import { db } from '@/db'
import { ingestTokens, organizations } from '@/db/schema'

export async function getOrgSettings(orgId: string) {
  const [row] = await db
    .select({ name: organizations.name, plan: organizations.plan, websiteUrl: organizations.websiteUrl })
    .from(organizations)
    .where(eq(organizations.id, orgId))
  return row ?? null
}

/** Read model for the Settings → Ingest-tokens panel. Never exposes tokenHash. */
export async function listIngestTokens(orgId: string) {
  return db
    .select({
      id: ingestTokens.id,
      name: ingestTokens.name,
      createdAt: ingestTokens.createdAt,
      lastUsedAt: ingestTokens.lastUsedAt,
      revokedAt: ingestTokens.revokedAt,
    })
    .from(ingestTokens)
    .where(eq(ingestTokens.orgId, orgId))
    .orderBy(desc(ingestTokens.createdAt))
}
