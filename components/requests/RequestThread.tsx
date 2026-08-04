'use client'

import { useState, useTransition } from 'react'

import { addComment } from '@/app/(app)/requests/actions'
import { formatDateTime } from '@/lib/format'
import { nl } from '@/lib/nl'

export type ThreadComment = {
  id: string
  body: string
  createdAt: Date
  authorName: string | null
  authorRole: string | null
}

export const RequestThread = ({
  requestId,
  comments,
  canComment,
}: {
  requestId: string
  comments: ThreadComment[]
  canComment: boolean
}) => {
  const [body, setBody] = useState('')
  const [error, setError] = useState(false)
  const [pending, startTransition] = useTransition()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim()) return

    setError(false)
    startTransition(async () => {
      try {
        await addComment({ requestId, body })
        setBody('')
      } catch {
        setError(true)
      }
    })
  }

  return (
    <section className="card">
      <h2 className="label">{nl.requests.thread.title}</h2>

      {comments.length === 0 ? (
        <p className="mt-5 text-body-sm text-muted">
          {nl.requests.thread.empty}
        </p>
      ) : (
        <ol className="mt-5 space-y-4">
          {comments.map((comment) => {
            const fromAgency = comment.authorRole === 'admin'
            return (
              <li
                key={comment.id}
                className={`rounded-lg px-4 py-3 ${
                  fromAgency
                    ? 'border border-flame-line bg-flame-soft'
                    : 'bg-surface-raised'
                }`}
              >
                <p className="font-mono text-label uppercase tracking-label text-muted">
                  {comment.authorName ?? '—'} ·{' '}
                  {formatDateTime(comment.createdAt)}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-body-sm text-foreground">
                  {comment.body}
                </p>
              </li>
            )
          })}
        </ol>
      )}

      {canComment && (
        <form onSubmit={submit} className="mt-6">
          <label>
            <span className="sr-only">{nl.requests.thread.placeholder}</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              maxLength={5000}
              placeholder={nl.requests.thread.placeholder}
              className="field resize-y"
            />
          </label>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="submit"
              disabled={pending || !body.trim()}
              className="btn-primary disabled:opacity-50"
            >
              {pending ? nl.requests.thread.sending : nl.requests.thread.send}
            </button>
            {error && (
              <p role="alert" className="text-body-sm text-flame">
                {nl.requests.errors.generic}
              </p>
            )}
          </div>
        </form>
      )}
    </section>
  )
}
