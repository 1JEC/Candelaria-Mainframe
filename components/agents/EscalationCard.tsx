'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'

import { updateEscalation } from '@/app/(app)/agents/actions'
import { Pill } from '@/components/ui/Pill'
import type { EscalationStatus } from '@/db/schema'
import { formatDateTime } from '@/lib/format'
import { channelLabel, escalationStatusMeta, sentimentMeta } from '@/lib/labels'
import { nl } from '@/lib/nl'

export type EscalationRow = {
  id: string
  status: EscalationStatus
  assignedNote: string | null
  resolvedAt: Date | null
  createdAt: Date
  conversationId: string
  topic: string | null
  channel: string
  sentiment: 'positive' | 'neutral' | 'negative'
  agentName: string
}

/**
 * The status flow is open → in behandeling → afgehandeld, with a reopen escape
 * hatch. The note travels with the status change so the two can never drift.
 */
export const EscalationCard = ({
  escalation,
  canMutate,
}: {
  escalation: EscalationRow
  canMutate: boolean
}) => {
  const [note, setNote] = useState(escalation.assignedNote ?? '')
  const [error, setError] = useState(false)
  const [pending, startTransition] = useTransition()

  const meta = escalationStatusMeta[escalation.status]
  const sentiment = sentimentMeta[escalation.sentiment]

  const move = (status: EscalationStatus) => {
    setError(false)
    startTransition(async () => {
      try {
        await updateEscalation({ escalationId: escalation.id, status, note })
      } catch {
        setError(true)
      }
    })
  }

  const nextActions: { status: EscalationStatus; label: string }[] =
    escalation.status === 'open'
      ? [{ status: 'in_progress', label: nl.agents.escalations.markInProgress }]
      : escalation.status === 'in_progress'
        ? [{ status: 'done', label: nl.agents.escalations.markDone }]
        : [{ status: 'open', label: nl.agents.escalations.reopen }]

  return (
    <article className={`card ${pending ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-h3 text-foreground">{escalation.topic ?? '—'}</h3>
          <p className="mt-1 text-caption text-muted">
            {escalation.agentName} · {channelLabel(escalation.channel)} ·{' '}
            {formatDateTime(escalation.createdAt)}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Pill tone={sentiment.tone}>{sentiment.label}</Pill>
          <Pill tone={meta.tone} dot>
            {meta.label}
          </Pill>
        </div>
      </div>

      {escalation.resolvedAt && (
        <p className="mt-3 text-caption text-muted">
          {nl.agents.escalations.resolvedAt}{' '}
          {formatDateTime(escalation.resolvedAt)}
        </p>
      )}

      {canMutate ? (
        <label className="mt-4 block">
          <span className="label">{nl.agents.escalations.note}</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder={nl.agents.escalations.notePlaceholder}
            className="field mt-2 resize-y"
          />
        </label>
      ) : (
        escalation.assignedNote && (
          <p className="mt-4 text-body-sm text-muted">
            {escalation.assignedNote}
          </p>
        )
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href={`/agents/conversations?c=${escalation.conversationId}`}
          className="text-body-sm text-muted transition-colors duration-fast hover:text-foreground"
        >
          {nl.agents.escalations.viewConversation} →
        </Link>

        {canMutate && (
          <div className="ml-auto flex gap-2">
            {nextActions.map((action) => (
              <button
                key={action.status}
                type="button"
                disabled={pending}
                onClick={() => move(action.status)}
                className="rounded-full border border-border px-4 py-2 text-body-sm text-foreground transition-colors duration-fast hover:border-flame-line hover:text-flame disabled:opacity-50"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-caption text-flame">
          {nl.requests.errors.generic}
        </p>
      )}
    </article>
  )
}
