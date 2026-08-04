import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db'
import { users } from '@/db/schema'
import { recordAudit } from '@/lib/audit'
import { sendEmail } from '@/lib/email'
import { generateResetToken, RESET_TOKEN_TTL_MS } from '@/lib/password-reset'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3100'

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
})

/**
 * Always responds with the same generic message whether or not the email is
 * registered, so this endpoint cannot be used to enumerate accounts.
 */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ongeldig e-mailadres.' }, { status: 422 })
  }

  const genericResponse = NextResponse.json({
    ok: true,
    message:
      'Als dit e-mailadres bekend is, is er een link verstuurd om het wachtwoord te resetten.',
  })

  const [row] = await db
    .select({ id: users.id, email: users.email, orgId: users.orgId })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1)

  if (!row) return genericResponse

  const { token, tokenHash } = generateResetToken()
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS)

  await db
    .update(users)
    .set({ passwordResetTokenHash: tokenHash, passwordResetExpiresAt: expiresAt })
    .where(eq(users.id, row.id))

  const resetUrl = `${APP_URL}/reset-password?token=${token}`

  await sendEmail({
    to: row.email,
    subject: 'Wachtwoord resetten — Candelaria Mainframe',
    text: [
      'Er is een wachtwoordreset aangevraagd voor je Candelaria Mainframe-account.',
      '',
      `Klik op onderstaande link om een nieuw wachtwoord in te stellen (verloopt over 1 uur):`,
      resetUrl,
      '',
      'Heb je dit niet aangevraagd? Dan kun je deze e-mail negeren.',
    ].join('\n'),
  })

  await recordAudit({
    orgId: row.orgId,
    userId: row.id,
    action: 'user.password_reset_requested',
    entity: 'user',
    entityId: row.id,
  })

  return genericResponse
}
