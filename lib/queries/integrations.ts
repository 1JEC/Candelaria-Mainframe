import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { integrations, type IntegrationProvider } from '@/db/schema'

export const INTEGRATION_PROVIDERS: IntegrationProvider[] = [
  'meta',
  'google_ads',
  'google_search_console',
  'google_analytics',
  'linkedin',
  'resend',
  'anthropic',
]

/** Read model for the Settings → Integraties panel. Never selects encryptedCredentials. */
export async function listIntegrations(orgId: string) {
  const rows = await db
    .select({
      id: integrations.id,
      provider: integrations.provider,
      status: integrations.status,
      lastSyncAt: integrations.lastSyncAt,
      tokenExpiresAt: integrations.tokenExpiresAt,
    })
    .from(integrations)
    .where(eq(integrations.orgId, orgId))

  const byProvider = new Map(rows.map((r) => [r.provider, r]))
  // Every provider always renders, connected or not — a provider with no
  // row yet is simply "not_connected", not absent from the list.
  return INTEGRATION_PROVIDERS.map(
    (provider) =>
      byProvider.get(provider) ?? {
        id: null,
        provider,
        status: 'not_connected' as const,
        lastSyncAt: null,
        tokenExpiresAt: null,
      },
  )
}
