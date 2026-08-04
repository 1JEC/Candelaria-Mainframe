import { and, count, countDistinct, gte, lt } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { db } from '@/db'
import { leads, pageviews } from '@/db/schema'
import { agencyInbox, sendEmail } from '@/lib/email'
import { getCountryBreakdown, getTopPages } from '@/lib/queries/analytics'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Vercel injects `Authorization: Bearer <CRON_SECRET>` automatically on
 * cron-triggered requests when the env var is set — see vercel.json. Manual
 * testing uses the same header.
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

  const now = new Date()
  const weekStart = new Date(now.getTime() - WEEK_MS)
  const prevWeekStart = new Date(now.getTime() - 2 * WEEK_MS)

  const [pv] = await db
    .select({ pageviews: count(), visitors: countDistinct(pageviews.visitorHash) })
    .from(pageviews)
    .where(gte(pageviews.createdAt, weekStart))

  const [leadsThisWeek] = await db
    .select({ n: count() })
    .from(leads)
    .where(gte(leads.createdAt, weekStart))

  const [leadsPrevWeek] = await db
    .select({ n: count() })
    .from(leads)
    .where(and(gte(leads.createdAt, prevWeekStart), lt(leads.createdAt, weekStart)))

  const pageviewCount = pv?.pageviews ?? 0
  const leadCount = leadsThisWeek?.n ?? 0

  // Nothing happened this week — do not send an empty digest.
  if (pageviewCount === 0 && leadCount === 0) {
    return NextResponse.json({ ok: true, skipped: 'no_data' })
  }

  const [countries, topPages] = await Promise.all([
    getCountryBreakdown('7d', 5),
    getTopPages('7d', 5),
  ])

  const prevCount = leadsPrevWeek?.n ?? 0
  const delta = leadCount - prevCount
  const deltaLabel = delta === 0 ? 'gelijk aan vorige week' : delta > 0 ? `+${delta} t.o.v. vorige week` : `${delta} t.o.v. vorige week`

  const text = [
    `Wekelijks overzicht — candelaria-agency.nl`,
    `${formatRange(weekStart, now)}`,
    '',
    `Bezoekers: ${pv?.visitors ?? 0} unieke bezoekers, ${pageviewCount} paginaweergaven`,
    `Nieuwe leads: ${leadCount} (${deltaLabel})`,
    '',
    'Top landen:',
    ...(countries.length > 0
      ? countries.map((c) => `  ${c.country || 'onbekend'} — ${c.n}`)
      : ['  (geen data)']),
    '',
    "Top pagina's:",
    ...(topPages.length > 0
      ? topPages.map((p) => `  ${p.path} — ${p.views} weergaven`)
      : ['  (geen data)']),
    '',
    `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3100'}/analytics`,
  ].join('\n')

  const result = await sendEmail({
    to: agencyInbox(),
    subject: `Wekelijks overzicht — ${leadCount} nieuwe leads, ${pageviewCount} paginaweergaven`,
    text,
  })

  return NextResponse.json({ ok: true, email: result })
}

function formatRange(from: Date, to: Date): string {
  const fmt = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' })
  return `${fmt.format(from)} – ${fmt.format(to)}`
}
