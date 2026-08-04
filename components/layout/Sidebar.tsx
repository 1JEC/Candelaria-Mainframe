'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Monogram } from '@/components/brand/Logo'
import type { UserRole } from '@/db/schema'
import { nl } from '@/lib/nl'
import { MODULES, modulesFor, type ModuleKey } from '@/lib/rbac'

export const navItems: { key: ModuleKey; label: string; href: string }[] =
  MODULES.map((key) => ({ key, label: nl.nav[key], href: `/${key}` }))

type SidebarProps = {
  role: UserRole
  userName: string
  /** Mobile drawer only — the desktop sidebar is always visible. */
  onNavigate?: () => void
}

export const SidebarContent = ({
  role,
  userName,
  onNavigate,
}: SidebarProps) => {
  const pathname = usePathname()
  const allowed = modulesFor(role)
  const items = navItems.filter((item) => allowed.includes(item.key))

  const initials = userName
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <>
      <div className="flex h-topbar items-center gap-2.5 border-b border-border px-5">
        <Monogram size={24} priority />
        <span className="display text-h3 text-foreground">{nl.brand.name}</span>
        <span className="label text-gold">{nl.brand.product}</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={`nav-item ${active ? 'nav-item-active' : ''}`}
            >
              <span
                aria-hidden
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  active ? 'bg-primary' : 'bg-border'
                }`}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-3 py-2">
          <span
            aria-hidden
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-raised font-mono text-label text-muted"
          >
            {initials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-body-sm text-foreground">
              {userName}
            </span>
            <span className="block truncate text-caption text-muted">
              {nl.roles[role]}
            </span>
          </span>
        </div>
      </div>
    </>
  )
}

export const Sidebar = (props: SidebarProps) => (
  <aside className="hidden w-sidebar shrink-0 flex-col border-r border-border bg-surface lg:flex">
    <SidebarContent {...props} />
  </aside>
)
