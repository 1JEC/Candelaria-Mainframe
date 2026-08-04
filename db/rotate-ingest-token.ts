// One-off rotation for an org's ingest token: revokes all currently active
// tokens for the org and issues a fresh one. The old token stops working
// immediately (ingest-auth.ts checks revokedAt). Run with:
//   node --env-file=.env.production.local --import tsx db/rotate-ingest-token.ts
import { eq, and, isNull } from 'drizzle-orm'
import { db } from './index'
import { ingestTokens, organizations } from './schema'
import { generateIngestToken } from '../lib/tokens'
import { recordAudit } from '../lib/audit'

async function main() {
  const [org] = await db.select().from(organizations).limit(1)
  if (!org) {
    console.error('No organization found.')
    process.exit(1)
  }

  const active = await db
    .select()
    .from(ingestTokens)
    .where(and(eq(ingestTokens.orgId, org.id), isNull(ingestTokens.revokedAt)))

  for (const t of active) {
    await db.update(ingestTokens).set({ revokedAt: new Date() }).where(eq(ingestTokens.id, t.id))
    await recordAudit({
      orgId: org.id,
      userId: null,
      action: 'ingest_token.revoked',
      entity: 'ingest_token',
      entityId: t.id,
      meta: { name: t.name, reason: 'rotation' },
    })
    console.log(`Revoked: ${t.name} (${t.id})`)
  }

  const { token, hash } = generateIngestToken()
  const [created] = await db
    .insert(ingestTokens)
    .values({ orgId: org.id, name: 'Demo ingest token', tokenHash: hash })
    .returning()

  await recordAudit({
    orgId: org.id,
    userId: null,
    action: 'ingest_token.created',
    entity: 'ingest_token',
    entityId: created.id,
    meta: { name: created.name, reason: 'rotation' },
  })

  console.log(`\nOrganization: ${org.name} (${org.id})`)
  console.log(`Revoked ${active.length} old token(s).`)
  console.log('\n=== NEW INGEST TOKEN (shown once, store it now) ===')
  console.log(token)
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err)
    process.exit(1)
  }
)
