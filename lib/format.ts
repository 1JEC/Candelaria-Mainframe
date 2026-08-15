/** Dutch-locale formatters. Every number and date in the UI goes through here. */

const LOCALE = 'nl-NL'

export const formatNumber = (n: number) =>
  new Intl.NumberFormat(LOCALE).format(n)

export const formatPercent = (fraction: number, digits = 0) =>
  new Intl.NumberFormat(LOCALE, {
    style: 'percent',
    maximumFractionDigits: digits,
  }).format(fraction)

export const formatDate = (d: Date | string) =>
  new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(d))

export const formatDateTime = (d: Date | string) =>
  new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(d))

export const formatTime = (d: Date | string) =>
  new Intl.DateTimeFormat(LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(d))

/** Chart axis label for a `YYYY-MM-DD` bucket. */
export const formatBucket = (iso: string, bucket: 'day' | 'week' | 'month') =>
  new Intl.DateTimeFormat(LOCALE, {
    day: bucket === 'month' ? undefined : 'numeric',
    month: 'short',
    year: bucket === 'month' ? 'numeric' : undefined,
  }).format(new Date(`${iso}T00:00:00`))

/** "4,2 MB" — binary units (KB=1024 bytes), matching how file sizes are usually shown. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }
  return `${new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 }).format(value)} ${units[unitIndex]}`
}

/** "4 min 20 s" — returns null so callers render an em dash, not a fake zero. */
export function formatDuration(seconds: number | null): string | null {
  if (seconds === null || Number.isNaN(seconds)) return null
  const total = Math.round(seconds)
  const min = Math.floor(total / 60)
  const sec = total % 60
  if (min === 0) return `${sec} s`
  if (sec === 0) return `${min} min`
  return `${min} min ${sec} s`
}

/** Compact token counts: 1.2k / 3,4 mln. */
export function formatCompact(n: number): string {
  return new Intl.NumberFormat(LOCALE, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n)
}
