'use client'

import { useState, useTransition } from 'react'

import { changeLeadStatus } from '@/app/(app)/website-leads/actions'
import type { LeadStatus } from '@/db/schema'
import { leadStatusMeta } from '@/lib/labels'
import { nl } from '@/lib/nl'

const STATUSES: LeadStatus[] = ['new', 'contacted', 'booked', 'won', 'lost']

export const LeadStatusControl = ({
  leadId,
  status,
}: {
  leadId: string
  status: LeadStatus
}) => {
  const [current, setCurrent] = useState(status)
  const [error, setError] = useState(false)
  const [pending, startTransition] = useTransition()

  const move = (next: LeadStatus) => {
    if (next === current) return
    const previous = current
    setCurrent(next)
    setError(false)

    startTransition(async () => {
      try {
        await changeLeadStatus({ leadId, status: next })
      } catch {
        setCurrent(previous)
        setError(true)
      }
    })
  }

  return (
    <div className={pending ? 'opacity-60' : ''}>
      <p className="label">{nl.websiteLeads.detail.changeStatus}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {STATUSES.map((s) => {
          const meta = leadStatusMeta[s]
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
