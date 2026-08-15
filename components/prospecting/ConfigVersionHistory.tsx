'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { restoreConfigVersionAction } from '@/app/(app)/prospecting/actions'
import { nl } from '@/lib/nl'

interface VersionRow {
  version: number
  isActive: boolean | null
  createdAt: string | Date | null
}

export function ConfigVersionHistory({ configKey, versions }: { configKey: string; versions: VersionRow[] }) {
  const [restoring, setRestoring] = useState<number | null>(null)
  const router = useRouter()

  async function restore(version: number) {
    setRestoring(version)
    try {
      await restoreConfigVersionAction(configKey, version)
      router.refresh()
    } finally {
      setRestoring(null)
    }
  }

  if (versions.length <= 1) return null

  return (
    <div className="card">
      <p className="label">
        {nl.prospecting.settings.versionHistory} — {configKey}
      </p>
      <div className="mt-3 space-y-1.5">
        {versions.map((v) => (
          <div key={v.version} className="flex items-center justify-between text-body-sm">
            <span className={v.isActive ? 'text-foreground' : 'text-muted'}>
              v{v.version} {v.isActive && `(${nl.prospecting.settings.active})`} —{' '}
              {v.createdAt ? new Date(v.createdAt).toLocaleString('nl-NL') : '—'}
            </span>
            {!v.isActive && (
              <button
                type="button"
                onClick={() => restore(v.version)}
                disabled={restoring === v.version}
                className="text-caption text-flame hover:underline disabled:opacity-50"
              >
                {restoring === v.version ? nl.prospecting.settings.restoring : nl.prospecting.settings.restore}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
