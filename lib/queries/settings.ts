import { desc, eq } from 'drizzle-orm'

import { db } from '@/db'
import { ingestTokens } from '@/db/schema'

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
