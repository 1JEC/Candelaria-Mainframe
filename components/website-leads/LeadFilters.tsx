'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

import type { LeadStatus } from '@/db/schema'
import { nl } from '@/lib/nl'

const STATUSES: LeadStatus[] = ['new', 'contacted', 'booked', 'won', 'lost']
const PERIODS = ['today', '7d', '30d', 'all'] as const

/** Filters live in the URL — same pattern as ConversationFilters. */
export const LeadFilters = () => {
  const router = useRouter()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    startTransition(() => router.push(`/website-leads?${next}`))
  }

  const value = (key: string) => params.get(key) ?? ''

  return (
    <div className={`card transition-opacity duration-fast ${pending ? 'opacity-60' : ''}`}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="label">{nl.websiteLeads.filterStatus}</span>
          <select
            value={value('status')}
            onChange={(e) => update('status', e.target.value)}
            className="field mt-2"
          >
            <option value="">{nl.websiteLeads.filterAll}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {nl.websiteLeads.status[s]}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="label">{nl.websiteLeads.filterPeriod}</span>
          <select
            value={value('period')}
            onChange={(e) => update('period', e.target.value)}
            className="field mt-2"
          >
            <option value="">{nl.websiteLeads.filterAll}</option>
            {PERIODS.map((p) => (
              <option key={p} value={p}>
                {p === 'today'
                  ? nl.websiteLeads.periodToday
                  : p === '7d'
                    ? nl.websiteLeads.period7d
                    : p === '30d'
                      ? nl.websiteLeads.period30d
                      : nl.websiteLeads.periodAll}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
