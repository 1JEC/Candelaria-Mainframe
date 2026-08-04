'use client'

import { signOut } from 'next-auth/react'

import { nl } from '@/lib/nl'

export const SignOutButton = () => (
  <button
    type="button"
    onClick={() => signOut({ callbackUrl: '/login' })}
    className="rounded-full border border-border px-4 py-2 text-body-sm text-muted transition-colors duration-fast hover:border-cream/40 hover:text-foreground"
  >
    {nl.topbar.logout}
  </button>
)
