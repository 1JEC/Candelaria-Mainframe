'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

import type { Period } from '@/lib/period'
import { nl } from '@/lib/nl'

const PERIODS: Period[] = ['today', '7d', '30d', 'all']

const LABEL_KEY: Record<Period, keyof typeof nl.analytics.period> = {
  today: 'today',
  '7d': 'd7',
  '30d': 'd30',
  all: 'all',
}


export const PeriodSelector = ({ current }: { current: Period }) => {
  const router = useRouter()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  const select = (period: Period) => {
    const next = new URLSearchParams(params.toString())
    next.set('period', period)
    startTransition(() => router.push(`/analytics?${next}`))
  }

  return (
    <div className={`inline-flex gap-1 rounded-full border border-border p-1 ${pending ? 'opacity-60' : ''}`}>
      {PERIODS.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => select(p)}
          aria-pressed={p === current}
          className={`rounded-full px-4 py-2 text-body-sm transition-colors duration-fast ${
            p === current
              ? 'bg-primary text-primary-foreground'
              : 'text-muted hover:text-foreground'
          }`}
        >
          {nl.analytics.period[LABEL_KEY[p]]}
        </button>
      ))}
    </div>
  )
}
