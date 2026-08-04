'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export type Tab = { href: string; label: string; exact?: boolean }

/** Section-level navigation. Routing-only — no client state to drift. */
export const Tabs = ({ tabs }: { tabs: Tab[] }) => {
  const pathname = usePathname()

  return (
    <nav
      className="mt-6 flex gap-1 border-b border-border"
      aria-label="Subnavigatie"
    >
      {tabs.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href)

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`-mb-px border-b-2 px-4 py-3 text-body-sm transition-colors duration-fast ${
              active
                ? 'border-flame text-foreground'
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
