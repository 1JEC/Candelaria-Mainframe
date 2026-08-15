'use client'

import { useState, useTransition } from 'react'

import { updateAgentAction } from '@/app/(app)/agents/actions'
import { agentStatusMeta } from '@/lib/labels'
import { nl } from '@/lib/nl'
import type { AgentStatus } from '@/db/schema'

const STATUSES: AgentStatus[] = ['active', 'paused', 'error']
const t = nl.agents.edit

export const EditAgentForm = ({
  agentId,
  initialName,
  initialModel,
  initialStatus,
}: {
  agentId: string
  initialName: string
  initialModel: string | null
  initialStatus: AgentStatus
}) => {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(initialName)
  const [model, setModel] = useState(initialModel ?? '')
  const [status, setStatus] = useState<AgentStatus>(initialStatus)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost">
        {t.title}
      </button>
    )
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError(t.errors.nameRequired)
    setError(null)
    setSaved(false)
    startTransition(async () => {
      try {
        await updateAgentAction({ agentId, name, model: model || undefined, status })
        setSaved(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : t.errors.generic)
      }
    })
  }

  return (
    <form onSubmit={submit} className="card flex flex-wrap items-end gap-3">
      <div>
        <label className="label">{t.nameLabel}</label>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} className="field mt-2 max-w-xs" />
      </div>
      <div>
        <label className="label">{t.modelLabel}</label>
        <input value={model} onChange={(e) => setModel(e.target.value)} maxLength={200} className="field mt-2 max-w-xs" />
      </div>
      <div>
        <label className="label">{t.statusLabel}</label>
        <select value={status} onChange={(e) => setStatus(e.target.value as AgentStatus)} className="field mt-2 max-w-[10rem]">
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {agentStatusMeta[s].label}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? t.saving : saved ? t.saved : t.save}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
        {nl.common.cancel}
      </button>
      {error && (
        <p role="alert" className="w-full text-body-sm text-flame">
          {error}
        </p>
      )}
    </form>
  )
}
