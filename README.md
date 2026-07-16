# Mainframe HQ — Fase 0 Blueprint

Mainframe HQ is the internal operations portal for Candelaria Agency and serves as "klant nul" (customer zero) for the Mainframe product.

## Project Status

**Fase 0 ✅ COMPLETE** — Blueprint deliverables only. No application code yet.

### What's Included

- ✅ Full directory structure
- ✅ Complete Drizzle ORM schema (14 tables, all 5 modules)
- ✅ TypeScript types and module interfaces
- ✅ Auth.js skeleton (credentials auth + 2FA for Fase 1)
- ✅ Next.js 15 app structure with Tailwind CSS (brand colors: black/green/white)
- ✅ Encryption utilities (AES-256-GCM for credentials)
- ✅ Security headers, CSRF middleware, rate limiting placeholders
- ✅ Database utilities (Drizzle ORM + Vercel Postgres)
- ✅ Health check endpoint (`/api/health`)
- ✅ Project documentation (CLAUDE.md)

### What's NOT Built Yet

- Application pages/components (Fase 1+)
- API endpoints (Fase 1+)
- Agent implementations (Fase 3-5)
- Tests/E2E (Fase 6)

## Quick Start (Local Development)

```bash
# Install dependencies
npm install

# Setup environment variables
cp env.example .env.local
# Edit .env.local with your keys

# Setup database
npm run db:push

# Run dev server
npm run dev
```

Open http://localhost:3000 → redirects to `/login` (Fase 1)

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

| Fase | Goal | Deliverable | Duration |
|------|------|-------------|----------|
| **0** | ✅ Blauwdruk | Schema, structure, types, CLAUDE.md | Done |
| **1** | Auth + Shell | Login, 2FA, dashboard layout, DB | ~1-2 weeks |
| **2** | Website Intake | Forms → leads, email notification | ~1 week |
| **3** | Social Publisher | Calendar, content gen, approve, publish, metrics | ~2 weeks |
| **4** | Mailbox | Proton sync, triage, AI drafts, send | ~1.5 weeks |
| **5** | Prospecting | Prospect search, outreach prep, tasks | ~1.5 weeks |
| **6** | Polish | Dashboard, reports, tests, Lighthouse, docs | ~1 week |

**Next Step**: Fase 1 starts when all integrations are confirmed.

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
