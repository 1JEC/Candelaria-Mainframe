import { NextResponse } from 'next/server'

import { auth } from '@/auth'
import { isStaff } from '@/lib/rbac'
import { getRun } from '@/lib/leads-agent/orchestration/run'
import { countTasksByStatus } from '@/lib/leads-agent/orchestration/task-queue'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || !isStaff(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { id } = await params
  const run = await getRun(id)
  if (!run) return NextResponse.json({ error: 'Run niet gevonden.' }, { status: 404 })

  const taskCounts = await countTasksByStatus(id)
  return NextResponse.json({ run, taskCounts })
}
