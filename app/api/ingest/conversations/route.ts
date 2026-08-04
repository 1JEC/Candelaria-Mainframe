import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db'
import { agents, conversations, escalations, messages } from '@/db/schema'
import { recordAudit } from '@/lib/audit'
import { authenticateIngest } from '@/lib/ingest-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const messageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
  created_at: z.coerce.date().optional(),
})

const conversationSchema = z.object({
  /** Idempotency key from the source system. Re-posting updates in place. */
  external_id: z.string().min(1).max(200),
  /** Agent name; must already exist for this organization. */
  agent: z.string().min(1).max(200),
  started_at: z.coerce.date(),
  ended_at: z.coerce.date().optional(),
  channel: z.string().min(1).max(50).default('web'),
  outcome: z.enum(['resolved', 'escalated', 'abandoned']),
  sentiment: z.enum(['positive', 'neutral', 'negative']).default('neutral'),
  topic: z.string().max(200).optional(),
  token_input: z.number().int().min(0).default(0),
  token_output: z.number().int().min(0).default(0),
  messages: z.array(messageSchema).max(500).default([]),
})

const payloadSchema = z.object({
  conversations: z.array(conversationSchema).min(1).max(100),
})

export async function POST(req: Request) {
  const authResult = await authenticateIngest(req)
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.message },
      { status: authResult.status },
    )
  }
  const { orgId } = authResult

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const parsed = payloadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed.', issues: parsed.error.issues },
      { status: 422 },
    )
  }

  // Resolve agent names once; ingest never creates agents implicitly, so a
  // typo surfaces as an error instead of silently spawning a ghost agent.
  const orgAgents = await db
    .select({ id: agents.id, name: agents.name })
    .from(agents)
    .where(eq(agents.orgId, orgId))
  const agentByName = new Map(orgAgents.map((a) => [a.name, a.id]))

  const unknown = [
    ...new Set(
      parsed.data.conversations
        .map((c) => c.agent)
        .filter((name) => !agentByName.has(name)),
    ),
  ]
  if (unknown.length > 0) {
    return NextResponse.json(
      { error: 'Unknown agent(s) for this organization.', agents: unknown },
      { status: 422 },
    )
  }

  let created = 0
  let updated = 0

  for (const c of parsed.data.conversations) {
    const agentId = agentByName.get(c.agent)!

    const existing = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.orgId, orgId),
          eq(conversations.externalId, c.external_id),
        ),
      )
      .limit(1)

    const values = {
      orgId,
      agentId,
      startedAt: c.started_at,
      endedAt: c.ended_at ?? null,
      channel: c.channel,
      outcome: c.outcome,
      sentiment: c.sentiment,
      topic: c.topic ?? null,
      tokenInput: c.token_input,
      tokenOutput: c.token_output,
      externalId: c.external_id,
      isDemo: false,
    }

    let conversationId: string

    if (existing.length > 0) {
      conversationId = existing[0].id
      await db
        .update(conversations)
        .set(values)
        .where(eq(conversations.id, conversationId))
      // Transcript is authoritative at the source: replace, never append.
      await db
        .delete(messages)
        .where(eq(messages.conversationId, conversationId))
      updated++
    } else {
      const [row] = await db
        .insert(conversations)
        .values(values)
        .returning({ id: conversations.id })
      conversationId = row.id
      created++
    }

    if (c.messages.length > 0) {
      await db.insert(messages).values(
        c.messages.map((m) => ({
          conversationId,
          role: m.role,
          content: m.content,
          ...(m.created_at ? { createdAt: m.created_at } : {}),
        })),
      )
    }

    // An escalated conversation always has exactly one escalation record.
    if (c.outcome === 'escalated') {
      await db
        .insert(escalations)
        .values({ orgId, conversationId, status: 'open' })
        .onConflictDoNothing({ target: escalations.conversationId })
    }
  }

  await recordAudit({
    orgId,
    userId: null, // system actor
    action: 'ingest.conversations',
    entity: 'conversation',
    meta: { created, updated, tokenId: authResult.tokenId },
  })

  return NextResponse.json({ ok: true, created, updated }, { status: 200 })
}
