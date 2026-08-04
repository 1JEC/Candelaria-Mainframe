import { MobileNav } from '@/components/layout/MobileNav'
import { SignOutButton } from '@/components/layout/SignOutButton'
import type { UserRole } from '@/db/schema'
import { nl } from '@/lib/nl'

type TopbarProps = {
  orgName: string
  isDemo: boolean
  role: UserRole
  userName: string
}

export const Topbar = ({ orgName, isDemo, role, userName }: TopbarProps) => (
  <header className="flex h-topbar shrink-0 items-center justify-between gap-4 border-b border-border px-4 lg:px-8">
    <div className="flex min-w-0 items-center gap-3">
      <MobileNav role={role} userName={userName} />
      <span className="truncate text-body font-medium text-foreground">
        {orgName}
      </span>
      {isDemo && (
        <span className="hidden items-center gap-2 rounded-full border border-gold-line bg-gold-soft px-3 py-1 font-mono text-label uppercase tracking-label text-gold-light sm:inline-flex">
          {nl.topbar.environment}
        </span>
      )}
    </div>

    <div className="flex items-center gap-2">
      <button
        type="button"
        className="hidden rounded-full border border-border px-4 py-2 text-body-sm text-muted transition-colors duration-fast hover:border-cream/40 hover:text-foreground sm:block"
      >
        {nl.topbar.dateRange}
      </button>
      <SignOutButton />
    </div>
  </header>
)
