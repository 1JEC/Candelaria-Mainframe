'use client'

import { useState, useTransition } from 'react'

import { updateOrgName } from '@/app/(app)/settings/actions'
import { orgPlanLabel } from '@/lib/labels'
import { nl } from '@/lib/nl'

const t = nl.settings.organization

export const OrgSettingsForm = ({
  initialName,
  plan,
  canMutate,
}: {
  initialName: string
  plan: 'starter' | 'growth' | 'scale'
  canMutate: boolean
}) => {
  const [name, setName] = useState(initialName)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError(t.errors.nameRequired)
    setError(null)
    setSaved(false)
    startTransition(async () => {
      try {
        await updateOrgName({ name })
        setSaved(true)
      } catch {
        setError(t.errors.generic)
      }
    })
  }

  return (
    <div className="card">
      <h2 className="label">{t.title}</h2>
      <form onSubmit={submit} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <label className="label">{t.nameLabel}</label>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setSaved(false)
            }}
            maxLength={200}
            disabled={!canMutate}
            className="field mt-2 disabled:opacity-60"
          />
        </div>
        <div>
          <p className="label">{t.planLabel}</p>
          <p className="mt-2 text-body-sm text-foreground">{orgPlanLabel[plan]}</p>
        </div>
        {canMutate && (
          <button type="submit" disabled={pending || name === initialName} className="btn-ghost disabled:opacity-50">
            {pending ? t.saving : saved ? t.saved : t.save}
          </button>
        )}
        {error && <p className="w-full text-caption text-flame">{error}</p>}
      </form>
    </div>
  )
}
