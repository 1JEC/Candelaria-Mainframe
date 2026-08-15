'use client'

import { useState, useTransition } from 'react'

import { createAgentAction } from '@/app/(app)/agents/actions'
import { agentTypeLabel } from '@/lib/labels'
import { nl } from '@/lib/nl'
import type { AgentType } from '@/db/schema'

const AGENT_TYPES: AgentType[] = ['chat', 'voice', 'email', 'internal']
const t = nl.agents.create

export const NewAgentForm = ({ onCreated }: { onCreated: () => void }) => {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<AgentType>('chat')
  const [model, setModel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError(t.errors.nameRequired)
    setError(null)
    startTransition(async () => {
      try {
        await createAgentAction({ name, type, model: model || undefined })
        setName('')
        setModel('')
        setType('chat')
        setOpen(false)
        onCreated()
      } catch (err) {
        setError(err instanceof Error ? err.message : t.errors.generic)
      }
    })
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-primary">
        {t.button}
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-3">
      <p className="text-caption text-muted">{t.hint}</p>
      <div className="flex flex-wrap items-start gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={200}
          placeholder={t.namePlaceholder}
          className="field max-w-xs"
          autoFocus
        />
        <select value={type} onChange={(e) => setType(e.target.value as AgentType)} className="field max-w-[10rem]">
          {AGENT_TYPES.map((v) => (
            <option key={v} value={v}>
              {agentTypeLabel[v]}
            </option>
          ))}
        </select>
        <input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          maxLength={200}
          placeholder={t.modelPlaceholder}
          className="field max-w-xs"
        />
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? t.creating : t.button}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setError(null)
          }}
          className="btn-ghost"
        >
          {nl.common.cancel}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-body-sm text-flame">
          {error}
        </p>
      )}
    </form>
  )
}
