/**
 * Runs pending Drizzle migrations against the ACTUAL Vercel production
 * database — not whatever DATABASE_URL happens to be ambient in the shell
 * or in .env.local.
 *
 * Why this exists: `npx drizzle-kit migrate` on its own reads DATABASE_URL
 * from process.env, which in this repo's normal dev workflow points at a
 * local Postgres instance (see .env.local). Running that command out of dev
 * habit — after merging a PR, expecting it to touch production — silently
 * migrates the WRONG database twice in a row before this script existed.
 * The failure mode is quiet: no error, just a production app one migration
 * behind, discovered only when a real user hits the missing column.
 *
 * This script removes the ambiguity: it pulls the production DATABASE_URL
 * fresh from Vercel every time, refuses to run against anything that looks
 * local, prints exactly which host it's about to touch, runs the migration,
 * verifies the result by querying Drizzle's own migration journal table,
 * and deletes the pulled credentials file when it's done — success or not.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import postgres from 'postgres'

const PULLED_ENV_FILE = '.env.production.pull'

function run(cmd: string, args: string[], envOverride?: Record<string, string>): string {
  return execFileSync(cmd, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    env: envOverride ? { ...process.env, ...envOverride } : process.env,
  })
}

function parseDatabaseUrl(envFileContents: string): string {
  const match = envFileContents
    .split('\n')
    .find((line) => line.startsWith('DATABASE_URL='))
  if (!match) {
    throw new Error(`DATABASE_URL not found in ${PULLED_ENV_FILE} — is this Vercel project actually linked (.vercel/project.json)?`)
  }
  // Vercel's pulled file quotes values: DATABASE_URL="postgres://..."
  return match.slice('DATABASE_URL='.length).replace(/^"|"$/g, '')
}

/** The one check that would have caught both silent local-DB migrations before this script existed. */
function assertNotLocal(databaseUrl: string) {
  const host = new URL(databaseUrl).hostname
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
    throw new Error(
      `Refusing to run: the pulled "production" DATABASE_URL resolves to ${host}, which is local. ` +
        `Check that this directory's .vercel/project.json is linked to the correct Vercel project.`,
    )
  }
  return host
}

async function main() {
  console.log('→ Pulling production environment from Vercel...')
  try {
    run('npx', ['vercel', 'env', 'pull', PULLED_ENV_FILE, '--environment', 'production', '--yes'])
  } catch {
    throw new Error('vercel env pull failed — run `npx vercel link` first if this directory is not linked to a project.')
  }

  try {
    const databaseUrl = parseDatabaseUrl(readFileSync(PULLED_ENV_FILE, 'utf8'))
    const host = assertNotLocal(databaseUrl)
    console.log(`→ Target: ${host} (production)`)

    console.log('→ Applying pending migrations...')
    // drizzle.config.ts calls dotenv's config({ path: '.env.local' }) before
    // reading DATABASE_URL — dotenv never overrides an already-set env var,
    // so setting it here (before the child process even starts) is what
    // makes this target production instead of .env.local's local database.
    run('npx', ['drizzle-kit', 'migrate'], { DATABASE_URL: databaseUrl })

    console.log('→ Verifying against the migration journal...')
    const sql = postgres(databaseUrl, { max: 1 })
    try {
      const [latest] = await sql`select count(*)::int as count, max(created_at) as latest from drizzle.__drizzle_migrations`
      console.log(`  ${latest.count} migrations recorded — most recent applied ${new Date(Number(latest.latest)).toLocaleString('nl-NL')}.`)
    } finally {
      await sql.end()
    }
  } finally {
    if (existsSync(PULLED_ENV_FILE)) {
      rmSync(PULLED_ENV_FILE)
      console.log(`→ Removed ${PULLED_ENV_FILE} (contained production credentials).`)
    }
  }
}

main().catch((err) => {
  console.error('FAILED:', err instanceof Error ? err.message : err)
  process.exit(1)
})
