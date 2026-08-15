'use client'

import { useEffect, useState, useTransition } from 'react'

import {
  changeUserRole,
  inviteUser,
  setUserActive,
} from '@/app/(app)/settings/actions'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pill } from '@/components/ui/Pill'
import { formatDateTime } from '@/lib/format'
import { userRoleLabel } from '@/lib/labels'
import { nl } from '@/lib/nl'
import type { UserRole } from '@/db/schema'

type InvitableRole = Extract<UserRole, 'client_manager' | 'client_viewer'>
const INVITABLE_ROLES: InvitableRole[] = ['client_manager', 'client_viewer']

type UserRow = {
  id: string
  name: string
  email: string
  role: UserRole
  isActive: boolean
  /** Pre-formatted on the server — see IngestTokenPanel for why. */
  lastLoginLabel: string
}

const t = nl.settings.users

export const UsersPanel = ({
  users,
  currentUserId,
  canMutate,
}: {
  users: UserRow[]
  currentUserId: string
  canMutate: boolean
}) => {
  const [rows, setRows] = useState(users)
  const [invited, setInvited] = useState(false)

  return (
    <div className="card">
      <h2 className="label">{t.title}</h2>
      <p className="mt-2 text-body-sm text-muted">{t.subtitle}</p>

      {invited && (
        <p className="mt-4 rounded-md border border-moss/35 bg-moss-soft px-4 py-3 text-body-sm text-moss">
          {t.invitedMessage}
        </p>
      )}

      {canMutate && (
        <InviteForm
          onInvited={(row) => {
            setRows((prev) => [row, ...prev])
            setInvited(true)
          }}
        />
      )}

      {rows.length === 0 ? (
        <EmptyState className="mt-6" hint={t.empty} />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] border-collapse text-body-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                {[t.colName, t.colEmail, t.colRole, t.colStatus, t.colLastLogin, ''].map((h, i) => (
                  <th key={i} scope="col" className="px-4 py-3 text-left font-mono text-label uppercase tracking-label text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <UserRowItem
                  key={row.id}
                  row={row}
                  isSelf={row.id === currentUserId}
                  canMutate={canMutate}
                  onChange={(next) =>
                    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...next } : r)))
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

const InviteForm = ({ onInvited }: { onInvited: (row: UserRow) => void }) => {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<InvitableRole>('client_viewer')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError(t.errors.nameRequired)
    if (!email.trim()) return setError(t.errors.emailRequired)

    setError(null)
    startTransition(async () => {
      try {
        const result = await inviteUser({ email, name, role })
        onInvited({
          id: result.id,
          name: result.name,
          email: result.email,
          role: result.role,
          isActive: result.isActive,
          lastLoginLabel: t.neverLoggedIn,
        })
        setName('')
        setEmail('')
        setRole('client_viewer')
        setOpen(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : t.errors.generic)
      }
    })
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-primary mt-6">
        {t.inviteButton}
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
        className="field max-w-xs"
        autoFocus
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t.emailPlaceholder}
        className="field max-w-xs"
      />
      <select value={role} onChange={(e) => setRole(e.target.value as InvitableRole)} className="field max-w-[10rem]">
        {INVITABLE_ROLES.map((r) => (
          <option key={r} value={r}>
            {userRoleLabel[r]}
          </option>
        ))}
      </select>
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? t.inviting : t.inviteButton}
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
      {error && (
        <p role="alert" className="w-full text-body-sm text-flame">
          {error}
        </p>
      )}
    </form>
  )
}

const UserRowItem = ({
  row,
  isSelf,
  canMutate,
  onChange,
}: {
  row: UserRow
  isSelf: boolean
  canMutate: boolean
  onChange: (next: Partial<UserRow>) => void
}) => {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!confirming) return
    const timer = setTimeout(() => setConfirming(false), 4000)
    return () => clearTimeout(timer)
  }, [confirming])

  const changeRole = (role: InvitableRole) => {
    setError(null)
    startTransition(async () => {
      try {
        await changeUserRole({ userId: row.id, role })
        onChange({ role })
      } catch (err) {
        setError(err instanceof Error ? err.message : t.errors.generic)
      }
    })
  }

  const clickToggleActive = () => {
    if (row.isActive && !confirming) return setConfirming(true)
    setError(null)
    startTransition(async () => {
      try {
        const result = await setUserActive({ userId: row.id, isActive: !row.isActive })
        onChange({ isActive: result.isActive })
        setConfirming(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : t.errors.generic)
        setConfirming(false)
      }
    })
  }

  const canEditRole = canMutate && !isSelf && row.role !== 'admin'

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-3 text-foreground">
        {row.name} {isSelf && <span className="text-muted">{t.you}</span>}
      </td>
      <td className="px-4 py-3 text-muted">{row.email}</td>
      <td className="px-4 py-3">
        {canEditRole ? (
          <select
            value={row.role}
            disabled={pending}
            onChange={(e) => changeRole(e.target.value as InvitableRole)}
            className="field py-1.5 text-caption"
          >
            {INVITABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {userRoleLabel[r]}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-foreground">{userRoleLabel[row.role]}</span>
        )}
      </td>
      <td className="px-4 py-3">
        <Pill tone={row.isActive ? 'success' : 'neutral'} dot>
          {row.isActive ? t.statusActive : t.statusInactive}
        </Pill>
      </td>
      <td className="px-4 py-3 font-mono text-caption text-muted">{row.lastLoginLabel}</td>
      <td className="px-4 py-3 text-right">
        {canMutate && !isSelf && row.role !== 'admin' && (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={clickToggleActive}
              className={`rounded-full border px-4 py-2 text-caption transition-colors duration-fast disabled:opacity-50 ${
                confirming
                  ? 'border-flame-line bg-flame-soft text-flame'
                  : 'border-border text-muted hover:text-foreground'
              }`}
            >
              {pending
                ? row.isActive
                  ? t.deactivating
                  : t.reactivating
                : row.isActive
                  ? confirming
                    ? t.deactivateConfirm
                    : t.deactivate
                  : t.reactivate}
            </button>
            {error && (
              <p role="alert" className="mt-1 text-caption text-flame">
                {error}
              </p>
            )}
          </>
        )}
      </td>
    </tr>
  )
}
