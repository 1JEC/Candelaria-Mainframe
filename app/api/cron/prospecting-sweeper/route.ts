import { NextResponse } from 'next/server'

import { db } from '@/db'
import { prospectRuns } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { runTick } from '@/lib/leads-agent/orchestration/tick'

export const dynamic = 'force-dynamic'

/**
 * Vercel injects `Authorization: Bearer <CRON_SECRET>` automatically on
 * cron-triggered requests when the env var is set. Keeps a run moving even
 * when no browser tab is open polling it — the fallback the Console's own
 * client-side polling doesn't cover.
 */
function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const running = await db.select({ id: prospectRuns.id }).from(prospectRuns).where(eq(prospectRuns.status, 'running'))
  const results = []
  for (const run of running) {
    try {
      results.push(await runTick(run.id))
    } catch (err) {
      results.push({ runId: run.id, error: err instanceof Error ? err.message : String(err) })
    }
  }

  return NextResponse.json({ ok: true, ticked: results.length, results })
}
