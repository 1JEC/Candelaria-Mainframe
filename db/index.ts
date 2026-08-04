import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error(
    'DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.',
  )
}

/**
 * Reuse a single client across hot reloads in development, otherwise every
 * refresh opens a new pool and exhausts Postgres connections.
 */
const globalForDb = globalThis as unknown as {
  __mainframeSql?: ReturnType<typeof postgres>
}

const sql =
  globalForDb.__mainframeSql ??
  postgres(connectionString, {
    max: process.env.NODE_ENV === 'production' ? 10 : 1,
    prepare: false,
  })

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__mainframeSql = sql
}

export const db = drizzle(sql, { schema })
export { schema, sql }
