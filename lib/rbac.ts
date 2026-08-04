import type { UserRole } from '@/db/schema'

/**
 * Module keys map 1:1 to the sidebar nav and to the route segment under
 * `app/(app)/`. Access is deny-by-default: a module the role does not list is
 * hidden from the nav *and* blocked in middleware.
 */
export const MODULES = [
  'dashboard',
  'agents',
  'leads',
  'social',
  'ads',
  'seo',
  'automations',
  'library',
  'requests',
  'settings',
] as const

export type ModuleKey = (typeof MODULES)[number]

const ALL_MODULES = [...MODULES]

export const MODULE_ACCESS: Record<UserRole, readonly ModuleKey[]> = {
  // Candelaria staff — everything.
  admin: ALL_MODULES,
  // Client owner — everything for their own organization.
  client_manager: ALL_MODULES,
  // Read-only — dashboard, library and reports only.
  client_viewer: ['dashboard', 'library'],
}

export function canAccess(role: UserRole, module: ModuleKey): boolean {
  return MODULE_ACCESS[role].includes(module)
}

/** Viewers may read but never mutate. */
export function canMutate(role: UserRole): boolean {
  return role !== 'client_viewer'
}

/** Only Candelaria staff may cross organization boundaries. */
export function isStaff(role: UserRole): boolean {
  return role === 'admin'
}

export function modulesFor(role: UserRole): readonly ModuleKey[] {
  return MODULE_ACCESS[role]
}
