import {
  EscalationCard,
  type EscalationRow,
} from '@/components/agents/EscalationCard'
import { EmptyState } from '@/components/ui/EmptyState'
import type { EscalationStatus } from '@/db/schema'
import { formatNumber } from '@/lib/format'
import { escalationStatusMeta } from '@/lib/labels'
import { canMutate } from '@/lib/rbac'
import { listEscalations } from '@/lib/queries/agents'
import { requireModule } from '@/lib/session'

export const dynamic = 'force-dynamic'

const COLUMNS: EscalationStatus[] = ['open', 'in_progress', 'done']

export default async function EscalationsPage() {
  const user = await requireModule('agents')
  const rows = (await listEscalations(user.orgId)) as EscalationRow[]

  if (rows.length === 0) return <EmptyState />

  const mutable = canMutate(user.role)

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        {COLUMNS.map((status) => {
          const meta = escalationStatusMeta[status]
          const count = rows.filter((r) => r.status === status).length
          return (
            <div key={status} className="card">
              <p className="label">{meta.label}</p>
              <p className="display mt-3 text-kpi text-foreground">
                {formatNumber(count)}
              </p>
            </div>
          )
        })}
      </div>

      {COLUMNS.map((status) => {
        const group = rows.filter((r) => r.status === status)
        if (group.length === 0) return null
        const meta = escalationStatusMeta[status]

        return (
          <section key={status}>
            <h2 className="label">
              {meta.label} · {formatNumber(group.length)}
            </h2>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              {group.map((escalation) => (
                <EscalationCard
                  key={escalation.id}
                  escalation={escalation}
                  canMutate={mutable}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
