'use server'

import { getLiveVisitorCount } from '@/lib/queries/analytics'
import { requireModule } from '@/lib/session'

/** Polled every 30s by the Live widget. Read-only, but still module-gated. */
export async function fetchLiveVisitorCount(): Promise<number> {
  await requireModule('analytics')
  return getLiveVisitorCount()
}
