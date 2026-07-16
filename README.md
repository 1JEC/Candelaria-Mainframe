# Mainframe HQ — Fase 0 Blueprint

Mainframe HQ is the internal operations portal for Candelaria Agency and serves as "klant nul" (customer zero) for the Mainframe product.

## Project Status

**Fase 1 ✅ COMPLETE** — Full authentication, dashboard shell, and database setup.

### What's Included

**Fase 0 (Schema & Blueprint)**
- ✅ Complete Drizzle ORM schema (14 tables, all 5 modules)
- ✅ TypeScript types and module interfaces
- ✅ Project documentation (CLAUDE.md, FASE-0-DECISIONS.md)

**Fase 1 (Authentication & Shell)**
- ✅ Auth.js with credentials provider + TOTP 2FA
- ✅ Login page (email, password, 2FA code input)
- ✅ Dashboard layout (navbar + sidebar, responsive)
- ✅ Settings page with account & integration info
- ✅ Audit logging system (tracks all actions)
- ✅ Database operations (seed script with test user)
- ✅ Security headers, CSRF middleware, session validation
- ✅ Responsive design (mobile 320px+, desktop)
- ✅ Module navigation stubs (6 coming-soon pages)

### What's NOT Built Yet

- API endpoints for data operations (Fase 2+)
- Agent implementations (Fase 3-5)
- Tests/E2E (Fase 6)

## Quick Start (Local Development)

```bash
# Install dependencies
npm install

# Setup environment variables
cp env.example .env.local
# Edit .env.local:
#   DATABASE_URL=your_vercel_postgres_url
#   NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Setup database
npm run db:push

# Seed test user (admin with 2FA)
npm run db:seed

# Run dev server
npm run dev
```

**Login credentials** (from seed):
- Email: `j.candelaria171@gmail.com`
- Password: `TempPassword123!` (CHANGE AFTER FIRST LOGIN)
- 2FA: Check seed output for TOTP secret, or use `npm run db:studio`

Open http://localhost:3000 → redirects to `/login` → see dashboard

## Database Migrations

```bash
# Create new migration (after schema changes)
npm run db:migrate

# Push schema to database
npm run db:push

# Open Drizzle Studio (visualize/query DB)
npm run db:studio
```

## Project Structure

- **`drizzle/schema.ts`** — All 14 tables, relations, and indices
- **`lib/db.ts`** — Drizzle ORM instance
- **`lib/auth.ts`** — Auth.js configuration (to be completed Fase 1)
- **`lib/crypto.ts`** — Credential encryption/decryption
- **`app/`** — Next.js App Router
  - `app/page.tsx` — Redirect to login/dashboard
  - `app/dashboard/page.tsx` — Portal home (placeholder)
  - `app/api/health/route.ts` — Health check
- **`types/`** — TypeScript definitions
- **`tailwind.config.ts`** — Brand colors (black #000000, green #1a7f3f, white #ffffff)
- **`CLAUDE.md`** — Project rules, approval gates, decision checklist

## Integration Checklist (Before Fase 1)

- [ ] **Meta Graph API**: App ID, App Secret, Facebook Page ID, IG Account ID
- [ ] **X API**: API Key, Secret, Bearer Token, Access Token + Tier (free/basic/pro)
- [ ] **Database**: Vercel Postgres or Neon connection string
- [ ] **Resend**: API Key + verified domain (SPF/DKIM setup)
- [ ] **Proton Mail**: Subscription + Bridge running on VPS
- [ ] **VPS**: For always-on worker (Hetzner, Linode, etc., ~€5-10/mo)
- [ ] **Subdomain**: e.g., `hq.candelaria-agency.com` → Vercel
- [ ] **Encryption key**: Generate 256-bit AES key, set in `ENCRYPTION_KEY` env var
- [ ] **Email auto-reply categories**: Which email types auto-reply? (e.g., "acknowledgment")

## Fase Timeline

| Fase | Goal | Status | Deliverable |
|------|------|--------|-------------|
| **0** | ✅ Blauwdruk | COMPLETE | Schema, structure, types, CLAUDE.md |
| **1** | ✅ Auth + Shell | COMPLETE | Login, 2FA, dashboard, DB, audit logging |
| **2** | 🚧 Website Intake | IN PROGRESS | Forms → leads, email notification |
| **3** | ⏳ Social Publisher | PENDING | Calendar, content gen, approve, publish, metrics |
| **4** | ⏳ Mailbox | PENDING | Proton sync, triage, AI drafts, send |
| **5** | ⏳ Prospecting | PENDING | Prospect search, outreach prep, tasks |
| **6** | ⏳ Polish | PENDING | Dashboard, reports, tests, Lighthouse, docs |

**Next Step**: Fase 2 (Website Intake) starts immediately. Need Resend + database integration setup.

## Harde Regels (Never Break)

1. **Approval gates**: Every fase ends with explicit "GO" from Johan before next fase
2. **Secrets**: Never in code/logs; always encrypted at rest; Bridge creds on worker only
3. **Publishing**: Always approval-flow (no auto-publish unless explicitly set)
4. **Auditing**: Every action logged in `audit_log` table (silent failures not allowed)
5. **Compliance**: Outreach = suppression list + opt-out, public sources only
6. **Genericity**: Build so modules are reusable for future klant-instances
7. **Language**: Dutch = user-facing; English = code/commits

## Commands

```bash
npm run dev              # Start dev server
npm run build            # Build for production
npm run type-check       # Check types (strict mode)
npm run lint             # ESLint
npm run db:push          # Sync schema to database
npm run db:studio        # Open Drizzle Studio
npm run db:seed          # Insert test data (Fase 1+)
npm test                 # Run tests (Fase 6)
npm run test:e2e         # Run E2E tests (Fase 6)
```

## Deployment (Fase 1+)

- Hosted on **Vercel** (`vercel.com/projects/mainframe-hq`)
- Auto-deploy from `main` branch
- Environment variables via Vercel dashboard (NEVER in code)
- Cron jobs for sync tasks (stats, mail, etc.)
- Health check: `/api/health`

## Resources

- [CLAUDE.md](./CLAUDE.md) — Project rules & decisions
- [env.example](./env.example) — Environment variable template
- [drizzle/schema.ts](./drizzle/schema.ts) — Database schema (all tables, relations)
- [Next.js Docs](https://nextjs.org/docs)
- [Drizzle ORM Docs](https://orm.drizzle.team)
- [Auth.js Docs](https://authjs.dev)

---

**Fase 0 Status**: ✅ Complete  
**Next**: Fase 1 (Auth + Shell) — Awaiting Johan's decision on integrations
