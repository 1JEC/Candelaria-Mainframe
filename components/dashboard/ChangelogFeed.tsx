'use client'

import { useState, useTransition } from 'react'

import { addChangelogEntry } from '@/app/(app)/dashboard/actions'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/format'
import { nl } from '@/lib/nl'

export type ChangelogItem = {
  id: string
  weekLabel: string
  entry: string
  createdAt: Date
}

/**
 * "Wat is er gebeurd" — the weekly record of delivered work. Read-only for
 * clients; only agency staff get the compose form.
 */
export const ChangelogFeed = ({
  entries,
  canAdd,
}: {
  entries: ChangelogItem[]
  canAdd: boolean
}) => {
  const [weekLabel, setWeekLabel] = useState('')
  const [entry, setEntry] = useState('')
  const [error, setError] = useState(false)
  const [pending, startTransition] = useTransition()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!weekLabel.trim() || !entry.trim()) return

    setError(false)
    startTransition(async () => {
      try {
        await addChangelogEntry({ weekLabel, entry })
        setWeekLabel('')
        setEntry('')
      } catch {
        setError(true)
      }
    })
  }

  return (
    <div className="card">
      <h2 className="label">{nl.changelog.title}</h2>

      {entries.length === 0 ? (
        <EmptyState className="mt-6" />
      ) : (
        <ol className="mt-6 space-y-5">
          {entries.map((item) => (
            <li key={item.id} className="flex gap-4">
              <div className="flex flex-col items-center pt-1">
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full bg-flame"
                />
                <span aria-hidden className="mt-1 w-px flex-1 bg-border" />
              </div>
              <div className="flex-1 pb-1">
                <p className="font-mono text-label uppercase tracking-label text-muted">
                  {item.weekLabel} · {formatDate(item.createdAt)}
                </p>
                <p className="mt-1.5 text-body-sm text-foreground">
                  {item.entry}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}

      {canAdd && (
        <form onSubmit={submit} className="mt-6 border-t border-border pt-6">
          <p className="label">{nl.changelog.addTitle}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[9rem,1fr]">
            <label>
              <span className="sr-only">{nl.changelog.week}</span>
              <input
                value={weekLabel}
                onChange={(e) => setWeekLabel(e.target.value)}
                maxLength={50}
                placeholder={nl.changelog.weekPlaceholder}
                className="field"
              />
            </label>
            <label>
              <span className="sr-only">{nl.changelog.entry}</span>
              <input
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                maxLength={1000}
                placeholder={nl.changelog.entryPlaceholder}
                className="field"
              />
            </label>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="submit"
              disabled={pending || !weekLabel.trim() || !entry.trim()}
              className="btn-primary disabled:opacity-50"
            >
              {pending ? nl.changelog.adding : nl.changelog.add}
            </button>
            {error && (
              <p role="alert" className="text-body-sm text-flame">
                {nl.requests.errors.generic}
              </p>
            )}
          </div>
        </form>
      )}
    </div>
  )
}
