'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { createRequest } from '@/app/(app)/requests/actions'
import type { RequestPriority } from '@/db/schema'
import { nl } from '@/lib/nl'

const PRIORITIES: RequestPriority[] = ['laag', 'normaal', 'hoog', 'urgent']

export const NewRequestForm = () => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<RequestPriority>('normaal')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const reset = () => {
    setTitle('')
    setDescription('')
    setPriority('normaal')
    setError(null)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) return setError(nl.requests.errors.titleRequired)
    if (!description.trim())
      return setError(nl.requests.errors.descriptionRequired)

    setError(null)
    startTransition(async () => {
      try {
        const { id } = await createRequest({ title, description, priority })
        reset()
        setOpen(false)
        router.push(`/requests/${id}`)
      } catch {
        setError(nl.requests.errors.generic)
      }
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-primary"
      >
        {nl.requests.newButton}
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="card w-full">
      <h2 className="label">{nl.requests.newTitle}</h2>

      <label className="mt-5 block">
        <span className="text-body-sm text-muted">{nl.requests.fieldTitle}</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder={nl.requests.fieldTitlePlaceholder}
          className="field mt-2"
        />
      </label>

      <label className="mt-4 block">
        <span className="text-body-sm text-muted">
          {nl.requests.fieldDescription}
        </span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          maxLength={5000}
          placeholder={nl.requests.fieldDescriptionPlaceholder}
          className="field mt-2 resize-y"
        />
      </label>

      <fieldset className="mt-4">
        <legend className="text-body-sm text-muted">
          {nl.requests.fieldPriority}
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {PRIORITIES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              aria-pressed={priority === p}
              className={`rounded-full border px-4 py-2 text-body-sm transition-colors duration-fast ${
                priority === p
                  ? 'border-flame-line bg-flame-soft text-flame'
                  : 'border-border text-muted hover:text-foreground'
              }`}
            >
              {nl.requests.priority[p]}
            </button>
          ))}
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="mt-4 text-body-sm text-flame">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? nl.requests.submitting : nl.requests.submit}
        </button>
        <button
          type="button"
          onClick={() => {
            reset()
            setOpen(false)
          }}
          className="btn-ghost"
        >
          {nl.common.cancel}
        </button>
      </div>
    </form>
  )
}
