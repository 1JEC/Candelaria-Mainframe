import { NextResponse } from 'next/server'

import { auth } from '@/auth'
import { isStaff } from '@/lib/rbac'
import { runTick } from '@/lib/leads-agent/orchestration/tick'

/**
 * Session-authenticated tick endpoint the admin's own browser tab polls
 * while a run is active — no `after()`/background execution involved, the
 * caller is responsible for calling this again while the run is `running`.
 * Middleware does not protect /api, so this checks the session itself.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || !isStaff(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { id } = await params
  try {
    const summary = await runTick(id)
    return NextResponse.json(summary)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 })
  }
}
