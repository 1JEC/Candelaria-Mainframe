'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { db } from '@/db'
import { conversations, escalations } from '@/db/schema'
import { recordAudit } from '@/lib/audit'
import { requireMutator } from '@/lib/session'

const ratingSchema = z.object({
  conversationId: z.string().uuid(),
  /** 1 = thumbs up, -1 = thumbs down, 0 = clear the rating. */
  rating: z.union([z.literal(1), z.literal(-1), z.literal(0)]),
})

export async function rateConversation(input: unknown) {
  const user = await requireMutator('agents')
  const { conversationId, rating } = ratingSchema.parse(input)

  // Scoped by orgId, so a guessed id from another organization updates nothing.
  const [row] = await db
    .update(conversations)
    .set({ rating: rating === 0 ? null : rating })
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.orgId, user.orgId),
      ),
    )
    .returning({ id: conversations.id })

  if (!row) throw new Error('Conversation not found.')

  await recordAudit({
    orgId: user.orgId,
    userId: user.id,
    action: 'conversation.rate',
    entity: 'conversation',
    entityId: conversationId,
    meta: { rating },
  })

  revalidatePath('/agents/conversations')
}

const escalationSchema = z.object({
  escalationId: z.string().uuid(),
  status: z.enum(['open', 'in_progress', 'done']),
  note: z.string().max(2000).optional(),
})

export async function updateEscalation(input: unknown) {
  const user = await requireMutator('agents')
  const { escalationId, status, note } = escalationSchema.parse(input)

  const [row] = await db
    .update(escalations)
    .set({
      status,
      assignedNote: note?.trim() ? note.trim() : null,
      // Reopening clears the resolution timestamp rather than leaving a stale one.
      resolvedAt: status === 'done' ? new Date() : null,
    })
    .where(
      and(eq(escalations.id, escalationId), eq(escalations.orgId, user.orgId)),
    )
    .returning({ id: escalations.id })

  if (!row) throw new Error('Escalation not found.')

  await recordAudit({
    orgId: user.orgId,
    userId: user.id,
    action: 'escalation.update',
    entity: 'escalation',
    entityId: escalationId,
    meta: { status },
  })

  revalidatePath('/agents/escalations')
}
