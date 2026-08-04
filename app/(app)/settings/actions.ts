'use server'

import { and, eq, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { db } from '@/db'
import { ingestTokens } from '@/db/schema'
import { recordAudit } from '@/lib/audit'
import { requireMutator } from '@/lib/session'
import { generateIngestToken } from '@/lib/tokens'

const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
})

/** Returns the plaintext token once — the caller must display and discard it. */
export async function createIngestToken(input: unknown) {
  const user = await requireMutator('settings')
  const { name } = createSchema.parse(input)

  const { token, hash } = generateIngestToken()

  const [row] = await db
    .insert(ingestTokens)
    .values({ orgId: user.orgId, name, tokenHash: hash })
    .returning({ id: ingestTokens.id, createdAt: ingestTokens.createdAt })

  await recordAudit({
    orgId: user.orgId,
    userId: user.id,
    action: 'ingest_token.created',
    entity: 'ingest_token',
    entityId: row.id,
    meta: { name },
  })

  revalidatePath('/settings')
  return { id: row.id, name, createdAt: row.createdAt, token }
}

const revokeSchema = z.object({
  tokenId: z.string().uuid(),
})

export async function revokeIngestToken(input: unknown) {
  const user = await requireMutator('settings')
  const { tokenId } = revokeSchema.parse(input)

  const [row] = await db
    .update(ingestTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(ingestTokens.id, tokenId),
        eq(ingestTokens.orgId, user.orgId),
        isNull(ingestTokens.revokedAt),
      ),
    )
    .returning({ id: ingestTokens.id, name: ingestTokens.name })

  if (!row) throw new Error('Token not found or already revoked.')

  await recordAudit({
    orgId: user.orgId,
    userId: user.id,
    action: 'ingest_token.revoked',
    entity: 'ingest_token',
    entityId: row.id,
    meta: { name: row.name },
  })

  revalidatePath('/settings')
}
