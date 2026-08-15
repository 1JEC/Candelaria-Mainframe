'use client'

import { useState, useTransition } from 'react'

import { saveConfigAction } from '@/app/(app)/prospecting/actions'
import { nl } from '@/lib/nl'

interface ChecklistItem {
  key: string
  label: string
}

export function GoLiveChecklist({ items, initialChecked }: { items: readonly ChecklistItem[]; initialChecked: Record<string, boolean> }) {
  const [checked, setChecked] = useState(initialChecked)
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const allDone = items.every((i) => checked[i.key])

  function toggle(key: string) {
    const next = { ...checked, [key]: !checked[key] }
    setChecked(next)
    setSaved(false)
    startTransition(async () => {
      await saveConfigAction('golive_checklist', { items: next })
      setSaved(true)
    })
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <p className="label">{nl.prospecting.health.checklistTitle}</p>
        {saved && !pending && <span className="text-caption text-moss">Opgeslagen.</span>}
      </div>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <label key={item.key} className="flex items-start gap-3 border-b border-border py-2 last:border-0">
            <input type="checkbox" checked={Boolean(checked[item.key])} onChange={() => toggle(item.key)} className="mt-1" />
            <span className="text-body-sm text-foreground">{item.label}</span>
          </label>
        ))}
      </div>
      <p className={`mt-4 text-caption ${allDone ? 'text-moss' : 'text-muted'}`}>
        {allDone ? 'Alle punten afgevinkt — OUTBOUND_ENABLED kan gezet worden.' : 'OUTBOUND_ENABLED blijft vergrendeld tot elk punt is afgevinkt.'}
      </p>
    </div>
  )
}
