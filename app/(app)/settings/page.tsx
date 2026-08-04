import { IngestTokenPanel } from '@/components/settings/IngestTokenPanel'
import { PageHeader } from '@/components/ui/PageHeader'
import { formatDateTime } from '@/lib/format'
import { nl } from '@/lib/nl'
import { listIngestTokens } from '@/lib/queries/settings'
import { canMutate } from '@/lib/rbac'
import { requireModule } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const user = await requireModule('settings')
  const tokens = await listIngestTokens(user.orgId)

  // Dates are formatted here (server) rather than in the client component:
  // formatting at client-render time would recompute on hydration using the
  // browser's local timezone, which can differ from the server's and trip a
  // React hydration mismatch.
  const rows = tokens.map((token) => ({
    id: token.id,
    name: token.name,
    createdAtLabel: formatDateTime(token.createdAt),
    lastUsedAtLabel: token.lastUsedAt
      ? formatDateTime(token.lastUsedAt)
      : nl.settings.tokens.neverUsed,
    revokedAt: token.revokedAt,
  }))

  return (
    <>
      <PageHeader
        title={nl.modules.settings.title}
        subtitle={nl.modules.settings.subtitle}
      />

      <div className="mt-8">
        <IngestTokenPanel tokens={rows} canMutate={canMutate(user.role)} />
      </div>
    </>
  )
}
