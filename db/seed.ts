import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'

import { db, sql } from './index'
import { organizations, users } from './schema'

/**
 * Seeds one clearly-labelled demo organization and one user per role.
 *
 * Everything written here carries `is_demo = true`. No real client names,
 * metrics or testimonials are ever invented — the demo org is explicitly named
 * as a demo environment so it can never be mistaken for a real account.
 */

const DEMO_ORG_SLUG = 'demo'
const DEMO_PASSWORD = 'mainframe-demo'

const demoUsers = [
  {
    email: 'admin@candelaria.demo',
    name: 'Candelaria Beheer',
    role: 'admin' as const,
  },
  {
    email: 'manager@candelaria.demo',
    name: 'Demo Manager',
    role: 'client_manager' as const,
  },
  {
    email: 'viewer@candelaria.demo',
    name: 'Demo Viewer',
    role: 'client_viewer' as const,
  },
]

async function main() {
  const [org] = await db
    .insert(organizations)
    .values({
      name: 'Demo-organisatie',
      slug: DEMO_ORG_SLUG,
      plan: 'growth',
      isDemo: true,
    })
    .onConflictDoUpdate({
      target: organizations.slug,
      set: { name: 'Demo-organisatie', isDemo: true },
    })
    .returning()

  console.log(`organization: ${org.name} (${org.id})`)

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12)

  for (const u of demoUsers) {
    await db
      .insert(users)
      .values({ ...u, orgId: org.id, passwordHash, isDemo: true })
      .onConflictDoUpdate({
        target: users.email,
        set: { name: u.name, role: u.role, passwordHash, orgId: org.id },
      })
    console.log(`user: ${u.email} (${u.role})`)
  }

  const count = await db.select().from(users).where(eq(users.orgId, org.id))
  console.log(`\nseeded ${count.length} demo users. password: ${DEMO_PASSWORD}`)
}

main()
  .then(() => sql.end())
  .catch(async (err) => {
    console.error(err)
    await sql.end()
    process.exit(1)
  })
