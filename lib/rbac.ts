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
  'website-leads',
  'analytics',
  'prospecting',
] as const

export type ModuleKey = (typeof MODULES)[number]

const ALL_MODULES = [...MODULES]

/**
 * `website-leads` and `analytics` are Candelaria's OWN data about its
 * marketing website (candelaria-agency.netlify.app) — not any client's, and
 * not org-scoped in the schema. They must never appear for a client role,
 * regardless of what `ALL_MODULES` contains.
 *
 * `prospecting` is Candelaria's own outbound MKB lead-finding agent (the
 * "Leads Agent") — unrelated to the client-facing `leads` module, which is
 * each org's own CRM. Also not org-scoped, also staff-only.
 */
const STAFF_ONLY_MODULES: readonly ModuleKey[] = ['website-leads', 'analytics', 'prospecting']

export const MODULE_ACCESS: Record<UserRole, readonly ModuleKey[]> = {
  // Candelaria staff — everything.
  admin: ALL_MODULES,
  // Client owner — everything for their own organization, excluding
  // Candelaria's internal-only modules.
  client_manager: ALL_MODULES.filter((m) => !STAFF_ONLY_MODULES.includes(m)),
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
