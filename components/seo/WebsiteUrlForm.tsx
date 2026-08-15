'use client'

import { useState, useTransition } from 'react'

import { setWebsiteUrlAction } from '@/app/(app)/seo/actions'

export function WebsiteUrlForm({ initialUrl }: { initialUrl: string | null }) {
  const [url, setUrl] = useState(initialUrl ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function save() {
    setError(null)
    startTransition(async () => {
      try {
        await setWebsiteUrlAction({ websiteUrl: url })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ongeldige URL.')
      }
    })
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[240px]">
        <label className="label">Website-URL</label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://voorbeeld.nl"
          className="field mt-2"
        />
      </div>
      <button type="button" onClick={save} disabled={pending} className="btn-ghost disabled:opacity-50">
        {pending ? 'Bezig…' : 'Opslaan'}
      </button>
      {error && <p className="w-full text-caption text-flame">{error}</p>}
    </div>
  )
}
