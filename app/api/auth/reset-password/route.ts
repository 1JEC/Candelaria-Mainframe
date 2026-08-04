import bcrypt from 'bcryptjs'
import { and, eq, gt } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db'
import { users } from '@/db/schema'
import { recordAudit } from '@/lib/audit'
import { hashResetToken } from '@/lib/password-reset'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  token: z.string().trim().min(1),
  password: z.string().min(8, 'Wachtwoord moet minimaal 8 tekens zijn.'),
})

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Ongeldige invoer.' },
      { status: 422 },
    )
  }

  const tokenHash = hashResetToken(parsed.data.token)

  const [row] = await db
    .select({ id: users.id, orgId: users.orgId })
    .from(users)
    .where(
      and(
        eq(users.passwordResetTokenHash, tokenHash),
        gt(users.passwordResetExpiresAt, new Date()),
      ),
    )
    .limit(1)

  if (!row) {
    return NextResponse.json(
      { error: 'Deze link is ongeldig of verlopen. Vraag een nieuwe aan.' },
      { status: 400 },
    )
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12)

  await db
    .update(users)
    .set({
      passwordHash,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
    })
    .where(eq(users.id, row.id))

  await recordAudit({
    orgId: row.orgId,
    userId: row.id,
    action: 'user.password_reset_completed',
    entity: 'user',
    entityId: row.id,
  })

  return NextResponse.json({ ok: true })
}
