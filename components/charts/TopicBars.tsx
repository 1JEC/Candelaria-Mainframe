import { formatNumber } from '@/lib/format'

/**
 * Horizontal ranking of topics. Deliberately plain CSS rather than a chart
 * library: it is a list with a bar, and it stays readable at any width.
 */
export const TopicBars = ({
  topics,
}: {
  topics: { topic: string; count: number }[]
}) => {
  const max = Math.max(...topics.map((t) => t.count), 1)

  return (
    <ol className="space-y-3">
      {topics.map((t, i) => (
        <li key={t.topic}>
          <div className="flex items-baseline justify-between gap-3 text-body-sm">
            <span className="text-foreground">
              <span className="mr-2 font-mono text-caption text-muted">
                {String(i + 1).padStart(2, '0')}
              </span>
              {t.topic}
            </span>
            <span className="font-mono text-caption text-muted">
              {formatNumber(t.count)}
            </span>
          </div>
          <div className="mt-1.5 h-1 w-full rounded-full bg-surface-raised">
            <div
              className="h-1 rounded-full bg-flame"
              style={{ width: `${(t.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  )
}
