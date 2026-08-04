'use client'

import { useEffect, useState } from 'react'

import { fetchLiveVisitorCount } from '@/app/(app)/analytics/actions'
import { formatNumber } from '@/lib/format'
import { nl } from '@/lib/nl'

const POLL_MS = 30_000

export const LiveVisitors = ({ initial }: { initial: number }) => {
  const [count, setCount] = useState(initial)

  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      try {
        const n = await fetchLiveVisitorCount()
        if (!cancelled) setCount(n)
      } catch {
        // Transient failure — keep showing the last known count.
      }
    }
    const interval = setInterval(tick, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="card">
      <div className="flex items-center gap-2">
        <span aria-hidden className="h-2 w-2 rounded-full bg-moss" />
        <p className="label">{nl.analytics.live.title}</p>
      </div>
      <p className="display mt-4 text-kpi text-foreground">{formatNumber(count)}</p>
      <p className="mt-2 text-caption text-muted">{nl.analytics.live.subtitle}</p>
    </div>
  )
}
