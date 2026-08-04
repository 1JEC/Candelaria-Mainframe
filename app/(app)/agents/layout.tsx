import type { ReactNode } from 'react'

import { PageHeader } from '@/components/ui/PageHeader'
import { Tabs } from '@/components/ui/Tabs'
import { nl } from '@/lib/nl'
import { requireModule } from '@/lib/session'

const tabs = [
  { href: '/agents', label: nl.agents.tabs.overview, exact: true },
  { href: '/agents/conversations', label: nl.agents.tabs.conversations },
  { href: '/agents/escalations', label: nl.agents.tabs.escalations },
]

export default async function AgentsLayout({
  children,
}: {
  children: ReactNode
}) {
  // Authoritative gate — middleware blocks the route, this blocks the data.
  await requireModule('agents')

  return (
    <>
      <PageHeader
        title={nl.modules.agents.title}
        subtitle={nl.modules.agents.subtitle}
      />
      <Tabs tabs={tabs} />
      <div className="mt-8">{children}</div>
    </>
  )
}
