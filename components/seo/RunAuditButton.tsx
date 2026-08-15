'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { runSeoAuditAction } from '@/app/(app)/seo/actions'

export function RunAuditButton({ hasWebsite }: { hasWebsite: boolean }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function run() {
    setError(null)
    startTransition(async () => {
      try {
        await runSeoAuditAction()
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Audit mislukt.')
      }
    })
  }

  return (
    <div>
      <button type="button" onClick={run} disabled={pending || !hasWebsite} className="btn-primary disabled:opacity-50">
        {pending ? 'Bezig met auditen…' : 'Audit uitvoeren'}
      </button>
      {error && <p className="mt-2 text-caption text-flame">{error}</p>}
    </div>
  )
}
