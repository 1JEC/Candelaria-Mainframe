import Link from 'next/link'
import { notFound } from 'next/navigation'

import { DonutChart } from '@/components/charts/DonutChart'
import { TopicBars } from '@/components/charts/TopicBars'
import { VolumeChart } from '@/components/charts/VolumeChart'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pill } from '@/components/ui/Pill'
import { chartTheme } from '@/lib/chart-theme'
import {
  formatCompact,
  formatDateTime,
  formatDuration,
  formatNumber,
  formatPercent,
} from '@/lib/format'
import { agentStatusMeta, agentTypeLabel } from '@/lib/labels'
import { nl } from '@/lib/nl'
import {
  getAgent,
  getAgentStats,
  getVolumeSeries,
  type VolumeBucket,
} from '@/lib/queries/agents'
import { requireModule } from '@/lib/session'

export const dynamic = 'force-dynamic'

const BUCKETS: { key: VolumeBucket; label: string }[] = [
  { key: 'day', label: nl.agents.detail.rangeDay },
  { key: 'week', label: nl.agents.detail.rangeWeek },
  { key: 'month', label: nl.agents.detail.rangeMonth },
]

const Panel = ({
  title,
  children,
  className = '',
}: {
  title: string
  children: React.ReactNode
  className?: string
}) => (
  <section className={`card ${className}`}>
    <h2 className="label">{title}</h2>
    <div className="mt-5">{children}</div>
  </section>
)

export default async function AgentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ agentId: string }>
  searchParams: Promise<{ bucket?: string }>
}) {
  const user = await requireModule('agents')
  const { agentId } = await params
  const { bucket: bucketParam } = await searchParams

  const agent = await getAgent(user.orgId, agentId)
  if (!agent) notFound()

  const bucket: VolumeBucket = BUCKETS.some((b) => b.key === bucketParam)
    ? (bucketParam as VolumeBucket)
    : 'day'

  const [volume, stats] = await Promise.all([
    getVolumeSeries(user.orgId, agentId, bucket),
    getAgentStats(user.orgId, agentId),
  ])

  const status = agentStatusMeta[agent.status] ?? agentStatusMeta.paused
  const tokenTotal = stats.tokenInput + stats.tokenOutput

  return (
    <div className="space-y-6">
      <Link
        href="/agents"
        className="inline-block text-body-sm text-muted transition-colors duration-fast hover:text-foreground"
      >
        ← {nl.agents.detail.back}
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-h1 text-foreground">{agent.name}</h1>
          <p className="mt-1 text-body-sm text-muted">
            {agentTypeLabel[agent.type] ?? agent.type}
            {agent.model ? ` · ${agent.model}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Pill tone={status.tone} dot>
            {status.label}
          </Pill>
          {agent.isDemo && <Pill tone="brand">{nl.common.demoBadge}</Pill>}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card">
          <p className="label">{nl.agents.detail.totalConversations}</p>
          <p className="display mt-3 text-kpi text-foreground">
            {formatNumber(stats.total)}
          </p>
        </div>
        <div className="card">
          <p className="label">{nl.agents.card.resolutionRate}</p>
          <p className="display mt-3 text-kpi text-foreground">
            {stats.total === 0
              ? '—'
              : formatPercent(stats.resolved / stats.total)}
          </p>
        </div>
        <div className="card">
          <p className="label">{nl.agents.card.avgDuration}</p>
          <p className="display mt-3 text-kpi text-foreground">
            {formatDuration(stats.avgDuration) ?? '—'}
          </p>
        </div>
        <div className="card">
          <p className="label">{nl.agents.detail.lastConversation}</p>
          <p className="mt-4 text-body text-foreground">
            {stats.last ? formatDateTime(stats.last) : nl.agents.detail.never}
          </p>
        </div>
      </div>

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="label">{nl.agents.detail.volume}</h2>
          <div className="flex gap-1 rounded-full border border-border p-1">
            {BUCKETS.map((b) => (
              <Link
                key={b.key}
                href={`/agents/${agentId}?bucket=${b.key}`}
                scroll={false}
                aria-current={b.key === bucket ? 'true' : undefined}
                className={`rounded-full px-3 py-1.5 font-mono text-label uppercase tracking-label transition-colors duration-fast ${
                  b.key === bucket
                    ? 'bg-surface-raised text-foreground'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {b.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-6">
          {volume.length === 0 ? (
            <EmptyState />
          ) : (
            <VolumeChart data={volume} bucket={bucket} />
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={nl.agents.detail.resolution}>
          {stats.total === 0 ? (
            <EmptyState />
          ) : (
            <DonutChart
              data={[
                {
                  name: nl.agents.outcome.resolved,
                  value: stats.resolved,
                  color: chartTheme.series.resolved,
                },
                {
                  name: nl.agents.outcome.escalated,
                  value: stats.escalated,
                  color: chartTheme.series.escalated,
                },
                {
                  name: nl.agents.outcome.abandoned,
                  value: stats.abandoned,
                  color: chartTheme.series.abandoned,
                },
              ]}
            />
          )}
        </Panel>

        <Panel title={nl.agents.detail.sentiment}>
          {stats.total === 0 ? (
            <EmptyState />
          ) : (
            <DonutChart
              data={[
                {
                  name: nl.agents.sentiment.positive,
                  value: stats.positive,
                  color: chartTheme.series.positive,
                },
                {
                  name: nl.agents.sentiment.neutral,
                  value: stats.neutral,
                  color: chartTheme.series.neutral,
                },
                {
                  name: nl.agents.sentiment.negative,
                  value: stats.negative,
                  color: chartTheme.series.negative,
                },
              ]}
            />
          )}
        </Panel>

        <Panel title={nl.agents.detail.topics}>
          {stats.topics.length === 0 ? (
            <EmptyState />
          ) : (
            <TopicBars topics={stats.topics} />
          )}
        </Panel>

        <Panel title={nl.agents.detail.tokens}>
          {tokenTotal === 0 ? (
            <EmptyState />
          ) : (
            <dl className="space-y-4">
              {[
                { label: nl.agents.detail.tokenInput, value: stats.tokenInput },
                {
                  label: nl.agents.detail.tokenOutput,
                  value: stats.tokenOutput,
                },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex items-baseline justify-between text-body-sm">
                    <dt className="text-muted">{row.label}</dt>
                    <dd className="font-mono text-caption text-foreground">
                      {formatNumber(row.value)}
                    </dd>
                  </div>
                  <div className="mt-1.5 h-1 w-full rounded-full bg-surface-raised">
                    <div
                      className="h-1 rounded-full bg-flame"
                      style={{ width: `${(row.value / tokenTotal) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="flex items-baseline justify-between border-t border-border pt-4 text-body-sm">
                <dt className="text-foreground">
                  {nl.agents.detail.tokenTotal}
                </dt>
                <dd className="display text-h3 text-foreground">
                  {formatCompact(tokenTotal)}
                </dd>
              </div>
            </dl>
          )}
        </Panel>
      </div>
    </div>
  )
}
