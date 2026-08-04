import Link from 'next/link'
import { notFound } from 'next/navigation'

import { RequestThread } from '@/components/requests/RequestThread'
import { StatusControl } from '@/components/requests/StatusControl'
import { Pill } from '@/components/ui/Pill'
import { formatDateTime } from '@/lib/format'
import { requestPriorityMeta, requestStatusMeta } from '@/lib/labels'
import { nl } from '@/lib/nl'
import { canMutate, isStaff } from '@/lib/rbac'
import { getRequest } from '@/lib/queries/requests'
import { requireModule } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>
}) {
  const user = await requireModule('requests')
  const { requestId } = await params

  const request = await getRequest(user.orgId, requestId)
  if (!request) notFound()

  const status = requestStatusMeta[request.status]
  const priority = requestPriorityMeta[request.priority]

  return (
    <div className="space-y-6">
      <Link
        href="/requests"
        className="inline-block text-body-sm text-muted transition-colors duration-fast hover:text-foreground"
      >
        ← {nl.requests.detail.back}
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="display text-h1 text-foreground">{request.title}</h1>
          <p className="mt-2 text-body-sm text-muted">
            {nl.requests.detail.submittedBy} {request.authorName ?? '—'} ·{' '}
            {nl.requests.detail.submittedOn}{' '}
            {formatDateTime(request.createdAt)}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Pill tone={priority.tone}>{priority.label}</Pill>
          <Pill tone={status.tone} dot>
            {status.label}
          </Pill>
        </div>
      </header>

      <section className="card">
        <p className="whitespace-pre-wrap text-body text-foreground">
          {request.description}
        </p>
      </section>

      {isStaff(user.role) && (
        <section className="card">
          <StatusControl requestId={request.id} status={request.status} />
        </section>
      )}

      <RequestThread
        requestId={request.id}
        comments={request.comments}
        canComment={canMutate(user.role)}
      />
    </div>
  )
}
