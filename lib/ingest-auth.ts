import { and, eq, isNull } from 'drizzle-orm'

import { db } from '@/db'
import { ingestTokens } from '@/db/schema'
import { bearerFrom, hashIngestToken } from '@/lib/tokens'

export type IngestAuth =
  | { ok: true; orgId: string; tokenId: string }
  | { ok: false; status: 401 | 403; message: string }

/**
 * Authenticates an `/api/ingest/*` request against a per-org bearer token.
 * Resolves the organization from the token itself, so a caller can never write
 * into an organization it does not hold a token for.
 */
export async function authenticateIngest(req: Request): Promise<IngestAuth> {
  const token = bearerFrom(req.headers.get('authorization'))

  if (!token) {
    return {
      ok: false,
      status: 401,
      message: 'Missing Authorization: Bearer <token> header.',
    }
  }

  const [row] = await db
    .select({
      id: ingestTokens.id,
      orgId: ingestTokens.orgId,
    })
    .from(ingestTokens)
    .where(
      and(
        eq(ingestTokens.tokenHash, hashIngestToken(token)),
        isNull(ingestTokens.revokedAt),
      ),
    )
    .limit(1)

  if (!row) {
    return { ok: false, status: 403, message: 'Invalid or revoked token.' }
  }

  await db
    .update(ingestTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(ingestTokens.id, row.id))

  return { ok: true, orgId: row.orgId, tokenId: row.id }
}
