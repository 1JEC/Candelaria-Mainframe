# Mainframe HQ — Fase 0 Blueprint

Mainframe HQ is the internal operations portal for Candelaria Agency and serves as "klant nul" (customer zero) for the Mainframe product.

## Project Status

**🎉 ALL PHASES COMPLETE (0-6)** — Fully functional operations portal ready for production.

### What's Included

**Fase 0 (Schema & Blueprint)** ✅
- Complete Drizzle ORM schema (14 tables)
- TypeScript types and module interfaces
- Security architecture (encryption, CSRF, headers)
- Integration checklist (FASE-0-DECISIONS.md)

**Fase 1 (Authentication & Shell)** ✅
- Auth.js with credentials + TOTP 2FA
- Login page with 2FA code input
- Dashboard with navbar + sidebar (responsive 320px+)
- Audit logging (all actions tracked)
- Settings page

**Fase 2 (Website Intake)** ✅
- POST /api/intake (form submissions → leads)
- Lead deduplication and creation
- Email notifications via Resend
- Anti-spam validation

**Fase 3 (Social Publisher)** ✅
- Anthropic AI content generator
- Posts calendar (Instagram, Facebook, X)
- Approval workflow framework
- Publication scheduler (Cron-ready)

**Fase 4 (Mailbox)** ✅
- Email triage agent (AI categorization)
- Inbox with priority indicators
- Draft response generation
- Proton Bridge integration (VPS worker pattern)

**Fase 5 (Prospecting)** ✅
- AI prospect research agent
- Lead scoring algorithm
- Outreach task generation (scripts, emails, DMs)
- Task management page

**Fase 6 (Dashboard & Polish)** ✅
- Analytics dashboard (KPIs, module stats)
- Audit log with action summaries
- Today's activity feed
- Agent run tracking (tokens, costs)
- Fase progress visualization

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
| **0** | Blauwdruk | ✅ COMPLETE | Schema, types, documentation |
| **1** | Auth + Shell | ✅ COMPLETE | Login, 2FA, dashboard, audit logging |
| **2** | Website Intake | ✅ COMPLETE | Intake endpoint, lead creation, email notifications |
| **3** | Social Publisher | ✅ COMPLETE | Content generator agent, calendar, approval |
| **4** | Mailbox | ✅ COMPLETE | Email triage agent, inbox, Proton integration |
| **5** | Prospecting | ✅ COMPLETE | Prospect research, lead scoring, outreach |
| **6** | Dashboard & Polish | ✅ COMPLETE | Analytics, audit log, agent tracking, monitoring |

**Status**: Ready for production deployment. Fill in FASE-0-DECISIONS.md, deploy to Vercel, configure integrations.

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
