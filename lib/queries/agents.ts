import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm'

import { db } from '@/db'
import {
  agents,
  conversations,
  escalations,
  messages,
  type ConversationOutcome,
} from '@/db/schema'

/**
 * Read models for the AI Agents module. Every function is scoped by `orgId` as
 * its first argument — there is no unscoped query in this file, which is what
 * keeps one organization's data from ever reaching another's page.
 */

/** Seconds between start and end; null-safe so unfinished calls are ignored. */
const durationSeconds = sql<number>`extract(epoch from (${conversations.endedAt} - ${conversations.startedAt}))`

export type AgentSummary = {
  id: string
  name: string
  type: string
  status: string
  model: string | null
  conversationsWeek: number
  avgDurationSeconds: number | null
  resolutionRate: number | null
  totalConversations: number
  lastConversationAt: Date | null
}

export async function getAgentSummaries(
  orgId: string,
): Promise<AgentSummary[]> {
  // ISO string + explicit cast: postgres.js runs with `prepare: false`, so it
  // cannot infer a bind type for a bare JS Date inside a raw `sql` template.
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()

  const rows = await db
    .select({
      id: agents.id,
      name: agents.name,
      type: agents.type,
      status: agents.status,
      model: agents.model,
      total: sql<number>`count(${conversations.id})::int`,
      week: sql<number>`count(*) filter (where ${conversations.startedAt} >= ${weekAgo}::timestamptz)::int`,
      resolved: sql<number>`count(*) filter (where ${conversations.outcome} = 'resolved')::int`,
      avgDuration: sql<number | null>`avg(${durationSeconds})`,
      last: sql<Date | null>`max(${conversations.startedAt})`,
    })
    .from(agents)
    .leftJoin(conversations, eq(conversations.agentId, agents.id))
    .where(eq(agents.orgId, orgId))
    .groupBy(agents.id)
    .orderBy(asc(agents.name))

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    status: r.status,
    model: r.model,
    conversationsWeek: r.week,
    avgDurationSeconds: r.avgDuration === null ? null : Number(r.avgDuration),
    resolutionRate: r.total === 0 ? null : r.resolved / r.total,
    totalConversations: r.total,
    lastConversationAt: r.last ? new Date(r.last) : null,
  }))
}

export async function getAgent(orgId: string, agentId: string) {
  const [row] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.orgId, orgId), eq(agents.id, agentId)))
    .limit(1)
  return row ?? null
}

export type VolumeBucket = 'day' | 'week' | 'month'

/**
 * Conversation volume over time, split by outcome so the chart can stack.
 * Buckets are produced by Postgres `date_trunc`, so gaps are simply absent —
 * the chart renders what happened, never an invented zero-filled series.
 */
export async function getVolumeSeries(
  orgId: string,
  agentId: string,
  bucket: VolumeBucket,
) {
  const since = new Date(
    Date.now() -
      (bucket === 'day' ? 30 : bucket === 'week' ? 168 : 365) * 86_400_000,
  )

  const rows = await db
    .select({
      bucket: sql<string>`to_char(date_trunc(${bucket}, ${conversations.startedAt}), 'YYYY-MM-DD')`,
      resolved: sql<number>`count(*) filter (where ${conversations.outcome} = 'resolved')::int`,
      escalated: sql<number>`count(*) filter (where ${conversations.outcome} = 'escalated')::int`,
      abandoned: sql<number>`count(*) filter (where ${conversations.outcome} = 'abandoned')::int`,
    })
    .from(conversations)
    .where(
      and(
        eq(conversations.orgId, orgId),
        eq(conversations.agentId, agentId),
        gte(conversations.startedAt, since),
      ),
    )
    // Group/order by the select ordinal: repeating the `date_trunc` expression
    // would emit a second bind parameter, and Postgres compares GROUP BY
    // expressions structurally — two params are never equal, even with the same
    // value. The bucket label is `YYYY-MM-DD`, so lexical order is chronological.
    .groupBy(sql`1`)
    .orderBy(sql`1`)

  return rows
}

export async function getAgentStats(orgId: string, agentId: string) {
  const scope = and(
    eq(conversations.orgId, orgId),
    eq(conversations.agentId, agentId),
  )

  const [totals] = await db
    .select({
      total: sql<number>`count(*)::int`,
      resolved: sql<number>`count(*) filter (where ${conversations.outcome} = 'resolved')::int`,
      escalated: sql<number>`count(*) filter (where ${conversations.outcome} = 'escalated')::int`,
      abandoned: sql<number>`count(*) filter (where ${conversations.outcome} = 'abandoned')::int`,
      positive: sql<number>`count(*) filter (where ${conversations.sentiment} = 'positive')::int`,
      neutral: sql<number>`count(*) filter (where ${conversations.sentiment} = 'neutral')::int`,
      negative: sql<number>`count(*) filter (where ${conversations.sentiment} = 'negative')::int`,
      tokenInput: sql<number>`coalesce(sum(${conversations.tokenInput}), 0)::int`,
      tokenOutput: sql<number>`coalesce(sum(${conversations.tokenOutput}), 0)::int`,
      avgDuration: sql<number | null>`avg(${durationSeconds})`,
      thumbsUp: sql<number>`count(*) filter (where ${conversations.rating} = 1)::int`,
      thumbsDown: sql<number>`count(*) filter (where ${conversations.rating} = -1)::int`,
      last: sql<Date | null>`max(${conversations.startedAt})`,
    })
    .from(conversations)
    .where(scope)

  const topics = await db
    .select({
      topic: conversations.topic,
      count: sql<number>`count(*)::int`,
    })
    .from(conversations)
    .where(and(scope, sql`${conversations.topic} is not null`))
    .groupBy(conversations.topic)
    .orderBy(desc(sql`count(*)`))
    .limit(10)

  return {
    ...totals,
    avgDuration:
      totals.avgDuration === null ? null : Number(totals.avgDuration),
    last: totals.last ? new Date(totals.last) : null,
    topics: topics.map((t) => ({ topic: t.topic ?? '—', count: t.count })),
  }
}

export type ConversationFilters = {
  q?: string
  agentId?: string
  outcome?: ConversationOutcome
  topic?: string
  from?: Date
  to?: Date
  page?: number
}

export const CONVERSATIONS_PER_PAGE = 25

export async function listConversations(
  orgId: string,
  filters: ConversationFilters,
) {
  const clauses = [eq(conversations.orgId, orgId)]

  if (filters.agentId) clauses.push(eq(conversations.agentId, filters.agentId))
  if (filters.outcome) clauses.push(eq(conversations.outcome, filters.outcome))
  if (filters.topic) clauses.push(eq(conversations.topic, filters.topic))
  if (filters.from) clauses.push(gte(conversations.startedAt, filters.from))
  if (filters.to) clauses.push(lte(conversations.startedAt, filters.to))

  if (filters.q) {
    // Matches the topic or any message in the transcript. `ilike` is enough at
    // this volume; a tsvector index is the upgrade path if it ever isn't.
    const pattern = `%${filters.q}%`
    clauses.push(
      sql`(${conversations.topic} ilike ${pattern} or exists (
        select 1 from ${messages}
        where ${messages.conversationId} = ${conversations.id}
          and ${messages.content} ilike ${pattern}
      ))`,
    )
  }

  const where = and(...clauses)
  const page = Math.max(1, filters.page ?? 1)

  const [countRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(conversations)
    .where(where)

  const rows = await db
    .select({
      id: conversations.id,
      startedAt: conversations.startedAt,
      endedAt: conversations.endedAt,
      channel: conversations.channel,
      outcome: conversations.outcome,
      sentiment: conversations.sentiment,
      topic: conversations.topic,
      rating: conversations.rating,
      agentName: agents.name,
    })
    .from(conversations)
    .innerJoin(agents, eq(agents.id, conversations.agentId))
    .where(where)
    .orderBy(desc(conversations.startedAt))
    .limit(CONVERSATIONS_PER_PAGE)
    .offset((page - 1) * CONVERSATIONS_PER_PAGE)

  return {
    rows,
    total: countRow.total,
    page,
    pages: Math.max(1, Math.ceil(countRow.total / CONVERSATIONS_PER_PAGE)),
  }
}

export async function getConversation(orgId: string, id: string) {
  const [row] = await db
    .select({
      id: conversations.id,
      startedAt: conversations.startedAt,
      endedAt: conversations.endedAt,
      channel: conversations.channel,
      outcome: conversations.outcome,
      sentiment: conversations.sentiment,
      topic: conversations.topic,
      rating: conversations.rating,
      tokenInput: conversations.tokenInput,
      tokenOutput: conversations.tokenOutput,
      agentName: agents.name,
      agentId: agents.id,
    })
    .from(conversations)
    .innerJoin(agents, eq(agents.id, conversations.agentId))
    .where(and(eq(conversations.orgId, orgId), eq(conversations.id, id)))
    .limit(1)

  if (!row) return null

  const transcript = await db
    .select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt))

  return { ...row, transcript }
}

/** Distinct topics for the filter dropdown, most common first. */
export async function listTopics(orgId: string) {
  const rows = await db
    .select({ topic: conversations.topic })
    .from(conversations)
    .where(
      and(eq(conversations.orgId, orgId), sql`${conversations.topic} is not null`),
    )
    .groupBy(conversations.topic)
    .orderBy(desc(sql`count(*)`))

  return rows.map((r) => r.topic!).filter(Boolean)
}

export async function listEscalations(orgId: string) {
  return db
    .select({
      id: escalations.id,
      status: escalations.status,
      assignedNote: escalations.assignedNote,
      resolvedAt: escalations.resolvedAt,
      createdAt: escalations.createdAt,
      conversationId: escalations.conversationId,
      topic: conversations.topic,
      channel: conversations.channel,
      sentiment: conversations.sentiment,
      startedAt: conversations.startedAt,
      agentName: agents.name,
    })
    .from(escalations)
    .innerJoin(conversations, eq(conversations.id, escalations.conversationId))
    .innerJoin(agents, eq(agents.id, conversations.agentId))
    .where(eq(escalations.orgId, orgId))
    .orderBy(desc(escalations.createdAt))
}
