import { NextResponse } from 'next/server'

import { auth } from '@/auth'
import { toCsv } from '@/lib/csv'
import { isPeriod } from '@/lib/period'
import { getLeadsForExport, getPageviewsForExport } from '@/lib/queries/analytics'
import { isStaff } from '@/lib/rbac'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Session-gated, not ingest-token-gated — called from inside the logged-in
 * portal. Middleware skips all of `/api` (see middleware.ts comment), so the
 * auth check happens here instead of relying on it.
 */
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user || !isStaff(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const url = new URL(req.url)
  const type = url.searchParams.get('type')
  const periodParam = url.searchParams.get('period') ?? undefined
  const period = isPeriod(periodParam) ? periodParam : 'all'

  if (type !== 'pageviews' && type !== 'leads') {
    return NextResponse.json(
      { error: "type must be 'pageviews' or 'leads'." },
      { status: 400 },
    )
  }

  const rows =
    type === 'pageviews'
      ? await getPageviewsForExport(period)
      : await getLeadsForExport(period)

  const csv = toCsv(rows as unknown as Record<string, unknown>[])
  const filename = `${type}-${period}-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
