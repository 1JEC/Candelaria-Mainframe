import Link from 'next/link'

import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pill } from '@/components/ui/Pill'
import { formatDateTime } from '@/lib/format'
import { channelLabel, outcomeMeta, requestPriorityMeta, requestStatusMeta } from '@/lib/labels'
import { nl } from '@/lib/nl'
import { listRequests } from '@/lib/queries/requests'
import { listConversations } from '@/lib/queries/agents'
import { requireModule } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function LeadsPage() {
  const user = await requireModule('leads')

  const [requests, conversations] = await Promise.all([
    listRequests(user.orgId),
    listConversations(user.orgId, { page: 1 }),
  ])

  const recentRequests = requests.slice(0, 10)
  const recentConversations = conversations.rows.slice(0, 10)

  return (
    <>
      <PageHeader title={nl.modules.leads.title} subtitle={nl.modules.leads.subtitle} />

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="card">
          <div className="flex items-center justify-between">
            <p className="label">Aanvragen</p>
            <Link href="/requests" className="text-caption text-flame hover:underline">
              Alle aanvragen →
            </Link>
          </div>
          {recentRequests.length === 0 ? (
            <EmptyState className="mt-4" />
          ) : (
            <div className="mt-4 space-y-3">
              {recentRequests.map((r) => {
                const statusMeta = requestStatusMeta[r.status]
                const priorityMeta = requestPriorityMeta[r.priority]
                return (
                  <Link
                    key={r.id}
                    href={`/requests/${r.id}`}
                    className="block border-b border-border pb-3 last:border-0 transition-colors duration-fast hover:text-flame"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-body-sm text-foreground">{r.title}</p>
                      <div className="flex shrink-0 gap-1.5">
                        <Pill tone={priorityMeta.tone}>{priorityMeta.label}</Pill>
                        <Pill tone={statusMeta.tone}>{statusMeta.label}</Pill>
                      </div>
                    </div>
                    <p className="mt-1 text-caption text-muted">
                      {r.authorName || 'Onbekend'} · {formatDateTime(r.createdAt)}
                    </p>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        <section className="card">
          <div className="flex items-center justify-between">
            <p className="label">Gesprekken</p>
            <Link href="/agents/conversations" className="text-caption text-flame hover:underline">
              Alle gesprekken →
            </Link>
          </div>
          {recentConversations.length === 0 ? (
            <EmptyState className="mt-4" />
          ) : (
            <div className="mt-4 space-y-3">
              {recentConversations.map((c) => {
                const meta = outcomeMeta[c.outcome]
                return (
                  <div key={c.id} className="border-b border-border pb-3 last:border-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-body-sm text-foreground">{c.topic || 'Zonder onderwerp'}</p>
                      <Pill tone={meta.tone}>{meta.label}</Pill>
                    </div>
                    <p className="mt-1 text-caption text-muted">
                      {c.agentName} · {channelLabel(c.channel)} · {formatDateTime(c.startedAt)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </>
  )
}
