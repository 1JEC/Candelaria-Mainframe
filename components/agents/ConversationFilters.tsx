'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

import { nl } from '@/lib/nl'

/**
 * Filters live in the URL, not in component state: the table is a server
 * component, every filter combination is linkable, and back/forward work.
 */
export const ConversationFilters = ({
  agents,
  topics,
}: {
  agents: { id: string; name: string }[]
  topics: string[]
}) => {
  const router = useRouter()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    // Any filter change invalidates the current page and the open transcript.
    next.delete('page')
    next.delete('c')
    startTransition(() => router.push(`/agents/conversations?${next}`))
  }

  const value = (key: string) => params.get(key) ?? ''
  const hasFilters = ['q', 'agentId', 'outcome', 'topic', 'from', 'to'].some(
    (k) => params.get(k),
  )

  return (
    <div
      className={`card transition-opacity duration-fast ${pending ? 'opacity-60' : ''}`}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <label className="xl:col-span-2">
          <span className="label">{nl.agents.log.search}</span>
          <input
            type="search"
            defaultValue={value('q')}
            onBlur={(e) => update('q', e.target.value.trim())}
            onKeyDown={(e) => {
              if (e.key === 'Enter') update('q', e.currentTarget.value.trim())
            }}
            placeholder={nl.agents.log.search}
            className="field mt-2"
          />
        </label>

        <label>
          <span className="label">{nl.agents.log.filterAgent}</span>
          <select
            value={value('agentId')}
            onChange={(e) => update('agentId', e.target.value)}
            className="field mt-2"
          >
            <option value="">{nl.agents.log.filterAll}</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="label">{nl.agents.log.filterOutcome}</span>
          <select
            value={value('outcome')}
            onChange={(e) => update('outcome', e.target.value)}
            className="field mt-2"
          >
            <option value="">{nl.agents.log.filterAll}</option>
            <option value="resolved">{nl.agents.outcome.resolved}</option>
            <option value="escalated">{nl.agents.outcome.escalated}</option>
            <option value="abandoned">{nl.agents.outcome.abandoned}</option>
          </select>
        </label>

        <label>
          <span className="label">{nl.agents.log.filterTopic}</span>
          <select
            value={value('topic')}
            onChange={(e) => update('topic', e.target.value)}
            className="field mt-2"
          >
            <option value="">{nl.agents.log.filterAll}</option>
            {topics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="label">{nl.agents.log.filterFrom}</span>
            <input
              type="date"
              value={value('from')}
              onChange={(e) => update('from', e.target.value)}
              className="field mt-2 [color-scheme:dark]"
            />
          </label>
          <label>
            <span className="label">{nl.agents.log.filterTo}</span>
            <input
              type="date"
              value={value('to')}
              onChange={(e) => update('to', e.target.value)}
              className="field mt-2 [color-scheme:dark]"
            />
          </label>
        </div>
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={() =>
            startTransition(() => router.push('/agents/conversations'))
          }
          className="mt-4 text-body-sm text-flame transition-colors duration-fast hover:text-flame-hover"
        >
          {nl.agents.log.reset}
        </button>
      )}
    </div>
  )
}
