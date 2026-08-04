import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { nl } from '@/lib/nl'

export default function LeadsPage() {
  return (
    <>
      <PageHeader
        title={nl.modules.leads.title}
        subtitle={nl.modules.leads.subtitle}
      />
      <div className="card mt-8">
        <EmptyState hint={nl.common.comingSoon} />
      </div>
    </>
  )
}
