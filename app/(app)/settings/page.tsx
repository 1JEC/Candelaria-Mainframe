import { IngestTokenPanel } from '@/components/settings/IngestTokenPanel'
import { PageHeader } from '@/components/ui/PageHeader'
import { nl } from '@/lib/nl'
import { listIngestTokens } from '@/lib/queries/settings'
import { canMutate } from '@/lib/rbac'
import { requireModule } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const user = await requireModule('settings')
  const tokens = await listIngestTokens(user.orgId)

  return (
    <>
      <PageHeader
        title={nl.modules.settings.title}
        subtitle={nl.modules.settings.subtitle}
      />

      <div className="mt-8">
        <IngestTokenPanel tokens={tokens} canMutate={canMutate(user.role)} />
      </div>
    </>
  )
}
