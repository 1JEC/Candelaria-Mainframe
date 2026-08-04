import { nl } from '@/lib/nl'

/**
 * The only way to render "no data yet". Never substitute placeholder numbers
 * or invented sample rows for a missing dataset.
 */
export const EmptyState = ({
  hint = nl.common.emptyHint,
  className = '',
}: {
  hint?: string
  className?: string
}) => (
  <div
    className={`flex min-h-[180px] flex-col items-center justify-center rounded-md border border-dashed border-border text-center ${className}`}
  >
    <p className="text-body-sm text-foreground">{nl.common.empty}</p>
    <p className="mt-1 text-caption text-muted">{hint}</p>
  </div>
)
