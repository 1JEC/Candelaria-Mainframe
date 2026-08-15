'use client'

import { useEffect, useRef, useState } from 'react'

import { startRunAction, cancelRunAction } from '@/app/(app)/prospecting/actions'
import { formatDuration } from '@/lib/format'
import { nl } from '@/lib/nl'

interface ProspectEvent {
  id: number
  code: string
  level: string
  messageNl: string
  ts: string
}

const POLL_INTERVAL_MS = 1500
const MAX_FEED_LINES = 500

const LEVEL_CLASS: Record<string, string> = {
  info: 'text-muted',
  warn: 'text-gold',
  error: 'text-flame',
}

export function ConsoleRunForm({
  sectors,
  cities,
  initialRunId,
  initialStatus,
  initialStartedAt,
}: {
  sectors: readonly string[]
  cities: readonly string[]
  initialRunId: string | null
  initialStatus: string | null
  initialStartedAt: Date | string | null
}) {
  const [city, setCity] = useState(cities[0] ?? '')
  const [selectedSectors, setSelectedSectors] = useState<string[]>([])
  const [limit, setLimit] = useState(25)
  const [runId, setRunId] = useState<string | null>(initialRunId)
  const [status, setStatus] = useState<string | null>(initialStatus)
  const [startedAt, setStartedAt] = useState<Date | null>(initialStartedAt ? new Date(initialStartedAt) : null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [events, setEvents] = useState<ProspectEvent[]>([])
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const cursorRef = useRef(0)
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const feedEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [events])

  useEffect(() => {
    if (initialRunId && initialStatus === 'running') poll(initialRunId)
    return () => {
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Ticks locally once a second — no need to round-trip to the server just
  // to advance a clock the client can compute from startedAt itself.
  useEffect(() => {
    if (!startedAt || (status !== 'running' && status !== 'queued')) return
    const tick = () => setElapsedSeconds((Date.now() - startedAt.getTime()) / 1000)
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [startedAt, status])

  function toggleSector(sector: string) {
    setSelectedSectors((prev) => (prev.includes(sector) ? prev.filter((s) => s !== sector) : [...prev, sector]))
  }

  async function startRun() {
    setError(null)
    setStarting(true)
    try {
      const { runId: newRunId } = await startRunAction({ city, sectors: selectedSectors, limit })
      setRunId(newRunId)
      setStatus('running')
      setStartedAt(new Date())
      setElapsedSeconds(0)
      setEvents([])
      setTaskCounts({})
      cursorRef.current = 0
      poll(newRunId)
    } catch (err) {
      setError(err instanceof Error ? err.message : nl.prospecting.console.genericError)
    } finally {
      setStarting(false)
    }
  }

  async function poll(currentRunId: string) {
    try {
      const tickRes = await fetch(`/api/prospecting/runs/${currentRunId}/tick`, { method: 'POST' })
      const tickData = await tickRes.json()

      const eventsRes = await fetch(`/api/prospecting/runs/${currentRunId}/events?after=${cursorRef.current}`)
      const eventsData = await eventsRes.json()
      if (eventsRes.ok && eventsData.events.length > 0) {
        cursorRef.current = eventsData.events[eventsData.events.length - 1].id
        setEvents((prev) => [...prev, ...eventsData.events].slice(-MAX_FEED_LINES))
      }

      const statusRes = await fetch(`/api/prospecting/runs/${currentRunId}`)
      const statusData = await statusRes.json()
      const finalStatus = statusRes.ok ? statusData.run?.status : tickData.status
      setStatus(finalStatus)
      if (statusRes.ok) setTaskCounts(statusData.taskCounts ?? {})

      if (finalStatus === 'running') {
        pollTimeoutRef.current = setTimeout(() => poll(currentRunId), POLL_INTERVAL_MS)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verbinding verloren — opnieuw proberen...')
      pollTimeoutRef.current = setTimeout(() => poll(currentRunId), POLL_INTERVAL_MS * 2)
    }
  }

  async function cancelRun() {
    if (!runId) return
    setCancelling(true)
    try {
      await cancelRunAction(runId)
    } finally {
      setCancelling(false)
    }
  }

  const isRunning = status === 'running' || status === 'queued'
  const pending = taskCounts['pending'] ?? 0
  const claimed = taskCounts['claimed'] ?? 0
  const done = taskCounts['done'] ?? 0
  const failed = taskCounts['failed'] ?? 0

  return (
    <div className="card space-y-5">
      <h2 className="display text-h2 text-foreground">{nl.prospecting.console.startTitle}</h2>

      {!isRunning ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">{nl.prospecting.console.city}</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="field mt-2"
              >
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{nl.prospecting.console.limit}</label>
              <input
                type="number"
                min={1}
                max={200}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="field mt-2"
              />
            </div>
          </div>

          <div>
            <label className="label">{nl.prospecting.console.sectors}</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {sectors.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSector(s)}
                  aria-pressed={selectedSectors.includes(s)}
                  className={`rounded-full border px-3 py-1.5 text-body-sm transition-colors duration-fast ${
                    selectedSectors.includes(s)
                      ? 'border-flame-line bg-flame-soft text-flame'
                      : 'border-border text-muted hover:text-foreground'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-caption text-flame">{error}</p>}

          <button
            type="button"
            onClick={startRun}
            disabled={starting || selectedSectors.length === 0}
            className="btn-primary disabled:opacity-50"
          >
            {starting ? nl.prospecting.console.starting : nl.prospecting.console.start}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-body-sm text-foreground">
              {status === 'running' ? nl.prospecting.console.running : nl.prospecting.console.queued}
              {startedAt && ` — ${formatDuration(elapsedSeconds)}`} — {done} klaar, {claimed} bezig, {pending} in wachtrij
              {failed > 0 ? `, ${failed} mislukt` : ''}
            </p>
            <button
              type="button"
              onClick={cancelRun}
              disabled={cancelling}
              className="btn-ghost disabled:opacity-50"
            >
              {cancelling ? nl.prospecting.console.cancelling : nl.prospecting.console.cancel}
            </button>
          </div>

          <div>
            <p className="label">{nl.prospecting.console.events}</p>
            <div className="mt-2 max-h-96 overflow-y-auto rounded-md border border-border bg-surface p-3 font-mono text-caption">
              {events.length === 0 ? (
                <p className="text-muted">{nl.prospecting.console.noEvents}</p>
              ) : (
                events.map((event) => (
                  <div key={event.id} className={LEVEL_CLASS[event.level] ?? 'text-muted'}>
                    {event.messageNl}
                  </div>
                ))
              )}
              <div ref={feedEndRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
