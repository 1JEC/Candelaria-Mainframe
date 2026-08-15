import { NextRequest, NextResponse } from 'next/server'
import { and, asc, eq, gt } from 'drizzle-orm'

import { auth } from '@/auth'
import { isStaff } from '@/lib/rbac'
import { db } from '@/db'
import { prospectEvents } from '@/db/schema'

/** Polled every ~1.5s by the Console with `after` = the last event id seen. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || !isStaff(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { id } = await params
  const afterParam = req.nextUrl.searchParams.get('after')
  const after = afterParam ? Number(afterParam) : 0

  const events = await db
    .select()
    .from(prospectEvents)
    .where(and(eq(prospectEvents.runId, id), gt(prospectEvents.id, Number.isFinite(after) ? after : 0)))
    .orderBy(asc(prospectEvents.id))
    .limit(200)

  return NextResponse.json({ events })
}
