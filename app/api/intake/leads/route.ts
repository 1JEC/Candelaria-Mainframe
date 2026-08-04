import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db'
import { leads } from '@/db/schema'
import { corsHeaders, corsPreflight } from '@/lib/cors'
import { agencyInbox, sendEmail } from '@/lib/email'
import { clientIp } from '@/lib/ip'
import { isRateLimited } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3100'
const MAX_BODY_BYTES = 32 * 1024

const leadSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    email: z.string().trim().email().max(320),
    phone: z.string().trim().max(50).optional(),
    company: z.string().trim().max(200).optional(),
    website_url: z.string().trim().max(500).optional(),
    message: z.string().trim().max(5000).optional(),
    form_name: z.string().trim().max(100).optional(),
    visitor_hash: z.string().trim().max(128).optional(),
    session_id: z.string().trim().max(128).optional(),
    utm_source: z.string().trim().max(200).optional(),
    utm_medium: z.string().trim().max(200).optional(),
    utm_campaign: z.string().trim().max(200).optional(),
    /** Honeypot — real visitors never see or fill this field. */
    _hp: z.string().optional(),
  })
  .passthrough()

export async function OPTIONS() {
  return corsPreflight()
}

export async function POST(req: Request) {
  const headers = corsHeaders()

  const token = req.headers.get('x-intake-token')
  if (!token || token !== process.env.INTAKE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401, headers })
  }

  const raw = await req.text()
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large.' }, { status: 413, headers })
  }

  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400, headers })
  }

  const parsed = leadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed.', issues: parsed.error.issues },
      { status: 422, headers },
    )
  }
  const data = parsed.data

  // Honeypot tripped: pretend success, do nothing. Real users never see this
  // field (hidden via CSS on the website form), so any non-empty value is a
  // bot filling every field it can find.
  if (data._hp) {
    return NextResponse.json({ ok: true, id: crypto.randomUUID() }, { headers })
  }

  const ip = clientIp(req)

  if (await isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many submissions.' }, { status: 429, headers })
  }

  const [row] = await db
    .insert(leads)
    .values({
      source: 'candelaria-website',
      formName: data.form_name || 'book-audit-call',
      name: data.name,
      email: data.email,
      phone: data.phone,
      company: data.company,
      websiteUrl: data.website_url,
      message: data.message,
      payload: body as Record<string, unknown>,
      ipAddress: ip,
      ipCountry: req.headers.get('x-vercel-ip-country'),
      ipCity: req.headers.get('x-vercel-ip-city'),
      visitorHash: data.visitor_hash,
      utmSource: data.utm_source,
      utmMedium: data.utm_medium,
      utmCampaign: data.utm_campaign,
    })
    .returning({ id: leads.id })

  // Resend failure must never fail the request — the lead is already saved.
  await sendEmail({
    to: agencyInbox(),
    subject: `Nieuwe lead — ${data.name} (${data.company || 'geen bedrijf opgegeven'})`,
    text: [
      `Nieuwe aanvraag via ${data.form_name || 'book-audit-call'} op de website.`,
      '',
      `Naam: ${data.name}`,
      `E-mail: ${data.email}`,
      data.phone ? `Telefoon: ${data.phone}` : null,
      data.company ? `Bedrijf: ${data.company}` : null,
      data.website_url ? `Website: ${data.website_url}` : null,
      data.message ? `\nBericht:\n${data.message}` : null,
      '',
      `${APP_URL}/website-leads/${row.id}`,
    ]
      .filter(Boolean)
      .join('\n'),
  })

  return NextResponse.json({ ok: true, id: row.id }, { headers })
}
