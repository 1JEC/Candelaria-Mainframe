import { z } from 'zod'

import { db } from '@/db'
import { pageviews } from '@/db/schema'
import { corsHeaders, corsPreflight } from '@/lib/cors'
import { clientIp, truncateIp } from '@/lib/ip'
import { referrerDomain } from '@/lib/referrer'
import { isBot, parseUserAgent } from '@/lib/ua-parse'
import { hashVisitor, utcDateString } from '@/lib/visitor-hash'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const collectSchema = z.object({
  site: z.string().trim().min(1).max(100).default('candelaria-agency'),
  path: z.string().trim().min(1).max(2000),
  referrer: z.string().trim().max(2000).optional(),
  session_id: z.string().trim().max(128).optional(),
  utm: z
    .object({
      source: z.string().trim().max(200).nullable().optional(),
      medium: z.string().trim().max(200).nullable().optional(),
      campaign: z.string().trim().max(200).nullable().optional(),
    })
    .optional(),
})

function noContent() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export async function OPTIONS() {
  return corsPreflight()
}

export async function POST(req: Request) {
  const userAgent = req.headers.get('user-agent')

  // Bots never reach the DB — checked before any parsing/validation work.
  if (isBot(userAgent)) return noContent()

  let body: unknown
  try {
    // sendBeacon delivers the JSON string as a text/plain body.
    body = JSON.parse(await req.text())
  } catch {
    return noContent()
  }

  const parsed = collectSchema.safeParse(body)
  if (!parsed.success) return noContent()
  const data = parsed.data

  const ip = clientIp(req)
  const salt = process.env.ANALYTICS_SALT ?? ''
  // Full IP is used only in-memory to derive the hash below — never inserted.
  const visitorHash = ip
    ? hashVisitor(ip, userAgent ?? '', utcDateString(), salt)
    : null

  const { deviceType, browser, os } = parseUserAgent(userAgent)

  await db.insert(pageviews).values({
    site: data.site,
    path: data.path,
    referrer: data.referrer || null,
    referrerDomain: referrerDomain(data.referrer),
    utmSource: data.utm?.source || null,
    utmMedium: data.utm?.medium || null,
    utmCampaign: data.utm?.campaign || null,
    country: req.headers.get('x-vercel-ip-country'),
    city: req.headers.get('x-vercel-ip-city'),
    region: req.headers.get('x-vercel-ip-country-region'),
    ipTruncated: truncateIp(ip),
    visitorHash,
    sessionId: data.session_id || null,
    deviceType,
    browser,
    os,
    userAgent,
  })

  return noContent()
}
