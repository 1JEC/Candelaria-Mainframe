# Candelaria Mainframe — project memory

Owned Operations Layer for Candelaria Agency. One Vercel project
(`candelaria-mainframe`), one Neon Postgres database, multi-org
(`organizations`/`users.org_id`) for the client-facing modules; three
modules (`website-leads`, `analytics`, `prospecting`) are staff-only and
deliberately not org-scoped — they're the agency's own data, not a
client's.

Full history and reasoning: [DECISIONS.md](./DECISIONS.md).

## Hard rule: production migrations

```bash
npm run db:migrate:prod   # ALWAYS use this after merging a schema-changing PR
npm run db:migrate        # local development only — targets .env.local's local Postgres
```

Bare `db:migrate` reads `DATABASE_URL` from whatever's ambient, which in
the normal dev workflow is the local database. Running it out of habit
after a merge has silently left production a migration behind — twice.
`db:migrate:prod` (`scripts/migrate-production.ts`) pulls the real
production `DATABASE_URL` from Vercel every time and refuses to run
against anything that looks local. Never bypass it with a manual
`DATABASE_URL=... drizzle-kit migrate` unless you're deliberately
reproducing what the script already does.

## Deploy

This project has **no GitHub → Vercel auto-deploy**. Merging a PR does
not deploy anything. Every deploy is `npx vercel --prod`, run by hand,
after migrating.

Order, every time: **merge PR → `npm run db:migrate:prod` → `npx vercel --prod`.**

## Stack

Next.js App Router, TypeScript, Drizzle ORM (`postgres-js`), Auth.js v5
(Credentials only, bcrypt), Resend (only notification channel — degrades
to a console log, never throws, when `RESEND_API_KEY` is absent),
Vercel Blob (private store, Library module).

## AI backend

`lib/agents/providers.ts` makes the model transport swappable behind the
existing `callModel()` contract — never add a second client.

- `AI_PROVIDER=anthropic` (default) — paid, uses `ANTHROPIC_API_KEY`.
- `AI_PROVIDER=openai` + `AI_BASE_URL` (`ollama`/`groq`/`openrouter`/
  `gemini`/`mistral` presets, or a full URL) — any OpenAI-compatible
  endpoint, free tier or local, zero marginal cost.

`estimateCost()`/`hasKnownPricing()` distinguish "genuinely free" from
"we have no price for this model" — never show €0,00 for an unpriced
model; that reads as a measurement, not a gap.

## Style

- Dutch: all user-facing copy, via `lib/nl.ts` — never a hardcoded string
  in a component.
- English: code, comments, commits.
- Design tokens: `brand-tokens.json` is the single source of truth for
  colour/font/radius/spacing. Semantic tone only (`components/ui/Pill.tsx`'s
  `Tone` type: neutral/success/warning/danger/accent/brand) — never a raw
  Tailwind colour class in a component.
- Migrations: `npx drizzle-kit generate` then apply — never the
  interactive `push` flow (it can prompt about unrelated tables and isn't
  safely scriptable).

## Known gaps (see DECISIONS.md for the full reasoning)

- No governance/guardrails/prompt-versioning layer.
- No SLA/incident monitoring for deployed client agents.
- No product spec for `automations` beyond its one-line nav description
  — needs a decision before it needs code.
- `social`/`ads` blocked on real Meta/Google Ads API credentials.
