import { defineConfig } from 'vitest/config'
import { config } from 'dotenv'
import path from 'path'

// lib/leads-agent/config.ts imports db/index.ts at module load time (a
// top-level `import { db } from "@/db"`), which throws immediately if
// DATABASE_URL is unset — matches drizzle.config.ts's own dotenv loading.
config({ path: '.env.local' })

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    // Mirrors tsconfig.json's "@/*" -> "./*" so tests import modules by the
    // same specifier the app uses.
    alias: { '@': path.resolve(__dirname, './') },
  },
})
