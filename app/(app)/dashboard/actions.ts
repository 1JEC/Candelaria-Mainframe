'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { db } from '@/db'
import { changelogEntries } from '@/db/schema'
import { recordAudit } from '@/lib/audit'
import { isStaff } from '@/lib/rbac'
import { requireMutator } from '@/lib/session'

const schema = z.object({
  weekLabel: z.string().trim().min(1).max(50),
  entry: z.string().trim().min(1).max(1000),
})

/** Admin-only: the changelog is the agency reporting to the client. */
export async function addChangelogEntry(input: unknown) {
  const user = await requireMutator('dashboard')
  if (!isStaff(user.role)) {
    throw new Error('Forbidden: only agency staff can write the changelog.')
  }

  const data = schema.parse(input)

  const [row] = await db
    .insert(changelogEntries)
    .values({
      orgId: user.orgId,
      weekLabel: data.weekLabel,
      entry: data.entry,
      isDemo: false,
    })
    .returning({ id: changelogEntries.id })

  await recordAudit({
    orgId: user.orgId,
    userId: user.id,
    action: 'changelog.create',
    entity: 'changelog_entry',
    entityId: row.id,
  })

  revalidatePath('/dashboard')
}
