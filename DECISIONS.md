# DECISIONS.md — Website Lead Intake + Owned Analytics

Autonomous build log. One entry per decision or deviation from the master
prompt, newest at the bottom of each phase.

## Phase 0 — Audit

- **DB/ORM**: this project uses Drizzle ORM (`db/schema.ts`) with
  `drizzle-kit generate` / `db:migrate`, not a hand-written SQL file in
  `scripts/`. The master prompt's `CREATE TABLE` statements are implemented as
  Drizzle table definitions instead; the generated SQL migration lands in
  `db/migrations/` as usual for this repo.
- **Auth**: Auth.js v5, session-cookie based, role stored on the session
  (`admin` / `client_manager` / `client_viewer`). `admin` = Candelaria staff
  only (see `lib/rbac.ts` comments); `client_manager`/`client_viewer` are a
  client's own users, scoped to their `orgId`.
- **Existing `/leads` module is NOT this feature.** It's already reserved
  (nav entry, `MODULE_ACCESS` including `client_manager`) for a *future,
  per-org* "leads for the client's own business" view — the same pattern as
  the existing `ads`/`seo`/`social` modules (Candelaria manages it, the
  client sees their own results). This master prompt's data is Candelaria's
  own website (candelaria-agency.netlify.app) leads and analytics — it must
  never be visible to a client org. Building it as two **new, admin-only**
  modules instead: `website-leads` (`/website-leads`) and `analytics`
  (`/analytics`), added to `MODULES`/`MODULE_ACCESS` with `admin`-only
  access. This reuses the existing deny-by-default middleware/nav system
  instead of inventing a parallel "admin area."
- **`leads`/`pageviews` tables are NOT org-scoped** (no `org_id` column) —
  this is Candelaria's own data, not any client's.
- **Resend**: `lib/email.ts` already implements the exact "skip + log if no
  API key, never throw" behavior the master prompt asks for. Reusing it
  as-is. `NOTIFY_EMAIL` from the prompt maps to the existing
  `AGENCY_NOTIFY_EMAIL` env var / `agencyInbox()` helper rather than adding a
  duplicate env var.
- **Middleware excludes all of `/api`** from session auth (existing
  comment: ingest routes use their own bearer-token auth). The new
  `/api/intake/leads` and `/api/collect` routes are meant to be public
  (called from the browser/server on the marketing site) — no auth is
  correct for those, gated instead by `x-intake-token` / CORS as specified.
  The new CSV export route (`/api/analytics/export`) is different: it's
  called from inside the logged-in portal, but because middleware skips
  `/api` entirely, it does its own `auth()` + `isStaff` check inside the
  route handler.
- **Rate limiting**: the prompt asks for a "lightweight rate limit per IP."
  This app runs on Vercel serverless functions with no shared in-memory
  state across invocations, so an in-memory limiter would not actually work
  (each cold start resets it, and concurrent instances don't share state).
  Implemented instead as a DB-backed check: reject if the same
  `ip_address` has already inserted 5+ leads in the last 10 minutes. Correct
  across instances, one extra indexed query per request.
- **World/EU map**: the prompt allows "a static SVG with fill intensity" in
  place of a full map library. Hand-plotting accurate country boundary paths
  without a map library is a large, low-value effort for this scope.
  Building the location breakdown as a per-country table with a
  proportional intensity bar per row instead, which conveys the same
  "volume by country" information. Flagged here in case Johan wants an
  actual map visual later — not built.
- **Chart library**: `recharts` is already a dependency (used by
  `components/charts/*`) — reusing it for the daily-visitors chart via the
  existing `lib/chart-theme.ts` token mapping. No new dependency added.
- **Status update UI**: the prompt says "persisted via PATCH." This app's
  existing convention for exactly this shape of UI (dropdown → mutate →
  revalidate) is a Next.js Server Action, e.g. `changeRequestStatus` in the
  Requests module — not a REST PATCH endpoint. Followed that convention for
  `website-leads` status changes instead of adding a new REST route.

## Phase 1 — Database schema

- Added `leads` and `pageviews` tables to `db/schema.ts` (Drizzle), migration
  `db/migrations/0002_overrated_kang.sql`. Applied to local dev DB and
  verified (`\dt` shows both tables, 14 total). Not yet applied to
  production — see handover checklist below.
- `lead_status` enum: `new | contacted | booked | won | lost`.
- `device_type` enum: `mobile | tablet | desktop`.
- Indexes: `leads(created_at)`, `leads(status)`, `leads(visitor_hash)`,
  `leads(ip_address, created_at)` (for the rate limiter);
  `pageviews(created_at)`, `pageviews(country)`, `pageviews(session_id)`,
  `pageviews(visitor_hash)`.
- Added `vitest` as a dev dependency (this project had no test runner at
  all) — needed for the ip-truncation unit test the prompt explicitly asks
  for. `npm test` runs it. This is the one new dependency added in the whole
  build; everything else (recharts, zod, drizzle) was already installed.

## Phase 2 — Lead intake API

- `POST /api/intake/leads`, `lib/ip.ts`, `lib/cors.ts`, `lib/rate-limit.ts`.
- Rate limit is DB-backed (5 leads / 10 min / IP), not in-memory — see
  Phase 0 note on why in-memory doesn't work on Vercel serverless.
- Honeypot field `_hp`: a filled value returns a normal `{ok:true}` response
  with a fresh random id, but nothing is inserted and no email is sent —
  bots get no signal that they were caught.
- `NOTIFY_EMAIL` from the prompt → reused the existing `AGENCY_NOTIFY_EMAIL`
  / `agencyInbox()` rather than adding a duplicate.
- Verified via curl: missing/wrong token → 401, missing required field →
  422 with issues, honeypot → 200 with no DB row, valid submission → 200 +
  id + row in `leads` + Resend gracefully skipped (no `RESEND_API_KEY` in
  dev) and logged, 5th+ rapid submission from the same IP → 429, CORS
  preflight → 204 with correct headers.

## Phase 3 — Analytics collector

- `POST /api/collect`, `lib/visitor-hash.ts`, `lib/ua-parse.ts`,
  `lib/referrer.ts`.
- UA parsing is a small custom regex-based parser (`lib/ua-parse.ts`) — no
  new dependency. Covers the realistic majority of traffic
  (Chrome/Safari/Firefox/Edge/Opera/Samsung Internet ×
  Windows/macOS/iOS/Android/Linux/ChromeOS); anything else returns `null`
  rather than a wrong guess.
- Bot filter is a UA substring match (`bot|crawler|spider|preview|headless|
  curl|wget|python-requests`) plus "no UA at all" — checked before any
  parsing or DB work.
- `ip_truncated` and `visitor_hash`: unit-tested (`lib/ip.test.ts`, 10
  tests, all pass — `npm test`). The full IP is read into memory once per
  request to compute `visitor_hash`; it is never itself written to
  `pageviews` (only `ip_truncated` is stored) — confirmed by reading the
  route source: the only place the raw `ip` variable is used for storage is
  as input to `truncateIp()`.
- Verified via curl: valid pageview → 204 + row inserted with correct
  referrer_domain/UTM/device/browser/os; bot UA → 204, no row; malformed
  JSON → 204, no row; missing required `path` → 204, no row (collector never
  surfaces an error to the caller, per spec).

## Phase 4 — Mainframe HQ UI

- **`website-leads` and `analytics` added as new, `admin`-only modules** in
  `lib/rbac.ts` (`MODULE_ACCESS`) — see the Phase 0 note for why these are
  not the existing `/leads` module. Verified with a second login as
  `manager@candelaria.demo` (`client_manager`): both routes redirect to
  `/dashboard` (middleware deny-by-default), and `/api/analytics/export`
  returns 401 for that session. `client_viewer` was not separately tested
  but has even less access (`dashboard`, `library` only) so is covered by
  the same middleware check.
- **`/website-leads`**: table (datum/naam/e-mail/bedrijf/status/land/bron),
  URL-param filters (status, period) via `LeadFilters.tsx` — same pattern as
  the existing `ConversationFilters.tsx`. No pagination — matches the
  existing Requests module, which also doesn't paginate; can be added later
  if lead volume grows enough to need it.
- **`/website-leads/[id]`**: full payload, full IP + location, status
  control (`LeadStatusControl.tsx`, same interaction pattern as the
  Requests module's `StatusControl.tsx`), and the journey panel — pageviews
  matching the lead's `visitor_hash` with `created_at <= lead.created_at`,
  chronological, capped at 100. Verified end-to-end with curl: seeded two
  linked pageviews + one lead sharing the same `visitor_hash`, confirmed
  both pageviews render in the journey panel on the detail page.
- **Status-change audit entries** are attributed to the acting staff
  member's own `org_id` (required NOT NULL FK on `audit_log`), with an
  explicit `meta: { scope: 'global' }` marker — see Phase 0 note. This is
  the one place org-scoping leaks into an otherwise non-org-scoped feature,
  purely for schema compatibility with the existing audit table.
- **`/analytics`**: period selector (today/7d/30d/all, URL param), 6 KPI
  cards (pageviews, unique visitors, sessions, pages/session, bounce rate,
  conversion rate), daily-visitors bar chart (recharts, reusing
  `lib/chart-theme.ts`), country/city/referrer/UTM/device/browser/OS
  breakdowns, top pages, a live-visitors widget (polls a server action every
  30s), and two CSV export links.
- **Bounce rate** = share of sessions with exactly 1 pageview. Verified with
  seeded data: 3 pageviews across 3 sessions (one session had 2 pageviews,
  two had 1 each) → bounce rate computed as 0.667, matching by hand.
- **Conversion rate** = leads in period ÷ unique visitors in period.
- **World/EU map**: built as a proportional intensity bar per row in each
  breakdown table instead of an actual map SVG — see Phase 0 note. Same
  component (`BreakdownTable`) reused for country, city, referrer, UTM,
  device, browser, and OS, so all "volume by X" breakdowns look and behave
  identically.
- **CSV export** (`GET /api/analytics/export?type=pageviews|leads&period=`):
  the one new API route that's session-gated instead of token-gated —
  middleware excludes all of `/api`, so this route calls `auth()` and checks
  `isStaff()` itself. Verified via curl with a real session cookie: returns
  a correctly-escaped CSV (JSON payload column properly quoted) for a
  logged-in admin, and 401 for a `client_manager` session.
- **Live widget** re-uses a Server Action (`fetchLiveVisitorCount`, itself
  gated by `requireModule('analytics')`) polled client-side every 30s,
  rather than a third public API route — kept the number of new
  publicly-reachable endpoints to exactly the two the prompt asked for
  (`/api/intake/leads`, `/api/collect`) plus the session-gated export route.

## Phase 5 — Weekly digest + verification + handover

- `GET /api/cron/weekly-digest`, `vercel.json` cron entry.
- **Vercel Cron schedules are UTC-only** — there is no way to express
  "Monday 08:00 Europe/Amsterdam" as a single static cron expression that's
  correct year-round (NL alternates UTC+1/CET and UTC+2/CEST). Set to
  `0 7 * * 1` (07:00 UTC), which is exactly 08:00 during CET (late
  Oct–late Mar) and 09:00 during CEST (late Mar–late Oct). No code fix
  without an external scheduler; flagged here rather than silently picking
  one and hoping nobody notices the summer drift.
- Auth: Vercel automatically adds `Authorization: Bearer <CRON_SECRET>` to
  cron-triggered requests when that env var is set on the project — the
  route checks for exactly that header, same mechanism, no extra plumbing.
- Skips sending if both pageviews and leads are zero for the week (verified
  via curl with an empty DB: `{"ok":true,"skipped":"no_data"}`, no email
  attempted). With data present, verified the computed numbers (3
  pageviews, 1 lead) and the correctly-built subject line and body, with
  Resend gracefully skipped per the existing `lib/email.ts` behavior.
- No audit-log entry for the cron send itself — there's no acting user/org
  for a scheduled system job, and forcing one through the same
  `scope: 'global'` workaround used for lead status changes felt like
  audit-log noise for an event that's already visible in Vercel's own cron
  execution logs. Flagged here as a deliberate omission, not an oversight.
- `docs/website-integration.md`: both lead-intake variants (server-proxy,
  recommended; direct-from-browser, with an explicit warning about the
  token being visible in that mode) and both analytics snippets (plain
  HTML/JS exactly as specified, plus a Next.js client-component variant).
- E2E verification performed (all via curl + a real session cookie against
  the local dev server + local Postgres, not just type-checking):
  - `npm test` → 10/10 pass (ip truncation + firstForwardedIp).
  - `npm run build` → clean production build, all new routes present.
  - Fake lead → 200 + row in `leads` → renders in `/website-leads` →
    Resend attempted (logged, skipped — no API key in dev).
  - Fake pageview journey (2 pageviews, same `visitor_hash`) → fake lead
    referencing that hash → journey panel on the lead detail page shows
    both pageviews, in order.
  - `/analytics` renders real KPIs/breakdowns from seeded data, numbers
    hand-verified against the raw rows.
  - CSV export produces valid, correctly-escaped CSV.
  - `client_manager` session blocked from both new routes and the export
    API (redirect / 401 respectively).
  - Weekly digest: unauthorized → 401; empty period → skipped, no send;
    populated period → correct numbers, graceful Resend skip.
  - All test data cleared from local DB after each verification pass.

### Env vars to set in Vercel (Production + Preview)

| Var | How to get it | Notes |
|---|---|---|
| `INTAKE_SECRET` | Generated locally, in `.env.local` | Give the same value to whoever wires up the website's proxy route |
| `ANALYTICS_SALT` | Generated locally, in `.env.local` | Rotating this invalidates all same-day visitor-hash linking (harmless — just breaks journey-linking for that one day) |
| `CRON_SECRET` | Generated locally, in `.env.local` | Vercel auto-injects this as a Bearer header for the cron job once the env var exists |
| `ALLOWED_ORIGIN` | Set to `https://candelaria-agency.netlify.app` locally — **confirm this is the right production origin** | CORS for both public endpoints |
| `AGENCY_NOTIFY_EMAIL` | Already exists (defaults to `j.candelaria171@gmail.com`) | No action needed unless you want a different inbox |
| `RESEND_API_KEY` | **Cannot be generated — you provide this** | Without it, lead/digest emails are logged, never sent. Everything else works fully without it. |
| `NEXT_PUBLIC_APP_URL` | Set to the real production URL (e.g. `https://mainframe-hq.vercel.app`) | Used in email deep-links |

The generated local values are in `.env.local` (gitignored, not committed) —
pull them from there with `grep -E 'INTAKE_SECRET|ANALYTICS_SALT|CRON_SECRET' .env.local`
if you want to reuse the exact same secrets in production, or generate fresh
ones for prod (recommended — local dev secrets shouldn't also be
production secrets).

### Manual steps remaining (Johan)

1. **Run the Phase 1 migration against the production database** (not done
   automatically in this build — schema changes to production get run
   deliberately, not silently). `npx drizzle-kit migrate` with
   `.env.production.local` pointed at prod, or via `npm run db:migrate` with
   the right `DATABASE_URL`.
2. Set the 7 env vars above in the Vercel dashboard (Production + Preview).
3. Deploy this build to production.
4. Wire up the two website-side snippets from `docs/website-integration.md`
   on `candelaria-agency.nl` (proxy route recommended for lead intake;
   either analytics snippet, mounted once site-wide).
5. **Update the website's privacy statement** — truncated-IP analytics under
   legitimate interest (no consent banner needed), full IP retained on lead
   form submissions specifically for security/fraud prevention. See the
   Privacy section of `docs/website-integration.md`.
6. Confirm `ALLOWED_ORIGIN` matches the website's actual production origin
   exactly (scheme + host, no trailing slash) — a mismatch here silently
   breaks CORS for both endpoints from the browser (server-to-server proxy
   calls for lead intake are unaffected either way).
7. If/when Johan wants Resend live: add `RESEND_API_KEY` — no code changes
   needed, `lib/email.ts` already handles both states.

### Known limitations

- Rate limiting is per-IP only (5 submissions / 10 min) — a distributed
  bot spraying different IPs isn't caught by this. The honeypot catches
  unsophisticated bots; nothing here catches a targeted, sophisticated
  attacker. Not asked for in the prompt; flagging as a ceiling on what
  "lightweight" anti-spam actually stops.
- UA parsing (`lib/ua-parse.ts`) is a small custom parser, not exhaustive —
  uncommon browsers/OSes return `null` rather than a guess. Good enough for
  aggregate breakdowns; not meant to be forensically precise per visitor.
- Weekly digest cron time drifts by 1 hour during CEST (see Phase 5 note).
- No pagination on `/website-leads` — fine at current volume, would need
  revisiting if lead volume grows substantially.
- Location breakdown is a table with an intensity bar, not an actual
  geographic map — see Phase 0 note.

---

# Prospecting — Leads Agent (ported from an independent 11-phase build)

Autonomous port log. A full Leads Agent (Dutch MKB prospecting: discovery,
website audit, fit/pain scoring, AI outreach drafting, outbound
dry-run-to-live scaffolding) was previously built end-to-end — 11 phases,
fully verified — on a separate branch against an *older* snapshot of this
app (NextAuth v4, `drizzle/schema.ts`, `@vercel/postgres`). By the time that
work was ready to merge, this repo's `main` had moved on to a different,
incompatible architecture (NextAuth v5, `db/schema.ts`, RBAC modules,
org-scoped multi-tenancy) whose own migrations 0000–0003 had — per this very
file's Phase 1 "Manual steps remaining" note above — never actually been
applied to a real production database either. Rather than merge two
incompatible schemas, the entire feature was re-ported onto the current
architecture from scratch, reusing all proven business logic verbatim and
rebuilding only the integration layer (schema, auth, routes, pages).

## Module placement — a real product conflict, not just a naming collision

`MODULES` already has a `'leads'` entry (see Phase 0 above): a future,
per-org client CRM, not built out yet beyond its `EmptyState` stub. This
feature is the opposite — Candelaria's own internal tool for finding *new*
clients, structurally identical in kind to `website-leads`/`analytics`
(Candelaria's own data, never a client's). Added as its own module,
**`prospecting`**, in `STAFF_ONLY_MODULES` — never visible to `client_manager`
or `client_viewer`, and never touching the client-facing `leads` table.

## Schema

All new tables live in `db/schema.ts` (this repo's single-file convention,
not a separate module file) under a `prospect_` prefix — `prospect_leads`,
`prospect_runs`, `prospect_run_tasks`, `prospect_events`, `prospect_signals`,
`prospect_contacts`, `prospect_audits`, `prospect_packs`,
`prospect_page_cache`, `prospect_config`, `prospect_sequences`,
`prospect_mailboxes`, `prospect_enrollments`, `prospect_replies`,
`prospect_outbox`, `prospect_send_log`, `prospect_suppression`, plus one new
addition not in the original build, `prospect_ai_calls` (see below). None
are `org_id`-scoped, matching `leads`/`pageviews`'s precedent. Migration
`db/migrations/0004_freezing_sleepwalker.sql` is purely additive — new enum
types and tables only, no `ALTER`/`DROP` on anything pre-existing — generated
via `npm run db:generate`, **not yet applied to any database** (see "Not
done" below).

- **`AuthGuard`**: no `requireAdmin(){ok,status,session}` helper exists on
  this main (see `lib/session.ts`). Pages/actions use
  `requireModule('prospecting')` + `isStaff(role)`; the three new
  `/api/prospecting/**` routes (tick, events, run-status — needed for
  client-side run polling, which doesn't fit the server-action model) do
  their own `auth()` + `isStaff()` check, matching `/api/analytics/export`'s
  existing precedent, since middleware excludes all of `/api`.
- **Audit trail**: `recordAudit()` requires a non-null `org_id` FK. Since
  this module has no org context, every audit call attributes the row to
  the *acting staff member's own org* with an explicit `meta: {scope:
  'global'}` marker — identical to `website-leads/actions.ts`'s existing
  pattern for the same structural problem.
- **`prospect_ai_calls`** (new table, didn't exist in the original build):
  the original port's AI-cost logging piggybacked on a generic `agent_runs`
  table that doesn't exist on this architecture. Rather than force a
  dependency on an unrelated table, gave the module its own minimal
  per-call usage log (`purpose`, `model`, tokens, `cost_eur`, `run_id`) —
  `checkAiBudget()`/`getTodaySpendEur()` sum across it directly.
- **Widened `prospect_send_result` enum**: the original build's `send_log`
  table used a free-text `varchar` and the actual code referenced `bounce`
  and `spam_complaint` values that a first-pass narrow enum
  (`sent|blocked|failed`) missed — caught by TypeScript the moment
  `health/thresholds.ts` and `outbound/mailbox-health.ts` were ported and
  typechecked against the stricter enum. Fixed by widening the enum to all
  five real values actually used in the codebase.
- **`socials_json`/`AuditRaw`/`CreateRunParams`**: a few `jsonb` columns were
  first typed too narrowly during the port (guessed shapes rather than
  checked against the actual data written to them) — caught the same way,
  by TypeScript refusing the insert once the real shape was ported over.
  Fixed to match the real shapes (`ContactField[]` for socials, explicit
  casts where a domain-specific interface is intentionally stored as opaque
  JSON).

## What ported mechanically vs. what needed real rework

The entire `lib/leads-agent/**` tree (54 files — discovery, crawler,
extraction, audit, scoring, AI prompts, orchestration, outreach, outbound,
health, retention, suppression) is architecture-agnostic pure logic. The
port was a scripted rename pass (table identifiers, `@/drizzle/schema` →
`@/db/schema`, `@/lib/db` → `@/db`) followed by fixing what the compiler
caught — not a rewrite. Two real bugs were introduced and caught by that
same process, both worth naming since they'd have been silent otherwise:
1. A word-boundary regex rename (`leads` → `prospectLeads`) also matched
   inside the *path segment* `leads-agent`, silently corrupting every
   internal `@/lib/leads-agent/*` import. Caught immediately by the first
   typecheck (every file failed to resolve its own siblings) and reverted
   with a second pass.
2. The same rename corrupted a handful of **Dutch user-facing strings** and
   **event-code string literals** that happened to contain the word "leads"
   (e.g. an error message, an `EventCode` union member). These do NOT throw
   type errors — a corrupted string is still a valid string. Caught only by
   manually grepping every renamed identifier against comments/string
   literals after the fact. Flagging this class of bug explicitly: a
   scripted identifier rename across a codebase with embedded natural-language
   strings needs a dedicated find pass for prose, not just a clean
   `tsc --noEmit`.

Everything under `app/(app)/prospecting/**`, `app/api/prospecting/**`, and
`components/prospecting/**` is new, hand-written against this repo's real
conventions (`requireModule`/`requireMutator`, `'use server'` actions files,
`lib/queries/<module>.ts` data layer, `lib/nl.ts` copy, `lib/labels.ts`
status→tone maps, the `card`/`field`/`btn-primary`/`btn-ghost`/`label`
utility classes, `components/ui/{PageHeader,Tabs,Pill,EmptyState}`) — not a
reskin of the old Tailwind-utility-class UI, which used a visually different
design system (`bg-white`/`text-gray-900`/`rounded-lg` vs. this app's
serif-display/mono-label token system).

- **A real webpack bug caught only by `npm run build`, not `tsc`**:
  `components/prospecting/LeadFilters.tsx` (a `'use client'` component)
  imported a plain constant array from `lib/queries/prospecting.ts` — which
  itself imports `@/db` (the `postgres` driver, Node-only). `tsc --noEmit`
  saw no problem (both are just TypeScript); `next build`'s webpack pass
  correctly refused to bundle `net`/`tls`/`fs`/`perf_hooks` into a client
  chunk. Fixed by inlining the tiny constant directly in the client
  component and importing only the `type` (erased at compile time, safe)
  from `@/db/schema`. Worth remembering as a category: a clean `tsc` does
  not guarantee a clean client bundle when a shared "constants" file also
  happens to import a server-only module.
- **Console polling redesigned, not just re-skinned**: the original run
  console's start/cancel actions became `'use server'` actions
  (`startRunAction`/`cancelRunAction` in `app/(app)/prospecting/actions.ts`)
  instead of `fetch()` calls to bespoke API routes, matching this repo's
  real mutation convention. The tick/events/status polling loop stayed as
  three small API routes (`/api/prospecting/runs/[id]/{tick,events,route}`)
  since repeated client-side polling doesn't fit the server-action model —
  the same reasoning `/api/analytics/export` already established for "GET
  called from inside the portal."
- **Cron sweeper added, not in the original build's Vercel-targeted design**:
  the original 11-phase build assumed Netlify (no cron infra referenced),
  so run progress depended entirely on a browser tab polling. This repo
  already has a real Vercel cron precedent (`/api/cron/weekly-digest`,
  `CRON_SECRET` bearer auth, registered in `vercel.json`). Added
  `/api/cron/prospecting-sweeper` (every 5 minutes) following that exact
  pattern, so a run keeps moving even with no tab open — registered in
  `vercel.json` alongside the existing cron.

## Verification

`npx tsc --noEmit` and `npm run build` both clean across the full port
(schema, all `lib/leads-agent/**` modules, all new routes/pages/actions/
components). **Not yet verified live against a real database** — see below.

## Not done / open before this can go live

- **No migration has been applied to any real database yet.** This
  environment's `DATABASE_URL` points at the *old* architecture's database
  (the one the original 11-phase build ran against by hand-written SQL) —
  confirmed directly: attempting `db:migrate` against it fails immediately
  on migration `0000` (`relation "audit_log" already exists`), because that
  database still has the old schema's tables, not this repo's. Per this
  file's own Phase 1 notes above, migrations 0000–0003 (the foundational
  `organizations`/`users`/`agents`/`website-leads`/`analytics` schema) were
  **also** never applied to a real production database — meaning this
  entire architecture, prospecting included, is still pre-launch. Whoever
  points `DATABASE_URL` at the real target database needs to run
  `npm run db:migrate` once, which will apply 0000 through 0004 (this
  port's migration) together, cleanly, on an empty database.
- **Zero live verification** of the ported logic against real data —
  everything here is typecheck+build verified, not run-and-observed, unlike
  every phase of the original build (which was extensively live-tested
  against real OSM/DNS/RDAP data and a real, if differently-shaped,
  database). Once a real `DATABASE_URL` exists, re-run the same live checks
  the original build already did (see the original branch's own decisions
  log for the exact list) against this port.
- **No `ANTHROPIC_API_KEY`** in this environment either — the AI layer
  (sector classification, pain briefs, outreach drafting, call prep, reply
  classification) has never been exercised against a real model response,
  in either the original build or this port.
- **CSV/JSON pack export** (`/api/agents/leads/packs/export` in the original
  build) was not ported — no button in the new UI calls it, so it wasn't
  rebuilt. Straightforward to add following the `/api/analytics/export`
  pattern already in this repo if wanted.
- **ICP editing** still has no UI (matches the original build's own
  documented gap) — `saveConfigAction('icp', ...)` exists and works, but
  nothing in `/prospecting/instellingen` calls it yet for the ICP section.
