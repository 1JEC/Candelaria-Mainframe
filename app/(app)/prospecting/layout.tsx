import type { ReactNode } from 'react'

import { PageHeader } from '@/components/ui/PageHeader'
import { Tabs } from '@/components/ui/Tabs'
import { nl } from '@/lib/nl'
import { requireModule } from '@/lib/session'
import { isStaff } from '@/lib/rbac'

const tabs = [
  { href: '/prospecting', label: nl.prospecting.tabs.console, exact: true },
  { href: '/prospecting/leads', label: nl.prospecting.tabs.leads },
  { href: '/prospecting/outbound', label: nl.prospecting.tabs.outbound },
  { href: '/prospecting/health', label: nl.prospecting.tabs.health },
  { href: '/prospecting/instellingen', label: nl.prospecting.tabs.settings },
]

export default async function ProspectingLayout({ children }: { children: ReactNode }) {
  const user = await requireModule('prospecting')
  if (!isStaff(user.role)) {
    return (
      <>
        <PageHeader title={nl.modules.prospecting.title} subtitle={nl.modules.prospecting.subtitle} />
        <p className="mt-8 text-body-sm text-muted">{nl.common.noAccess}</p>
      </>
    )
  }

  return (
    <>
      <PageHeader title={nl.modules.prospecting.title} subtitle={nl.modules.prospecting.subtitle} />
      <Tabs tabs={tabs} />
      <div className="mt-8">{children}</div>
    </>
  )
}
