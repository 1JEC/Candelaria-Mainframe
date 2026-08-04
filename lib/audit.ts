import { db } from '@/db'
import { auditLog } from '@/db/schema'

type AuditInput = {
  orgId: string
  /** Null for system actors: agents, cron jobs, ingest endpoints. */
  userId?: string | null
  action: string
  entity: string
  entityId?: string | null
  meta?: Record<string, unknown>
}

/**
 * Writes one append-only audit row. Every mutation in the portal must call
 * this. Failures are logged but never thrown — an audit write must not take
 * down the user-facing action it is recording.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await db.insert(auditLog).values({
      orgId: input.orgId,
      userId: input.userId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      meta: input.meta ?? null,
    })
  } catch (err) {
    console.error('[audit] failed to record', input.action, err)
  }
}
