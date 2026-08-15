import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'

import { authConfig } from '@/auth.config'
import { db } from '@/db'
import { organizations, users } from '@/db/schema'
import { recordAudit } from '@/lib/audit'

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Wachtwoord', type: 'password' },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw)
        if (!parsed.success) return null

        const email = parsed.data.email.toLowerCase().trim()

        const [row] = await db
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            role: users.role,
            passwordHash: users.passwordHash,
            isActive: users.isActive,
            orgId: users.orgId,
            orgName: organizations.name,
            orgIsDemo: organizations.isDemo,
          })
          .from(users)
          .innerJoin(organizations, eq(users.orgId, organizations.id))
          .where(eq(users.email, email))
          .limit(1)

        // Compare against a dummy hash when the user does not exist so the
        // response time does not reveal which emails are registered.
        const hash =
          row?.passwordHash ??
          '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvaliduO'
        const ok = await bcrypt.compare(parsed.data.password, hash)

        // Checked after the bcrypt.compare, not before — bailing out early
        // for a deactivated account would make the response measurably
        // faster than a wrong-password one, leaking which emails are
        // deactivated to a timing attacker.
        if (!row || !ok || !row.isActive) return null

        await db
          .update(users)
          .set({ lastLogin: new Date() })
          .where(eq(users.id, row.id))

        await recordAudit({
          orgId: row.orgId,
          userId: row.id,
          action: 'user.login',
          entity: 'user',
          entityId: row.id,
          meta: { email: row.email, role: row.role },
        })

        return {
          id: row.id,
          email: row.email,
          name: row.name,
          role: row.role,
          orgId: row.orgId,
          orgName: row.orgName,
          orgIsDemo: row.orgIsDemo,
        }
      },
    }),
  ],
})
