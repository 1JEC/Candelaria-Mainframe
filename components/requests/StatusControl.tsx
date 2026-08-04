'use client'

import { useState, useTransition } from 'react'

import { changeRequestStatus } from '@/app/(app)/requests/actions'
import type { RequestStatus } from '@/db/schema'
import { requestStatusMeta } from '@/lib/labels'
import { nl } from '@/lib/nl'

const STATUSES: RequestStatus[] = [
  'nieuw',
  'in_behandeling',
  'afgerond',
  'afgewezen',
]

/** Admin-only. Each change emails the requester via the server action. */
export const StatusControl = ({
  requestId,
  status,
}: {
  requestId: string
  status: RequestStatus
}) => {
  const [current, setCurrent] = useState(status)
  const [error, setError] = useState(false)
  const [pending, startTransition] = useTransition()

  const move = (next: RequestStatus) => {
    if (next === current) return
    const previous = current
    setCurrent(next)
    setError(false)

    startTransition(async () => {
      try {
        await changeRequestStatus({ requestId, status: next })
      } catch {
        setCurrent(previous)
        setError(true)
      }
    })
  }

  return (
    <div className={pending ? 'opacity-60' : ''}>
      <p className="label">{nl.requests.detail.changeStatus}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {STATUSES.map((s) => {
          const meta = requestStatusMeta[s]
          return (
            <button
              key={s}
              type="button"
              disabled={pending}
              onClick={() => move(s)}
              aria-pressed={s === current}
              className={`rounded-full border px-4 py-2 text-body-sm transition-colors duration-fast disabled:opacity-50 ${
                s === current
                  ? 'border-flame-line bg-flame-soft text-flame'
                  : 'border-border text-muted hover:text-foreground'
              }`}
            >
              {meta.label}
            </button>
          )
        })}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-caption text-flame">
          {nl.requests.errors.generic}
        </p>
      )}
    </div>
  )
}
