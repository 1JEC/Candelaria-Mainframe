'use client'

import { useState, useTransition } from 'react'

import { rateConversation } from '@/app/(app)/agents/actions'
import { nl } from '@/lib/nl'

const ThumbUp = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden fill="currentColor">
    <path d="M2 20h3V9H2v11Zm20-9.5c0-.83-.67-1.5-1.5-1.5h-5.19l.78-3.76.02-.26c0-.31-.13-.59-.33-.79L14.9 3 8.6 9.3c-.28.28-.44.66-.44 1.08V19c0 .83.67 1.5 1.5 1.5h7.5c.62 0 1.15-.37 1.38-.91l2.4-5.6c.07-.18.11-.37.11-.57V10.5Z" />
  </svg>
)

const ThumbDown = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4 rotate-180"
    aria-hidden
    fill="currentColor"
  >
    <path d="M2 20h3V9H2v11Zm20-9.5c0-.83-.67-1.5-1.5-1.5h-5.19l.78-3.76.02-.26c0-.31-.13-.59-.33-.79L14.9 3 8.6 9.3c-.28.28-.44.66-.44 1.08V19c0 .83.67 1.5 1.5 1.5h7.5c.62 0 1.15-.37 1.38-.91l2.4-5.6c.07-.18.11-.37.11-.57V10.5Z" />
  </svg>
)

/**
 * Thumbs up/down on a conversation. Optimistic locally, but the value shown
 * after a refresh always comes from the database — the action writes both
 * `conversations.rating` and an `audit_log` row.
 */
export const RatingControl = ({
  conversationId,
  rating,
  canRate,
}: {
  conversationId: string
  rating: number | null
  canRate: boolean
}) => {
  const [current, setCurrent] = useState(rating)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(false)
  const [pending, startTransition] = useTransition()

  if (!canRate) return null

  const submit = (value: 1 | -1) => {
    const next = current === value ? 0 : value
    const previous = current
    setCurrent(next === 0 ? null : next)
    setError(false)

    startTransition(async () => {
      try {
        await rateConversation({ conversationId, rating: next })
        setSaved(true)
      } catch {
        setCurrent(previous)
        setError(true)
      }
    })
  }

  const buttonClass = (active: boolean) =>
    `inline-flex items-center gap-2 rounded-full border px-3 py-2 text-body-sm transition-colors duration-fast disabled:opacity-50 ${
      active
        ? 'border-flame-line bg-flame-soft text-flame'
        : 'border-border text-muted hover:text-foreground'
    }`

  return (
    <div className="border-t border-border pt-5">
      <p className="text-body-sm text-muted">{nl.agents.transcript.ratingLabel}</p>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => submit(1)}
          aria-pressed={current === 1}
          className={buttonClass(current === 1)}
        >
          <ThumbUp />
          {nl.agents.transcript.ratingUp}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => submit(-1)}
          aria-pressed={current === -1}
          className={buttonClass(current === -1)}
        >
          <ThumbDown />
          {nl.agents.transcript.ratingDown}
        </button>
      </div>

      {saved && !error && (
        <p role="status" className="mt-3 text-caption text-moss">
          {nl.agents.transcript.ratingSaved}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-caption text-flame">
          {nl.requests.errors.generic}
        </p>
      )}
    </div>
  )
}
