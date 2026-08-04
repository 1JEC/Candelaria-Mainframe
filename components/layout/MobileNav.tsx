'use client'

import { useEffect, useState } from 'react'

import { SidebarContent } from '@/components/layout/Sidebar'
import type { UserRole } from '@/db/schema'
import { nl } from '@/lib/nl'

/**
 * Mobile counterpart to the fixed desktop sidebar. Renders a hamburger in the
 * topbar and slides the same nav in as an overlay drawer.
 */
export const MobileNav = ({
  role,
  userName,
}: {
  role: UserRole
  userName: string
}) => {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={nl.topbar.openMenu}
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted transition-colors duration-fast hover:text-foreground"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden fill="none">
          <path
            d="M2 4h12M2 8h12M2 12h12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label={nl.topbar.closeMenu}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />
          <div className="relative flex h-full w-sidebar flex-col border-r border-border bg-surface">
            <SidebarContent
              role={role}
              userName={userName}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
