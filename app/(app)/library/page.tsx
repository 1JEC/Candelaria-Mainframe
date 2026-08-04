import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { nl } from '@/lib/nl'

export default function LibraryPage() {
  return (
    <>
      <PageHeader
        title={nl.modules.library.title}
        subtitle={nl.modules.library.subtitle}
      />
      <div className="card mt-8">
        <EmptyState hint={nl.common.comingSoon} />
      </div>
    </>
  )
}
