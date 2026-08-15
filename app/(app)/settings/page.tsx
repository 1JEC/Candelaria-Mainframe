import { IngestTokenPanel } from '@/components/settings/IngestTokenPanel'
import { IntegrationsPanel } from '@/components/settings/IntegrationsPanel'
import { OrgSettingsForm } from '@/components/settings/OrgSettingsForm'
import { UsersPanel } from '@/components/settings/UsersPanel'
import { PageHeader } from '@/components/ui/PageHeader'
import { formatDateTime } from '@/lib/format'
import { nl } from '@/lib/nl'
import { listIngestTokens, getOrgSettings } from '@/lib/queries/settings'
import { listIntegrations } from '@/lib/queries/integrations'
import { listOrgUsers } from '@/lib/queries/users'
import { canMutate } from '@/lib/rbac'
import { requireModule } from '@/lib/session'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const user = await requireModule('settings')
  const [tokens, integrations, orgUsers, orgSettings] = await Promise.all([
    listIngestTokens(user.orgId),
    listIntegrations(user.orgId),
    listOrgUsers(user.orgId),
    getOrgSettings(user.orgId),
  ])
  if (!orgSettings) notFound()

  const userRows = orgUsers.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    isActive: row.isActive,
    lastLoginLabel: row.lastLogin ? formatDateTime(row.lastLogin) : nl.settings.users.neverLoggedIn,
  }))

  const integrationRows = integrations.map((row) => ({
    provider: row.provider,
    status: row.status,
    lastSyncLabel: row.lastSyncAt ? formatDateTime(row.lastSyncAt) : null,
  }))

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

      <div className="mt-8 space-y-6">
        <OrgSettingsForm initialName={orgSettings.name} plan={orgSettings.plan} canMutate={canMutate(user.role)} />
        <UsersPanel users={userRows} currentUserId={user.id} canMutate={canMutate(user.role)} />
        <IntegrationsPanel integrations={integrationRows} canMutate={canMutate(user.role)} />
        <IngestTokenPanel tokens={rows} canMutate={canMutate(user.role)} />
      </div>
    </>
  )
}
