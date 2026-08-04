import Link from 'next/link'

import { EmptyState } from '@/components/ui/EmptyState'
import { Pill, StatusDot } from '@/components/ui/Pill'
import { formatDuration, formatNumber, formatPercent } from '@/lib/format'
import { agentStatusMeta, agentTypeLabel } from '@/lib/labels'
import { nl } from '@/lib/nl'
import { getAgentSummaries, type AgentSummary } from '@/lib/queries/agents'
import { requireModule } from '@/lib/session'

export const dynamic = 'force-dynamic'

/** Renders a value, or an em dash when the metric genuinely has no basis. */
const Metric = ({ label, value }: { label: string; value: string | null }) => (
  <div>
    <p className="text-caption text-muted">{label}</p>
    <p className="display mt-1 text-h3 text-foreground">{value ?? '—'}</p>
  </div>
)

const AgentCard = ({ agent }: { agent: AgentSummary }) => {
  const status = agentStatusMeta[agent.status] ?? agentStatusMeta.paused

  return (
    <Link
      href={`/agents/${agent.id}`}
      className="card group block transition-colors duration-fast hover:border-flame-line"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <StatusDot tone={status.tone} />
            <h2 className="display text-h2 text-foreground">{agent.name}</h2>
          </div>
          <p className="mt-1 text-caption text-muted">
            {agentTypeLabel[agent.type] ?? agent.type}
            {agent.model ? ` · ${agent.model}` : ''}
          </p>
        </div>
        <Pill tone={status.tone}>{status.label}</Pill>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4 border-t border-border pt-5">
        <Metric
          label={nl.agents.card.conversationsWeek}
          value={formatNumber(agent.conversationsWeek)}
        />
        <Metric
          label={nl.agents.card.avgDuration}
          value={formatDuration(agent.avgDurationSeconds)}
        />
        <Metric
          label={nl.agents.card.resolutionRate}
          value={
            agent.resolutionRate === null
              ? null
              : formatPercent(agent.resolutionRate)
          }
        />
      </div>

      <p className="mt-5 text-body-sm text-flame opacity-0 transition-opacity duration-fast group-hover:opacity-100">
        {nl.agents.card.viewDetail} →
      </p>
    </Link>
  )
}

export default async function AgentsOverviewPage() {
  const user = await requireModule('agents')
  const summaries = await getAgentSummaries(user.orgId)

  if (summaries.length === 0) return <EmptyState />

  return (
    <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
      {summaries.map((agent) => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  )
}
