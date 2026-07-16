# Mainframe HQ — Project Memory

## Mission

Mainframe HQ is de **interne operations-portal van Candelaria Agency** en serves as **klant nul** van het Mainframe-product. De portal consolidates:
- Social Publisher (Instagram, Facebook, X)
- Website intake + CRM
- Mailbox (Proton Mail)
- Lead-engine + prospecting
- Audit log & datalog

Alles is generiek gebouwd zodat latere klant-instanties dezelfde modules kunnen draaien (in hun eigen omgeving).

## Kernwaarden (uit ~/CLAUDE.md)

- **Kwaliteit boven alles** — geen snelle fixes, geen tech debt
- **Oplossingsgerichte mentaliteit** — adviseren, niet alleen uitvoeren
- **Van A tot Z ontzorgen** — complete journeys, geen losse eindjes
- **Persoonlijk & betrokken** — partner, geen leverancier

## Taalregel (bindend)

- **Nederlands**: alle user-facing copy, rapportage, workflows
- **Engels**: alle code, comments, commits, technische docs

## Stack (vast)

- **Framework**: Next.js 15 (App Router), TypeScript strict, Tailwind CSS
- **Hosting**: Vercel (portaal + API + Cron)
- **Database**: Vercel Postgres + Drizzle ORM (migrations in git)
- **Auth**: Auth.js (magic link + password + 2FA TOTP)
- **AI**: Anthropic API (server-side tool use) — elke run gelogd
- **Mail-out**: Resend (systeemmail + outreach)
- **Mail-in**: Proton Mail Bridge (worker syncs via IMAP)
- **Worker**: Docker-container op goedkope VPS, syncs Proton & posts events naar portaal via beveiligde API

## Harde Regels

1. **Publicatie & outreach:** altijd via goedkeuringsflow, tenzij expliciet automatisch gezet
2. **Geen DM-automatisering:** DM-concepten voor handmatige verzending
3. **Data-eerlijkheid:** alleen tonen wat platforms daadwerkelijk leveren (geen verzonnen kijker-identiteiten)
4. **Audit alles:** elke actie in `audit_log` (niets gebeurt stil)
5. **Resend enig notificatiekanaal:** geen Telegram of alternatieven
6. **Outreach-compliance:** opt-out + suppression-lijst, publieke bronnen enkel
7. **Secrets veilig:** nooit in code/logs, versleuteld at rest, Bridge-creds uitsluitend op worker
8. **Generiek voor hergebruik:** dit is klant nul — modules moeten later voor andere instanties kopieërbaar zijn
9. **Bij twijfel: vraag Johan, gok niet**

## Approval-gate regel

**Elke fase eindigt met:** repo-status, samenvatting gebouwde, open beslissingen, STOP.

**Nooit doorbouwen naar volgende fase zonder expliciete "GO" van Johan.**

### Fasen

- **Fase 0 (NU)**: Blauwdruk (structuur, schema, interfaces, benodigde integrations, CLAUDE.md)
- **Fase 1**: Fundament (auth + 2FA, DB, layout-shell, settings, audit, seed-data) → Log in, zie lege portal
- **Fase 2**: Website-intake + CRM → Lead binnenkomt, e-mail notification
- **Fase 3**: Social Publisher → Concept → Approve → Live op 3 platforms → Metrics volgende dag
- **Fase 4**: Mailbox → Mail ontvangen in portaal → AI-concept → Approve → SMTP-reply uit Proton
- **Fase 5**: Prospecting + outreach-werklijst
- **Fase 6**: Dashboard + weekly report + hardening (tests, Lighthouse, README)

## Beslissingen voor Johan (voordat Fase 1 start)

- [ ] Meta Graph App + credentials (Facebook Page + IG Business Account gekoppeld)
- [ ] X API Tier (free/basic/pro/enterprise?) + credentials
- [ ] Vercel Postgres of Neon? (connection string)
- [ ] Resend domain (SPF/DKIM setup)
- [ ] Proton Mail: abonnement + Bridge lokaal beschikbaar (VPS waar?)
- [ ] VPS voor always-on worker (Hetzner, Linode, DigitalOcean, prijs OK?)
- [ ] Subdomain voor portaal (e.g., hq.candelaria-agency.com)
- [ ] Welke email-categorieën mogen auto-reply? (bv. "bevestiging ontvangst")

## Repo-structuur

```
mainframe-hq/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   ├── (dashboard)/
│   ├── api/
│   └── layout.tsx
├── components/                   # React components per module
│   ├── dashboard/
│   ├── posts/
│   ├── leads/
│   ├── inbox/
│   └── ui/
├── lib/                          # Server utilities
│   ├── agents/                   # AI agent implementations
│   ├── adapters/                 # Social API wrappers
│   ├── db.ts
│   ├── auth.ts
│   └── crypto.ts
├── drizzle/                      # Drizzle ORM schema & migrations
│   ├── schema.ts
│   ├── relations.ts
│   ├── drizzle.config.ts
│   └── migrations/
├── types/                        # TypeScript definitions
├── scripts/                      # Utilities (seed, migrate)
├── worker/                       # Proton Bridge sync (separate VPS)
├── CLAUDE.md                     # This file
├── env.example                   # Template for .env.local
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── middleware.ts
└── package.json
```

## Ontwikkelflow (per fase)

1. Maak tak aan: `git checkout -b fase-N`
2. Werk fase uit volgens spec
3. Test lokaal (dev server, DB seed)
4. Commit met duidelijke messages (Engels)
5. Maak PR, samenvatting Nederlands
6. Stop — wacht op goedkeuring van Johan
7. Pas feedback toe, merge
8. Volgende fase

## Testing & Validation

- **Type-checking**: `npm run type-check` (strikt!)
- **Lint**: `npm run lint`
- **DB**: `npm run db:push` (Drizzle migrations)
- **Build**: `npm run build` voordat je commits
- **E2E**: Happy-path tests voor elke fase (Playwright)

## Deployment (Fase 1+)

- Vercel auto-deploys van `main` naar production
- Cron Jobs voor sync-taken (stats-sync, mail-sync, etc.)
- Railway health checks op `/api/health`
- Secrets via Vercel env vars, NOOIT in code
