'use client'

import { useState } from 'react'

import { runRetentionAction } from '@/app/(app)/prospecting/actions'
import { nl } from '@/lib/nl'

interface RetentionCounts {
  leadsPurged: number
  eventsPurged: number
  placesContentPurged: number
}

export function RetentionPanel({ preview }: { preview: RetentionCounts }) {
  const [result, setResult] = useState<RetentionCounts | null>(null)
  const [running, setRunning] = useState(false)
  const [confirming, setConfirming] = useState(false)

  async function run() {
    setRunning(true)
    try {
      const res = await runRetentionAction()
      setResult(res)
    } finally {
      setRunning(false)
      setConfirming(false)
    }
  }

  const counts = result ?? preview
  const nothingToDo = counts.leadsPurged === 0 && counts.eventsPurged === 0 && counts.placesContentPurged === 0

  return (
    <div className="card">
      <p className="label">{nl.prospecting.settings.retentionTitle}</p>
      <ul className="mt-3 space-y-1 text-body-sm text-foreground">
        <li>{counts.leadsPurged} onbenaderde lead(s) ouder dan de bewaartermijn</li>
        <li>{counts.eventsPurged} event(s) ouder dan 30 dagen</li>
        <li>{counts.placesContentPurged} Places-cache-item(s) ouder dan 30 dagen</li>
      </ul>
      {result && <p className="mt-2 text-caption text-moss">Uitgevoerd.</p>}
      {!confirming ? (
        <button type="button" onClick={() => setConfirming(true)} disabled={nothingToDo} className="btn-ghost mt-3 disabled:opacity-50">
          {nl.prospecting.settings.retentionRun}
        </button>
      ) : (
        <div className="mt-3 flex items-center gap-3">
          <span className="text-caption text-muted">{nl.prospecting.settings.retentionConfirm}</span>
          <button type="button" onClick={run} disabled={running} className="rounded-md bg-flame px-3 py-1.5 text-caption text-white disabled:opacity-50">
            {running ? nl.common.loading : 'Bevestigen'}
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="text-caption text-muted hover:underline">
            {nl.common.cancel}
          </button>
        </div>
      )}
    </div>
  )
}
