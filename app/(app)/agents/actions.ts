'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { db } from '@/db'
import { agents, conversations, escalations } from '@/db/schema'
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

const createAgentSchema = z.object({
  name: z.string().trim().min(1).max(200),
  type: z.enum(['chat', 'voice', 'email', 'internal']),
  model: z.string().trim().max(200).optional(),
})

/**
 * Registers an agent so its runtime (wherever it actually executes) has
 * something to ingest conversations against — see POST /api/ingest/conversations,
 * which matches incoming data to an agent by org + exact name. This screen
 * does not configure prompts, tools or channels: agents.$inferInsert has no
 * columns for those today, so a UI for them would be pure decoration. Adding
 * that needs a schema decision first, not a bigger form.
 */
export async function createAgentAction(input: unknown) {
  const user = await requireMutator('agents')
  const { name, type, model } = createAgentSchema.parse(input)

  const [existing] = await db
    .select({ id: agents.id })
    .from(agents)
    .where(and(eq(agents.orgId, user.orgId), eq(agents.name, name)))
  if (existing) throw new Error('Er bestaat al een agent met deze naam.')

  const [row] = await db
    .insert(agents)
    .values({ orgId: user.orgId, name, type, model: model || null })
    .returning({ id: agents.id, name: agents.name, type: agents.type, status: agents.status, model: agents.model })

  await recordAudit({
    orgId: user.orgId,
    userId: user.id,
    action: 'agent.created',
    entity: 'agent',
    entityId: row.id,
    meta: { name, type, model },
  })

  revalidatePath('/agents')
  return row
}

const updateAgentSchema = z.object({
  agentId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  model: z.string().trim().max(200).optional(),
  status: z.enum(['active', 'paused', 'error']),
})

export async function updateAgentAction(input: unknown) {
  const user = await requireMutator('agents')
  const { agentId, name, model, status } = updateAgentSchema.parse(input)

  const [duplicate] = await db
    .select({ id: agents.id })
    .from(agents)
    .where(and(eq(agents.orgId, user.orgId), eq(agents.name, name)))
  if (duplicate && duplicate.id !== agentId) throw new Error('Er bestaat al een agent met deze naam.')

  const [row] = await db
    .update(agents)
    .set({ name, model: model || null, status })
    .where(and(eq(agents.id, agentId), eq(agents.orgId, user.orgId)))
    .returning({ id: agents.id })

  if (!row) throw new Error('Agent niet gevonden.')

  await recordAudit({
    orgId: user.orgId,
    userId: user.id,
    action: 'agent.updated',
    entity: 'agent',
    entityId: agentId,
    meta: { name, model, status },
  })

  revalidatePath('/agents')
  revalidatePath(`/agents/${agentId}`)
  return { id: agentId, name, model: model || null, status }
}
