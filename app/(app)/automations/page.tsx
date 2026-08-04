import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { nl } from '@/lib/nl'

export default function AutomationsPage() {
  return (
    <>
      <PageHeader
        title={nl.modules.automations.title}
        subtitle={nl.modules.automations.subtitle}
      />
      <div className="card mt-8">
        <EmptyState hint={nl.common.comingSoon} />
      </div>
    </>
  )
}
