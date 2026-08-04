import { ChangelogFeed } from '@/components/dashboard/ChangelogFeed'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { nl } from '@/lib/nl'
import { isStaff } from '@/lib/rbac'
import { listChangelog } from '@/lib/queries/requests'
import { requireModule } from '@/lib/session'

export const dynamic = 'force-dynamic'

const cards = [
  nl.dashboard.cards.hoursSaved,
  nl.dashboard.cards.leads,
  nl.dashboard.cards.pipelineValue,
  nl.dashboard.cards.reach,
]

export default async function DashboardPage() {
  const user = await requireModule('dashboard')
  const changelog = await listChangelog(user.orgId)

  return (
    <>
      <PageHeader title={nl.dashboard.title} subtitle={nl.dashboard.subtitle} />

      {/* KPI values stay empty until real metrics exist — Phase 3. */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((title) => (
          <div key={title} className="card">
            <p className="label">{title}</p>
            <p className="display mt-4 text-kpi text-muted">—</p>
            <p className="mt-2 text-caption text-muted">{nl.common.empty}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChangelogFeed entries={changelog} canAdd={isStaff(user.role)} />
        </div>

        <div className="card">
          <p className="label">{nl.dashboard.cards.sessions}</p>
          <EmptyState className="mt-6" hint={nl.common.comingSoon} />
        </div>
      </div>
    </>
  )
}
