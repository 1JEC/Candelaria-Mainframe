import { desc, eq } from 'drizzle-orm'

import { db } from '@/db'
import { users } from '@/db/schema'

/** Read model for the Settings → Gebruikers panel. Never selects passwordHash or reset-token fields. */
export async function listOrgUsers(orgId: string) {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      lastLogin: users.lastLogin,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.orgId, orgId))
    .orderBy(desc(users.createdAt))
}
