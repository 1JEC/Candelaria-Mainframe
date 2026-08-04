export type Period = 'today' | '7d' | '30d' | 'all'

const DAY_MS = 24 * 60 * 60 * 1000

/** Start of the given period, or null for 'all' (no lower bound). */
export function periodStart(period: Period, now: Date = new Date()): Date | null {
  switch (period) {
    case 'today': {
      const start = new Date(now)
      start.setHours(0, 0, 0, 0)
      return start
    }
    case '7d':
      return new Date(now.getTime() - 7 * DAY_MS)
    case '30d':
      return new Date(now.getTime() - 30 * DAY_MS)
    case 'all':
      return null
  }
}

export function isPeriod(value: string | undefined): value is Period {
  return value === 'today' || value === '7d' || value === '30d' || value === 'all'
}
