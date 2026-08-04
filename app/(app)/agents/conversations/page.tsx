import Link from 'next/link'

import { ConversationFilters } from '@/components/agents/ConversationFilters'
import { TranscriptPanel } from '@/components/agents/TranscriptPanel'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pill } from '@/components/ui/Pill'
import type { ConversationOutcome } from '@/db/schema'
import { formatDate, formatDuration, formatNumber } from '@/lib/format'
import { channelLabel, outcomeMeta } from '@/lib/labels'
import { nl } from '@/lib/nl'
import { canMutate } from '@/lib/rbac'
import {
  getAgentSummaries,
  getConversation,
  listConversations,
  listTopics,
} from '@/lib/queries/agents'
import { requireModule } from '@/lib/session'

export const dynamic = 'force-dynamic'

const OUTCOMES: ConversationOutcome[] = ['resolved', 'escalated', 'abandoned']

/** Parses a `YYYY-MM-DD` input value; returns undefined for anything else. */
function parseDate(value: string | undefined, endOfDay = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const d = new Date(`${value}T${endOfDay ? '23:59:59' : '00:00:00'}`)
  return Number.isNaN(d.getTime()) ? undefined : d
}

type Search = {
  q?: string
  agentId?: string
  outcome?: string
  topic?: string
  from?: string
  to?: string
  page?: string
  c?: string
}

export default async function ConversationLogPage({
  searchParams,
}: {
  searchParams: Promise<Search>
}) {
  const user = await requireModule('agents')
  const sp = await searchParams

  const outcome = OUTCOMES.includes(sp.outcome as ConversationOutcome)
    ? (sp.outcome as ConversationOutcome)
    : undefined

  const [result, agents, topics, open] = await Promise.all([
    listConversations(user.orgId, {
      q: sp.q?.trim() || undefined,
      agentId: sp.agentId || undefined,
      outcome,
      topic: sp.topic || undefined,
      from: parseDate(sp.from),
      to: parseDate(sp.to, true),
      page: Number(sp.page) || 1,
    }),
    getAgentSummaries(user.orgId),
    listTopics(user.orgId),
    sp.c ? getConversation(user.orgId, sp.c) : Promise.resolve(null),
  ])

  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(sp)) {
    if (value && key !== 'c' && key !== 'page') query.set(key, value)
  }

  const hrefFor = (extra: Record<string, string>) => {
    const next = new URLSearchParams(query.toString())
    for (const [k, v] of Object.entries(extra)) next.set(k, v)
    return `/agents/conversations?${next}`
  }

  const pageQuery = new URLSearchParams(query.toString())
  if (sp.page) pageQuery.set('page', sp.page)

  return (
    <div className="space-y-6">
      <ConversationFilters
        agents={agents.map((a) => ({ id: a.id, name: a.name }))}
        topics={topics}
      />

      <div
        className={`grid gap-6 ${open ? 'xl:grid-cols-[1fr,26rem]' : 'grid-cols-1'}`}
      >
        <div className="min-w-0">
          <p className="text-body-sm text-muted">
            {formatNumber(result.total)} {nl.agents.log.results}
          </p>

          {result.rows.length === 0 ? (
            <EmptyState className="mt-4" />
          ) : (
            <div className="mt-4 overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[720px] border-collapse text-body-sm">
                <thead>
                  <tr className="border-b border-border bg-surface">
                    {[
                      nl.agents.log.colDate,
                      nl.agents.log.colAgent,
                      nl.agents.log.colTopic,
                      nl.agents.log.colChannel,
                      nl.agents.log.colDuration,
                      nl.agents.log.colOutcome,
                      nl.agents.log.colRating,
                    ].map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className="px-4 py-3 text-left font-mono text-label uppercase tracking-label text-muted"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => {
                    const meta = outcomeMeta[row.outcome]
                    const active = sp.c === row.id
                    const duration = row.endedAt
                      ? formatDuration(
                          (new Date(row.endedAt).getTime() -
                            new Date(row.startedAt).getTime()) /
                            1000,
                        )
                      : null

                    return (
                      <tr
                        key={row.id}
                        className={`border-b border-border last:border-0 transition-colors duration-fast hover:bg-surface ${
                          active ? 'bg-surface' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-mono text-caption text-muted">
                          {formatDate(row.startedAt)}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {row.agentName}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={hrefFor({ c: row.id })}
                            scroll={false}
                            aria-label={`${nl.agents.log.open}: ${row.topic ?? ''}`}
                            className="text-foreground underline-offset-4 transition-colors duration-fast hover:text-flame hover:underline"
                          >
                            {row.topic ?? '—'}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {channelLabel(row.channel)}
                        </td>
                        <td className="px-4 py-3 font-mono text-caption text-muted">
                          {duration ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Pill tone={meta.tone}>{meta.label}</Pill>
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {row.rating === 1
                            ? '👍'
                            : row.rating === -1
                              ? '👎'
                              : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {result.pages > 1 && (
            <nav
              className="mt-4 flex items-center justify-between"
              aria-label="Paginering"
            >
              <PageLink
                query={query}
                page={result.page - 1}
                disabled={result.page <= 1}
                label={nl.agents.log.prev}
              />
              <span className="font-mono text-caption text-muted">
                {nl.agents.log.page} {result.page} {nl.agents.log.of}{' '}
                {result.pages}
              </span>
              <PageLink
                query={query}
                page={result.page + 1}
                disabled={result.page >= result.pages}
                label={nl.agents.log.next}
              />
            </nav>
          )}
        </div>

        {open && (
          <TranscriptPanel
            conversation={open}
            closeHref={`/agents/conversations?${pageQuery}`}
            canRate={canMutate(user.role)}
          />
        )}
      </div>
    </div>
  )
}

const PageLink = ({
  query,
  page,
  disabled,
  label,
}: {
  query: URLSearchParams
  page: number
  disabled: boolean
  label: string
}) => {
  if (disabled) {
    return (
      <span className="text-body-sm text-muted opacity-40">{label}</span>
    )
  }
  const next = new URLSearchParams(query.toString())
  next.set('page', String(page))
  return (
    <Link
      href={`/agents/conversations?${next}`}
      className="text-body-sm text-foreground transition-colors duration-fast hover:text-flame"
    >
      {label}
    </Link>
  )
}
