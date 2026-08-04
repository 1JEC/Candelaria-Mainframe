import { redirect } from 'next/navigation'

import { auth } from '@/auth'
import type { UserRole } from '@/db/schema'
import { canAccess, canMutate, type ModuleKey } from '@/lib/rbac'

export type SessionUser = {
  id: string
  name: string
  email: string
  role: UserRole
  orgId: string
  orgName: string
  orgIsDemo: boolean
}

/**
 * Server-side guard for pages and server actions. Middleware already blocks
 * anonymous traffic; this is the authoritative check that also narrows types.
 */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const u = session.user
  return {
    id: u.id,
    name: u.name ?? '',
    email: u.email ?? '',
    role: u.role,
    orgId: u.orgId,
    orgName: u.orgName,
    orgIsDemo: u.orgIsDemo,
  }
}

export async function requireModule(module: ModuleKey): Promise<SessionUser> {
  const user = await requireUser()
  if (!canAccess(user.role, module)) redirect('/dashboard')
  return user
}

/** Throws inside server actions — viewers must never mutate. */
export async function requireMutator(module: ModuleKey): Promise<SessionUser> {
  const user = await requireModule(module)
  if (!canMutate(user.role)) {
    throw new Error('Forbidden: this role is read-only.')
  }
  return user
}
