'use server'

import crypto from 'crypto'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { prospectLeads } from '@/db/schema'
import { recordAudit } from '@/lib/audit'
import { isStaff } from '@/lib/rbac'
import { requireModule } from '@/lib/session'
import { createRun, requestCancel } from '@/lib/leads-agent/orchestration/run'
import { saveConfig, restoreConfigVersion, type ConfigKey } from '@/lib/leads-agent/config'
import { runRetentionJob } from '@/lib/leads-agent/retention'
import { addSuppression } from '@/lib/leads-agent/suppression'
import { createEnrollments } from '@/lib/leads-agent/outbound/enroll'

/** Prospecting has no org context (Candelaria's own data — see db/schema.ts). Audit rows are attributed to the acting staff member's own org with `scope: 'global'`. */
async function requireStaff() {
  const user = await requireModule('prospecting')
  if (!isStaff(user.role)) throw new Error('Forbidden: staff only.')
  return user
}

const startRunSchema = z.object({
  city: z.string().min(1),
  sectors: z.array(z.string().min(1)).min(1),
  limit: z.number().int().min(1).max(200),
  label: z.string().optional(),
})

export async function startRunAction(input: unknown) {
  const user = await requireStaff()
  const { city, sectors, limit, label } = startRunSchema.parse(input)

  const { runId } = await createRun({ city, sectors, limit, label, startedBy: user.id })

  await recordAudit({
    orgId: user.orgId,
    userId: user.id,
    action: 'prospecting_run_started',
    entity: 'prospect_run',
    entityId: runId,
    meta: { city, sectors, scope: 'global' },
  })

  revalidatePath('/prospecting')
  return { runId }
}

export async function cancelRunAction(runId: string) {
  const user = await requireStaff()
  await requestCancel(runId)
  await recordAudit({
    orgId: user.orgId,
    userId: user.id,
    action: 'prospecting_run_cancel_requested',
    entity: 'prospect_run',
    entityId: runId,
    meta: { scope: 'global' },
  })
  revalidatePath('/prospecting')
}

const VALID_CONFIG_KEYS: ConfigKey[] = ['icp', 'rubric', 'thresholds', 'crawl', 'sources', 'outbound_halt', 'golive_checklist']

export async function saveConfigAction(key: string, value: Record<string, unknown>) {
  const user = await requireStaff()
  if (!VALID_CONFIG_KEYS.includes(key as ConfigKey)) throw new Error('Ongeldige configuratiesleutel.')

  const version = await saveConfig(key as ConfigKey, value, { userId: user.id, orgId: user.orgId })
  revalidatePath('/prospecting/instellingen')
  return { version }
}

export async function restoreConfigVersionAction(key: string, version: number) {
  const user = await requireStaff()
  if (!VALID_CONFIG_KEYS.includes(key as ConfigKey)) throw new Error('Ongeldige configuratiesleutel.')

  const newVersion = await restoreConfigVersion(key as ConfigKey, version, { userId: user.id, orgId: user.orgId })
  revalidatePath('/prospecting/instellingen')
  return { version: newVersion }
}

export async function runRetentionAction() {
  const user = await requireStaff()
  const result = await runRetentionJob()
  await recordAudit({
    orgId: user.orgId,
    userId: user.id,
    action: 'prospecting_retention_run',
    entity: 'prospect_lead',
    meta: { ...result, scope: 'global' },
  })
  revalidatePath('/prospecting/instellingen')
  return result
}

export async function toggleOutboundHaltAction(halted: boolean) {
  const user = await requireStaff()
  await saveConfig('outbound_halt', { halted }, { userId: user.id, orgId: user.orgId })
  await recordAudit({
    orgId: user.orgId,
    userId: user.id,
    action: halted ? 'prospecting_outbound_halted' : 'prospecting_outbound_resumed',
    entity: 'prospect_config',
    entityId: 'outbound_halt',
    meta: { scope: 'global' },
  })
  revalidatePath('/prospecting/outbound')
}

export async function enrollLeadsAction(leadIds: string[]) {
  const user = await requireStaff()
  const result = await createEnrollments(leadIds, { userId: user.id, orgId: user.orgId })
  revalidatePath('/prospecting/outbound')
  revalidatePath('/prospecting/leads')
  return result
}

/**
 * §4 rule 10 (recht op vergetelheid): deletes the lead and leaves only a
 * one-way SHA-256 hash in suppression, so a future re-discovery run
 * recognizes and skips it — never a reversible record of who was forgotten.
 */
export async function forgetLeadAction(leadId: string) {
  const user = await requireStaff()
  const [lead] = await db.select().from(prospectLeads).where(eq(prospectLeads.id, leadId))
  if (!lead) throw new Error('Lead niet gevonden.')

  const identifiers = [lead.registrableDomain, lead.emailGeneral, lead.email].filter((v): v is string => Boolean(v))
  for (const identifier of identifiers) {
    const hash = crypto.createHash('sha256').update(identifier).digest('hex')
    await addSuppression('hash', hash, 'forget', 'Verzoek tot vergeten (recht op vergetelheid).')
  }

  await db.delete(prospectLeads).where(eq(prospectLeads.id, leadId))
  await recordAudit({
    orgId: user.orgId,
    userId: user.id,
    action: 'prospecting_lead_forgotten',
    entity: 'prospect_lead',
    entityId: leadId,
    meta: { identifiersHashed: identifiers.length, scope: 'global' },
  })

  revalidatePath('/prospecting/leads')
  return { ok: true, warning: identifiers.length === 0 ? 'Geen domein of e-mail bekend — toekomstige herontdekking kan niet worden herkend.' : undefined }
}

const leadNoteSchema = z.object({
  leadId: z.string().uuid(),
  notes: z.string().max(4000),
})

export async function updateLeadNotesAction(input: unknown) {
  const user = await requireStaff()
  const { leadId, notes } = leadNoteSchema.parse(input)

  await db.update(prospectLeads).set({ notes, updatedAt: new Date() }).where(eq(prospectLeads.id, leadId))
  await recordAudit({
    orgId: user.orgId,
    userId: user.id,
    action: 'prospecting_lead_notes_updated',
    entity: 'prospect_lead',
    entityId: leadId,
    meta: { scope: 'global' },
  })

  revalidatePath(`/prospecting/leads/${leadId}`)
}
