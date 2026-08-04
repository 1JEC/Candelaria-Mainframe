import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { nl } from '@/lib/nl'

export default function AdsPage() {
  return (
    <>
      <PageHeader
        title={nl.modules.ads.title}
        subtitle={nl.modules.ads.subtitle}
      />
      <div className="card mt-8">
        <EmptyState hint={nl.common.comingSoon} />
      </div>
    </>
  )
}
