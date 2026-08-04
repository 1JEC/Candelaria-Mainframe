import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { nl } from '@/lib/nl'

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title={nl.modules.settings.title}
        subtitle={nl.modules.settings.subtitle}
      />
      <div className="card mt-8">
        <EmptyState hint={nl.common.comingSoon} />
      </div>
    </>
  )
}
