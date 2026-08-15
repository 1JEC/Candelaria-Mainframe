import { and, desc, eq, gt, gte, inArray, isNotNull, or, sql } from 'drizzle-orm'

import { db } from '@/db'
import {
  prospectLeads,
  prospectSignals,
  prospectContacts,
  prospectAudits,
  prospectPacks,
  prospectRuns,
  prospectMailboxes,
  prospectOutbox,
  prospectReplies,
  prospectSendLog,
  type ProspectLeadStatus,
  type ProspectPriority,
} from '@/db/schema'

export interface LeadListFilters {
  priority?: ProspectPriority
  sector?: string
  city?: string
  minScore?: number
  hasEmail?: boolean
}

export async function listProspectLeads(filters: LeadListFilters) {
  const conditions = []
  if (filters.priority) conditions.push(eq(prospectLeads.priority, filters.priority))
  if (filters.sector) conditions.push(eq(prospectLeads.sector, filters.sector))
  if (filters.city) conditions.push(eq(prospectLeads.city, filters.city))
  if (filters.minScore !== undefined) conditions.push(gte(prospectLeads.totalScore, filters.minScore))
  if (filters.hasEmail) conditions.push(or(isNotNull(prospectLeads.email), isNotNull(prospectLeads.emailGeneral)))

  return db
    .select()
    .from(prospectLeads)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(prospectLeads.totalScore))
}

export async function countProspectLeads() {
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(prospectLeads)
  return row?.count ?? 0
}

export async function getProspectLead(id: string) {
  const [lead] = await db.select().from(prospectLeads).where(eq(prospectLeads.id, id))
  if (!lead) return null

  const [signals, contacts, audits, packs] = await Promise.all([
    db.select().from(prospectSignals).where(eq(prospectSignals.leadId, id)).orderBy(desc(prospectSignals.points)),
    db.select().from(prospectContacts).where(eq(prospectContacts.leadId, id)),
    db.select().from(prospectAudits).where(eq(prospectAudits.leadId, id)).orderBy(desc(prospectAudits.createdAt)).limit(1),
    db.select().from(prospectPacks).where(eq(prospectPacks.leadId, id)).orderBy(desc(prospectPacks.generatedAt)).limit(1),
  ])

  return { ...lead, signals, contacts, audit: audits[0] ?? null, pack: packs[0] ?? null }
}

export async function getTopLeadsWithSignals(limit = 20) {
  const top = await db
    .select({ id: prospectLeads.id, company: prospectLeads.company, name: prospectLeads.name })
    .from(prospectLeads)
    .where(isNotNull(prospectLeads.totalScore))
    .orderBy(desc(prospectLeads.totalScore))
    .limit(limit)

  const ids = top.map((l) => l.id)
  if (ids.length === 0) return []

  const signalRows = await db
    .select({ leadId: prospectSignals.leadId, code: prospectSignals.code })
    .from(prospectSignals)
    .where(and(inArray(prospectSignals.leadId, ids), gt(prospectSignals.points, 0)))

  const signalsByLead = new Map<string, string[]>()
  for (const row of signalRows) {
    const list = signalsByLead.get(row.leadId) ?? []
    list.push(row.code)
    signalsByLead.set(row.leadId, list)
  }

  return top.map((l) => ({
    leadId: l.id,
    company: l.company || l.name || '—',
    signalCodes: signalsByLead.get(l.id) ?? [],
  }))
}

export async function getActiveRun() {
  const [run] = await db
    .select()
    .from(prospectRuns)
    .where(or(eq(prospectRuns.status, 'running'), eq(prospectRuns.status, 'queued')))
    .orderBy(desc(prospectRuns.startedAt))
    .limit(1)
  return run ?? null
}

export async function getRecentRuns(limit = 10) {
  return db.select().from(prospectRuns).orderBy(desc(prospectRuns.startedAt)).limit(limit)
}

export async function getRun(runId: string) {
  const [run] = await db.select().from(prospectRuns).where(eq(prospectRuns.id, runId))
  return run ?? null
}

export async function listMailboxes() {
  return db.select().from(prospectMailboxes).orderBy(prospectMailboxes.address)
}

export async function listOutboxQueue(limit = 50) {
  return db
    .select({
      id: prospectOutbox.id,
      channel: prospectOutbox.channel,
      createdAt: prospectOutbox.createdAt,
      sentAt: prospectOutbox.sentAt,
      leadCompany: prospectLeads.company,
      leadId: prospectLeads.id,
    })
    .from(prospectOutbox)
    .leftJoin(prospectLeads, eq(prospectOutbox.leadId, prospectLeads.id))
    .orderBy(desc(prospectOutbox.createdAt))
    .limit(limit)
}

export async function listReplies(limit = 50) {
  return db
    .select({
      id: prospectReplies.id,
      classification: prospectReplies.classification,
      receivedAt: prospectReplies.receivedAt,
      bodyText: prospectReplies.bodyText,
      prepBrief: prospectReplies.prepBrief,
      leadCompany: prospectLeads.company,
      leadId: prospectLeads.id,
    })
    .from(prospectReplies)
    .leftJoin(prospectLeads, eq(prospectReplies.leadId, prospectLeads.id))
    .orderBy(desc(prospectReplies.receivedAt))
    .limit(limit)
}

export async function listSendLog(limit = 50) {
  return db
    .select({
      id: prospectSendLog.id,
      result: prospectSendLog.result,
      reason: prospectSendLog.reason,
      ts: prospectSendLog.ts,
      leadCompany: prospectLeads.company,
    })
    .from(prospectSendLog)
    .leftJoin(prospectLeads, eq(prospectSendLog.leadId, prospectLeads.id))
    .orderBy(desc(prospectSendLog.ts))
    .limit(limit)
}

export const PROSPECT_STATUSES: ProspectLeadStatus[] = [
  'new',
  'contacted',
  'qualified',
  'packed',
  'replied',
  'won',
  'lost',
  'suppressed',
]
export const PROSPECT_PRIORITIES: ProspectPriority[] = ['A', 'B', 'C']
