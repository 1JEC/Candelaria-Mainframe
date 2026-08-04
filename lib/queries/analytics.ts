import { and, count, countDistinct, desc, gte, isNotNull, sql } from 'drizzle-orm'

import { db } from '@/db'
import { leads, pageviews } from '@/db/schema'
import { periodStart, type Period } from '@/lib/period'

function since(period: Period) {
  return periodStart(period)
}

function pvWhere(period: Period) {
  const s = since(period)
  return s ? gte(pageviews.createdAt, s) : undefined
}

export async function getKpis(period: Period) {
  const where = pvWhere(period)

  const [totals] = await db
    .select({
      pageviews: count(),
      visitors: countDistinct(pageviews.visitorHash),
      sessions: countDistinct(pageviews.sessionId),
    })
    .from(pageviews)
    .where(where)

  // Bounce rate: share of sessions with exactly one pageview.
  const sessionCounts = db
    .$with('session_counts')
    .as(
      db
        .select({ sessionId: pageviews.sessionId, n: count().as('n') })
        .from(pageviews)
        .where(where ? and(where, isNotNull(pageviews.sessionId)) : isNotNull(pageviews.sessionId))
        .groupBy(pageviews.sessionId),
    )

  const [bounce] = await db
    .with(sessionCounts)
    .select({
      totalSessions: count(),
      singlePageSessions: sql<number>`count(*) filter (where ${sessionCounts.n} = 1)`,
    })
    .from(sessionCounts)

  const leadsSince = since(period)
  const [leadCount] = await db
    .select({ n: count() })
    .from(leads)
    .where(leadsSince ? gte(leads.createdAt, leadsSince) : undefined)

  const pv = totals?.pageviews ?? 0
  const visitors = totals?.visitors ?? 0
  const sessions = totals?.sessions ?? 0
  const totalSessions = bounce?.totalSessions ?? 0
  const singlePage = bounce?.singlePageSessions ?? 0

  return {
    pageviews: pv,
    visitors,
    sessions,
    pagesPerSession: sessions > 0 ? pv / sessions : 0,
    bounceRate: totalSessions > 0 ? singlePage / totalSessions : 0,
    conversionRate: visitors > 0 ? (leadCount?.n ?? 0) / visitors : 0,
  }
}

export async function getDailyVisitors(period: Period) {
  const where = pvWhere(period)
  const bucket = sql<string>`to_char(date_trunc('day', ${pageviews.createdAt}), 'YYYY-MM-DD')`

  return db
    .select({ bucket: bucket.as('bucket'), visitors: countDistinct(pageviews.visitorHash) })
    .from(pageviews)
    .where(where)
    .groupBy(sql`date_trunc('day', ${pageviews.createdAt})`)
    .orderBy(sql`date_trunc('day', ${pageviews.createdAt})`)
}

export async function getCountryBreakdown(period: Period, limit = 20) {
  const where = pvWhere(period)
  return db
    .select({ country: pageviews.country, n: count() })
    .from(pageviews)
    .where(where)
    .groupBy(pageviews.country)
    .orderBy(desc(count()))
    .limit(limit)
}

export async function getCityBreakdown(period: Period, limit = 20) {
  const where = pvWhere(period)
  return db
    .select({ city: pageviews.city, country: pageviews.country, n: count() })
    .from(pageviews)
    .where(where)
    .groupBy(pageviews.city, pageviews.country)
    .orderBy(desc(count()))
    .limit(limit)
}

export async function getReferrerBreakdown(period: Period, limit = 20) {
  const where = pvWhere(period)
  return db
    .select({ referrerDomain: pageviews.referrerDomain, n: count() })
    .from(pageviews)
    .where(where)
    .groupBy(pageviews.referrerDomain)
    .orderBy(desc(count()))
    .limit(limit)
}

export async function getUtmBreakdown(period: Period, limit = 20) {
  const s = since(period)
  const where = and(
    s ? gte(pageviews.createdAt, s) : undefined,
    isNotNull(pageviews.utmSource),
  )
  return db
    .select({
      utmSource: pageviews.utmSource,
      utmMedium: pageviews.utmMedium,
      utmCampaign: pageviews.utmCampaign,
      n: count(),
    })
    .from(pageviews)
    .where(where)
    .groupBy(pageviews.utmSource, pageviews.utmMedium, pageviews.utmCampaign)
    .orderBy(desc(count()))
    .limit(limit)
}

export async function getDeviceBreakdown(period: Period) {
  const where = pvWhere(period)
  return db
    .select({ deviceType: pageviews.deviceType, n: count() })
    .from(pageviews)
    .where(where)
    .groupBy(pageviews.deviceType)
    .orderBy(desc(count()))
}

export async function getBrowserBreakdown(period: Period, limit = 10) {
  const where = pvWhere(period)
  return db
    .select({ browser: pageviews.browser, n: count() })
    .from(pageviews)
    .where(where)
    .groupBy(pageviews.browser)
    .orderBy(desc(count()))
    .limit(limit)
}

export async function getOsBreakdown(period: Period, limit = 10) {
  const where = pvWhere(period)
  return db
    .select({ os: pageviews.os, n: count() })
    .from(pageviews)
    .where(where)
    .groupBy(pageviews.os)
    .orderBy(desc(count()))
    .limit(limit)
}

export async function getTopPages(period: Period, limit = 20) {
  const where = pvWhere(period)
  return db
    .select({ path: pageviews.path, views: count(), visitors: countDistinct(pageviews.visitorHash) })
    .from(pageviews)
    .where(where)
    .groupBy(pageviews.path)
    .orderBy(desc(count()))
    .limit(limit)
}

/** Distinct visitors seen in the last 5 minutes — polled every 30s by the UI. */
export async function getLiveVisitorCount() {
  const since5min = new Date(Date.now() - 5 * 60_000)
  const [row] = await db
    .select({ n: countDistinct(pageviews.visitorHash) })
    .from(pageviews)
    .where(gte(pageviews.createdAt, since5min))
  return row?.n ?? 0
}

export async function getPageviewsForExport(period: Period, limit = 20_000) {
  const where = pvWhere(period)
  return db
    .select()
    .from(pageviews)
    .where(where)
    .orderBy(desc(pageviews.createdAt))
    .limit(limit)
}

export async function getLeadsForExport(period: Period, limit = 20_000) {
  const s = since(period)
  return db
    .select()
    .from(leads)
    .where(s ? gte(leads.createdAt, s) : undefined)
    .orderBy(desc(leads.createdAt))
    .limit(limit)
}
