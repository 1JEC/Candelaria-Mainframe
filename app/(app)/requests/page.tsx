import Link from 'next/link'

import { NewRequestForm } from '@/components/requests/NewRequestForm'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pill } from '@/components/ui/Pill'
import type { RequestStatus } from '@/db/schema'
import { formatDate, formatNumber } from '@/lib/format'
import { requestPriorityMeta, requestStatusMeta } from '@/lib/labels'
import { nl } from '@/lib/nl'
import { canMutate } from '@/lib/rbac'
import { listRequests } from '@/lib/queries/requests'
import { requireModule } from '@/lib/session'

export const dynamic = 'force-dynamic'

const COLUMNS: RequestStatus[] = [
  'nieuw',
  'in_behandeling',
  'afgerond',
  'afgewezen',
]

export default async function RequestsPage() {
  const user = await requireModule('requests')
  const rows = await listRequests(user.orgId)

  return (
    <>
      <PageHeader
        title={nl.modules.requests.title}
        subtitle={nl.modules.requests.subtitle}
      />

      {canMutate(user.role) && (
        <div className="mt-8">
          <NewRequestForm />
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState className="mt-8" />
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((status) => {
            const meta = requestStatusMeta[status]
            const group = rows.filter((r) => r.status === status)

            return (
              <section key={status}>
                <div className="flex items-center justify-between">
                  <h2 className="label">{meta.label}</h2>
                  <span className="font-mono text-caption text-muted">
                    {formatNumber(group.length)}
                  </span>
                </div>

                <div className="mt-3 space-y-3">
                  {group.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-caption text-muted">
                      {nl.requests.boardEmpty}
                    </p>
                  ) : (
                    group.map((request) => {
                      const priority = requestPriorityMeta[request.priority]
                      return (
                        <Link
                          key={request.id}
                          href={`/requests/${request.id}`}
                          className="card block transition-colors duration-fast hover:border-flame-line"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-body text-foreground">
                              {request.title}
                            </h3>
                            <Pill tone={priority.tone}>{priority.label}</Pill>
                          </div>
                          <p className="mt-2 line-clamp-2 text-caption text-muted">
                            {request.description}
                          </p>
                          <p className="mt-4 font-mono text-caption text-muted">
                            {formatDate(request.createdAt)}
                            {request.authorName
                              ? ` · ${request.authorName}`
                              : ''}
                            {request.commentCount > 0
                              ? ` · ${formatNumber(request.commentCount)} ✎`
                              : ''}
                          </p>
                        </Link>
                      )
                    })
                  )}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </>
  )
}
