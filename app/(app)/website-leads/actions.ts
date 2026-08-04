'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { db } from '@/db'
import { leads } from '@/db/schema'
import { recordAudit } from '@/lib/audit'
import { isStaff } from '@/lib/rbac'
import { requireModule } from '@/lib/session'

const statusSchema = z.object({
  leadId: z.string().uuid(),
  status: z.enum(['new', 'contacted', 'booked', 'won', 'lost']),
})

/**
 * `website-leads` has no org context (it's Candelaria's own data, not any
 * client's — see db/schema.ts). Audit entries still need a valid `org_id`
 * FK, so they're attributed to the acting staff member's own org with an
 * explicit `scope: 'global'` marker in `meta` to make clear in the trail
 * that this mutated global data, not that org's own.
 */
export async function changeLeadStatus(input: unknown) {
  const user = await requireModule('website-leads')
  if (!isStaff(user.role)) throw new Error('Forbidden: staff only.')

  const { leadId, status } = statusSchema.parse(input)

  const [row] = await db
    .update(leads)
    .set({ status })
    .where(eq(leads.id, leadId))
    .returning({ id: leads.id })

  if (!row) throw new Error('Lead not found.')

  await recordAudit({
    orgId: user.orgId,
    userId: user.id,
    action: 'website_lead.status_changed',
    entity: 'lead',
    entityId: leadId,
    meta: { status, scope: 'global' },
  })

  revalidatePath('/website-leads')
  revalidatePath(`/website-leads/${leadId}`)
}
