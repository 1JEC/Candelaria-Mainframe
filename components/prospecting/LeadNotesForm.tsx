'use client'

import { useState, useTransition } from 'react'

import { updateLeadNotesAction } from '@/app/(app)/prospecting/actions'
import { nl } from '@/lib/nl'

export function LeadNotesForm({ leadId, initialNotes }: { leadId: string; initialNotes: string | null }) {
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  function save() {
    setSaved(false)
    startTransition(async () => {
      await updateLeadNotesAction({ leadId, notes })
      setSaved(true)
    })
  }

  return (
    <div className="space-y-2">
      <textarea
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value)
          setSaved(false)
        }}
        rows={4}
        className="field"
      />
      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={pending} className="btn-ghost disabled:opacity-50">
          {pending ? nl.common.loading : nl.common.save}
        </button>
        {saved && <span className="text-caption text-moss">Opgeslagen.</span>}
      </div>
    </div>
  )
}
