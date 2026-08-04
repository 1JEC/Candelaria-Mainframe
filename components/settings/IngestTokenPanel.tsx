'use client'

import { useEffect, useState, useTransition } from 'react'

import {
  createIngestToken,
  revokeIngestToken,
} from '@/app/(app)/settings/actions'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pill } from '@/components/ui/Pill'
import { formatDateTime } from '@/lib/format'
import { nl } from '@/lib/nl'

type TokenRow = {
  id: string
  name: string
  createdAt: Date
  lastUsedAt: Date | null
  revokedAt: Date | null
}

const t = nl.settings.tokens

export const IngestTokenPanel = ({
  tokens,
  canMutate,
}: {
  tokens: TokenRow[]
  canMutate: boolean
}) => {
  const [rows, setRows] = useState(tokens)
  const [revealed, setRevealed] = useState<{ name: string; token: string } | null>(
    null,
  )

  return (
    <div className="card">
      <h2 className="label">{t.title}</h2>
      <p className="mt-2 text-body-sm text-muted">{t.subtitle}</p>

      {revealed && (
        <RevealBanner
          name={revealed.name}
          token={revealed.token}
          onDone={() => setRevealed(null)}
        />
      )}

      {canMutate && (
        <NewTokenForm
          onCreated={(row, token) => {
            setRows((prev) => [row, ...prev])
            setRevealed({ name: row.name, token })
          }}
        />
      )}

      {rows.length === 0 ? (
        <EmptyState className="mt-6" hint={t.empty} />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[560px] border-collapse text-body-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                {[t.colName, t.colStatus, t.colCreated, t.colLastUsed, ''].map(
                  (h, i) => (
                    <th
                      key={i}
                      scope="col"
                      className="px-4 py-3 text-left font-mono text-label uppercase tracking-label text-muted"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <TokenRowItem
                  key={row.id}
                  row={row}
                  canMutate={canMutate}
                  onRevoked={() =>
                    setRows((prev) =>
                      prev.map((r) =>
                        r.id === row.id ? { ...r, revokedAt: new Date() } : r,
                      ),
                    )
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const RevealBanner = ({
  name,
  token,
  onDone,
}: {
  name: string
  token: string
  onDone: () => void
}) => {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(token)
    setCopied(true)
  }

  return (
    <div className="mt-6 rounded-lg border border-gold-line bg-gold-soft p-5">
      <p className="text-body-sm font-medium text-gold-light">
        {t.revealTitle} — {name}
      </p>
      <p className="mt-1 text-caption text-muted">{t.revealWarning}</p>
      <code className="mt-3 block break-all rounded-md border border-border bg-white/[0.03] px-4 py-3 font-mono text-caption text-foreground">
        {token}
      </code>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={copy} className="btn-ghost">
          {copied ? t.copied : t.copy}
        </button>
        <button type="button" onClick={onDone} className="btn-primary">
          {t.done}
        </button>
      </div>
    </div>
  )
}

const NewTokenForm = ({
  onCreated,
}: {
  onCreated: (row: TokenRow, token: string) => void
}) => {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError(t.errors.nameRequired)

    setError(null)
    startTransition(async () => {
      try {
        const result = await createIngestToken({ name })
        onCreated(
          {
            id: result.id,
            name: result.name,
            createdAt: new Date(result.createdAt),
            lastUsedAt: null,
            revokedAt: null,
          },
          result.token,
        )
        setName('')
        setOpen(false)
      } catch {
        setError(t.errors.generic)
      }
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-primary mt-6"
      >
        {t.newButton}
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-wrap items-start gap-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={200}
        placeholder={t.namePlaceholder}
        className="field max-w-sm"
        autoFocus
      />
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? t.generating : t.newButton}
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false)
          setError(null)
          setName('')
        }}
        className="btn-ghost"
      >
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

const TokenRowItem = ({
  row,
  canMutate,
  onRevoked,
}: {
  row: TokenRow
  canMutate: boolean
  onRevoked: () => void
}) => {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!confirming) return
    const timer = setTimeout(() => setConfirming(false), 4000)
    return () => clearTimeout(timer)
  }, [confirming])

  const revoked = row.revokedAt !== null

  const click = () => {
    if (!confirming) return setConfirming(true)
    setError(false)
    startTransition(async () => {
      try {
        await revokeIngestToken({ tokenId: row.id })
        onRevoked()
      } catch {
        setError(true)
        setConfirming(false)
      }
    })
  }

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-3 text-foreground">{row.name}</td>
      <td className="px-4 py-3">
        <Pill tone={revoked ? 'neutral' : 'success'} dot>
          {revoked ? t.statusRevoked : t.statusActive}
        </Pill>
      </td>
      <td className="px-4 py-3 font-mono text-caption text-muted">
        {formatDateTime(row.createdAt)}
      </td>
      <td className="px-4 py-3 font-mono text-caption text-muted">
        {row.lastUsedAt ? formatDateTime(row.lastUsedAt) : t.neverUsed}
      </td>
      <td className="px-4 py-3 text-right">
        {!revoked && canMutate && (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={click}
              className={`rounded-full border px-4 py-2 text-caption transition-colors duration-fast disabled:opacity-50 ${
                confirming
                  ? 'border-flame-line bg-flame-soft text-flame'
                  : 'border-border text-muted hover:text-foreground'
              }`}
            >
              {pending ? t.revoking : confirming ? t.revokeConfirm : t.revoke}
            </button>
            {error && (
              <p role="alert" className="mt-1 text-caption text-flame">
                {t.errors.generic}
              </p>
            )}
          </>
        )}
      </td>
    </tr>
  )
}
