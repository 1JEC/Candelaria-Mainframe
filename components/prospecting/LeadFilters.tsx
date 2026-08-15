'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

import type { ProspectPriority } from '@/db/schema'
import { nl } from '@/lib/nl'

const PROSPECT_PRIORITIES: ProspectPriority[] = ['A', 'B', 'C']

export const LeadFilters = ({ sectors }: { sectors: string[] }) => {
  const router = useRouter()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    startTransition(() => router.push(`/prospecting/leads?${next}`))
  }

  const value = (key: string) => params.get(key) ?? ''
  const hasFilters = params.toString().length > 0

  return (
    <div className={`card transition-opacity duration-fast ${pending ? 'opacity-60' : ''}`}>
      <div className="grid gap-4 sm:grid-cols-4">
        <label>
          <span className="label">{nl.prospecting.leads.priority}</span>
          <select value={value('priority')} onChange={(e) => update('priority', e.target.value)} className="field mt-2">
            <option value="">{nl.prospecting.leads.allPriorities}</option>
            {PROSPECT_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="label">{nl.prospecting.leads.sector}</span>
          <select value={value('sector')} onChange={(e) => update('sector', e.target.value)} className="field mt-2">
            <option value="">{nl.prospecting.leads.allSectors}</option>
            {sectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="label">{nl.prospecting.leads.minScore}</span>
          <input
            type="number"
            min={0}
            max={100}
            value={value('minScore')}
            onChange={(e) => update('minScore', e.target.value)}
            className="field mt-2"
          />
        </label>

        <label className="flex items-end gap-2 pb-3">
          <input
            type="checkbox"
            checked={value('hasEmail') === '1'}
            onChange={(e) => update('hasEmail', e.target.checked ? '1' : '')}
          />
          <span className="text-body-sm text-foreground">{nl.prospecting.leads.onlyWithEmail}</span>
        </label>
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={() => startTransition(() => router.push('/prospecting/leads'))}
          className="mt-4 text-caption text-muted underline-offset-4 hover:text-foreground hover:underline"
        >
          {nl.prospecting.leads.clearFilters}
        </button>
      )}
    </div>
  )
}
