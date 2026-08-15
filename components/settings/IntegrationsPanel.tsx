'use client'

import { useState, useTransition } from 'react'

import {
  connectIntegration,
  disconnectIntegration,
} from '@/app/(app)/settings/actions'
import { Pill } from '@/components/ui/Pill'
import { formatDateTime } from '@/lib/format'
import { integrationProviderLabel, integrationStatusMeta } from '@/lib/labels'
import { nl } from '@/lib/nl'
import type { IntegrationProvider, IntegrationStatus } from '@/db/schema'

type IntegrationRow = {
  provider: IntegrationProvider
  status: IntegrationStatus
  /** Pre-formatted on the server — see IngestTokenPanel for why (hydration mismatch across timezones). */
  lastSyncLabel: string | null
}

const t = nl.settings.integrations

export const IntegrationsPanel = ({
  integrations,
  canMutate,
}: {
  integrations: IntegrationRow[]
  canMutate: boolean
}) => {
  const [rows, setRows] = useState(integrations)

  return (
    <div className="card">
      <h2 className="label">{t.title}</h2>
      <p className="mt-2 text-body-sm text-muted">{t.subtitle}</p>

      <div className="mt-6 divide-y divide-border">
        {rows.map((row) => (
          <IntegrationRowItem
            key={row.provider}
            row={row}
            canMutate={canMutate}
            onChange={(next) =>
              setRows((prev) => prev.map((r) => (r.provider === row.provider ? { ...r, ...next } : r)))
            }
          />
        ))}
      </div>
    </div>
  )
}

const IntegrationRowItem = ({
  row,
  canMutate,
  onChange,
}: {
  row: IntegrationRow
  canMutate: boolean
  onChange: (next: Partial<IntegrationRow>) => void
}) => {
  const [open, setOpen] = useState(false)
  const [credential, setCredential] = useState('')
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const meta = integrationStatusMeta[row.status]
  const connected = row.status === 'connected'

  const submitConnect = (e: React.FormEvent) => {
    e.preventDefault()
    if (!credential.trim()) return setError(t.errors.credentialRequired)
    setError(null)
    startTransition(async () => {
      try {
        const result = await connectIntegration({ provider: row.provider, credential })
        onChange({
          status: result.status,
          lastSyncLabel: result.lastSyncAt ? formatDateTime(new Date(result.lastSyncAt)) : null,
        })
        setCredential('')
        setOpen(false)
      } catch {
        setError(t.errors.generic)
      }
    })
  }

  const clickDisconnect = () => {
    if (!confirmingDisconnect) return setConfirmingDisconnect(true)
    setError(null)
    startTransition(async () => {
      try {
        await disconnectIntegration({ provider: row.provider })
        onChange({ status: 'not_connected', lastSyncLabel: null })
        setConfirmingDisconnect(false)
      } catch {
        setError(t.errors.generic)
        setConfirmingDisconnect(false)
      }
    })
  }

  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-body-sm text-foreground">{integrationProviderLabel[row.provider]}</p>
          <p className="mt-0.5 text-caption text-muted">
            {row.lastSyncLabel ? `${t.lastSync}: ${row.lastSyncLabel}` : t.neverSynced}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Pill tone={meta.tone} dot>
            {meta.label}
          </Pill>
          {canMutate && (
            <>
              {connected ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={clickDisconnect}
                  className={`rounded-full border px-4 py-2 text-caption transition-colors duration-fast disabled:opacity-50 ${
                    confirmingDisconnect
                      ? 'border-flame-line bg-flame-soft text-flame'
                      : 'border-border text-muted hover:text-foreground'
                  }`}
                >
                  {pending ? t.disconnecting : confirmingDisconnect ? t.disconnectConfirm : t.disconnect}
                </button>
              ) : (
                <button type="button" onClick={() => setOpen((v) => !v)} className="btn-ghost">
                  {t.connect}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {open && !connected && (
        <form onSubmit={submitConnect} className="mt-3 flex flex-wrap items-start gap-3">
          <input
            type="password"
            value={credential}
            onChange={(e) => setCredential(e.target.value)}
            placeholder={t.credentialPlaceholder}
            className="field max-w-md flex-1"
            autoFocus
          />
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? t.connecting : t.connect}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              setError(null)
              setCredential('')
            }}
            className="btn-ghost"
          >
            {nl.common.cancel}
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-2 text-caption text-flame">
          {error}
        </p>
      )}
    </div>
  )
}
