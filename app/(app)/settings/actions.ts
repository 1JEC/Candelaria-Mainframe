'use server'

import { and, eq, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'

import { db } from '@/db'
import { ingestTokens, integrations, organizations, users, type IntegrationProvider } from '@/db/schema'
import { recordAudit } from '@/lib/audit'
import { requireMutator } from '@/lib/session'
import { generateIngestToken } from '@/lib/tokens'
import { encryptCredential } from '@/lib/integration-crypto'
import { INTEGRATION_PROVIDERS } from '@/lib/queries/integrations'
import { generateResetToken, RESET_TOKEN_TTL_MS } from '@/lib/password-reset'
import { sendEmail } from '@/lib/email'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3100'

/** Roles a client_manager/admin may hand to someone else from this panel — 'admin' (Candelaria staff) is never assignable here, only via direct database access. */
const INVITABLE_ROLES = ['client_manager', 'client_viewer'] as const

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

const connectSchema = z.object({
  provider: z.enum(INTEGRATION_PROVIDERS as [IntegrationProvider, ...IntegrationProvider[]]),
  // A manually-generated API key or access token from the provider's own
  // dashboard — not an OAuth authorization-code flow. Meta/Google/LinkedIn
  // OAuth needs a registered app (client ID + redirect URI) this deployment
  // doesn't have configured; this is the honest subset that works today for
  // every provider in the list without one.
  credential: z.string().trim().min(1).max(4000),
})

/** Never returns the credential — only enough to update the row shown in the panel. */
export async function connectIntegration(input: unknown) {
  const user = await requireMutator('settings')
  const { provider, credential } = connectSchema.parse(input)

  const encryptedCredentials = encryptCredential(credential)
  const now = new Date()

  const [row] = await db
    .insert(integrations)
    .values({ orgId: user.orgId, provider, status: 'connected', encryptedCredentials, lastSyncAt: now })
    .onConflictDoUpdate({
      target: [integrations.orgId, integrations.provider],
      set: { status: 'connected', encryptedCredentials, lastSyncAt: now, tokenExpiresAt: null },
    })
    .returning({ id: integrations.id, status: integrations.status, lastSyncAt: integrations.lastSyncAt })

  await recordAudit({
    orgId: user.orgId,
    userId: user.id,
    action: 'integration.connected',
    entity: 'integration',
    entityId: row.id,
    meta: { provider },
  })

  revalidatePath('/settings')
  return { provider, status: row.status, lastSyncAt: row.lastSyncAt }
}

const disconnectSchema = z.object({
  provider: z.enum(INTEGRATION_PROVIDERS as [IntegrationProvider, ...IntegrationProvider[]]),
})

export async function disconnectIntegration(input: unknown) {
  const user = await requireMutator('settings')
  const { provider } = disconnectSchema.parse(input)

  const [row] = await db
    .update(integrations)
    .set({ status: 'not_connected', encryptedCredentials: null, lastSyncAt: null, tokenExpiresAt: null })
    .where(and(eq(integrations.orgId, user.orgId), eq(integrations.provider, provider)))
    .returning({ id: integrations.id })

  if (!row) throw new Error('Integration not found.')

  await recordAudit({
    orgId: user.orgId,
    userId: user.id,
    action: 'integration.disconnected',
    entity: 'integration',
    entityId: row.id,
    meta: { provider },
  })

  revalidatePath('/settings')
  return { provider, status: 'not_connected' as const }
}

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(1).max(200),
  role: z.enum(INVITABLE_ROLES),
})

/**
 * Creates the user row with a random, never-shared password (so the account
 * cannot be logged into before the invitee sets their own), then emails the
 * same reset-password link the "forgot password" flow uses — one link
 * mechanism for both "give me a first password" and "I forgot mine".
 */
export async function inviteUser(input: unknown) {
  const user = await requireMutator('settings')
  const { email, name, role } = inviteSchema.parse(input)

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email))
  if (existing) throw new Error('Er bestaat al een gebruiker met dit e-mailadres.')

  const unusablePassword = randomBytes(32).toString('hex')
  const passwordHash = await bcrypt.hash(unusablePassword, 12)
  const { token, tokenHash } = generateResetToken()
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS)

  const [row] = await db
    .insert(users)
    .values({
      orgId: user.orgId,
      email,
      name,
      role,
      passwordHash,
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: expiresAt,
    })
    .returning({ id: users.id, createdAt: users.createdAt })

  const inviteUrl = `${APP_URL}/reset-password?token=${token}`
  await sendEmail({
    to: email,
    subject: 'Je bent uitgenodigd voor Candelaria Mainframe',
    text: [
      `${user.name} heeft je uitgenodigd voor de Candelaria Mainframe-portal.`,
      '',
      `Klik op onderstaande link om een wachtwoord in te stellen (verloopt over 1 uur):`,
      inviteUrl,
    ].join('\n'),
  })

  await recordAudit({
    orgId: user.orgId,
    userId: user.id,
    action: 'user.invited',
    entity: 'user',
    entityId: row.id,
    meta: { email, role },
  })

  revalidatePath('/settings')
  return { id: row.id, name, email, role, isActive: true, lastLogin: null, createdAt: row.createdAt }
}

const roleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(INVITABLE_ROLES),
})

export async function changeUserRole(input: unknown) {
  const user = await requireMutator('settings')
  const { userId, role } = roleSchema.parse(input)

  if (userId === user.id) throw new Error('Je kunt je eigen rol niet wijzigen.')

  const [row] = await db
    .update(users)
    .set({ role })
    .where(and(eq(users.id, userId), eq(users.orgId, user.orgId)))
    .returning({ id: users.id, email: users.email })

  if (!row) throw new Error('Gebruiker niet gevonden.')

  await recordAudit({
    orgId: user.orgId,
    userId: user.id,
    action: 'user.role_changed',
    entity: 'user',
    entityId: row.id,
    meta: { email: row.email, role },
  })

  revalidatePath('/settings')
  return { userId: row.id, role }
}

const activeSchema = z.object({
  userId: z.string().uuid(),
  isActive: z.boolean(),
})

export async function setUserActive(input: unknown) {
  const user = await requireMutator('settings')
  const { userId, isActive } = activeSchema.parse(input)

  if (userId === user.id && !isActive) throw new Error('Je kunt jezelf niet deactiveren.')

  const [row] = await db
    .update(users)
    .set({ isActive })
    .where(and(eq(users.id, userId), eq(users.orgId, user.orgId)))
    .returning({ id: users.id, email: users.email })

  if (!row) throw new Error('Gebruiker niet gevonden.')

  await recordAudit({
    orgId: user.orgId,
    userId: user.id,
    action: isActive ? 'user.reactivated' : 'user.deactivated',
    entity: 'user',
    entityId: row.id,
    meta: { email: row.email },
  })

  revalidatePath('/settings')
  return { userId: row.id, isActive }
}

const orgNameSchema = z.object({
  name: z.string().trim().min(1).max(200),
})

/** Plan is deliberately not editable here — there is no billing system behind orgPlan yet, so exposing a plan-changer would toggle a label with no effect on limits or invoicing. */
export async function updateOrgName(input: unknown) {
  const user = await requireMutator('settings')
  const { name } = orgNameSchema.parse(input)

  await db.update(organizations).set({ name }).where(eq(organizations.id, user.orgId))

  await recordAudit({
    orgId: user.orgId,
    userId: user.id,
    action: 'organization.renamed',
    entity: 'organization',
    entityId: user.orgId,
    meta: { name },
  })

  revalidatePath('/settings')
  return { name }
}
