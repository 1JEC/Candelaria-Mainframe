# Candelaria Mainframe

Client portal for Candelaria Agency's Owned Operations Layer. One Vercel
project and one Postgres database per client instance.

- **UI copy:** Dutch, centralised in `lib/nl.ts`
- **Code, comments, docs:** English
- **Design tokens:** `brand-tokens.json` is the single source of truth. No
  hardcoded colour, font, radius or spacing values in components.

## Stack

| | |
|---|---|
| Framework | Next.js App Router + TypeScript |
| Styling | Tailwind v3, theme generated from `brand-tokens.json` |
| Database | Postgres via Drizzle ORM (postgres.js driver) |
| Auth | Auth.js (NextAuth v5), credentials + JWT sessions |
| Charts | Recharts (from Phase 3) |
| Email | Resend — the only notification channel (from Phase 4) |

## Local setup

```bash
npm install
cp .env.example .env.local     # then fill in DATABASE_URL and AUTH_SECRET
createdb candelaria_mainframe
npm run db:migrate
npm run db:seed
npm run dev                    # http://localhost:3100
```

Generate secrets with `openssl rand -base64 32`.

### Demo accounts

Seeded into a clearly labelled demo organization (`is_demo = true`).
Password for all three: `mainframe-demo`.

| E-mail | Role | Access |
|---|---|---|
| `admin@candelaria.demo` | `admin` | Everything, across organizations |
| `manager@candelaria.demo` | `client_manager` | All modules for their own org |
| `viewer@candelaria.demo` | `client_viewer` | Dashboard + Bibliotheek, read-only |

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server on port 3100 |
| `npm run build` | Production build |
| `npm run db:generate` | Generate a migration from `db/schema.ts` |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:seed` | Insert/refresh the demo org and users |
| `npm run db:seed:phase2` | Seed demo agents, conversations, requests, changelog |
| `npm run db:studio` | Drizzle Studio |

## Ingest API

External systems (agent runtimes, automations) write into the portal through
`/api/ingest/*`. Every request needs a per-organization bearer token — tokens
live in `ingest_tokens`, are stored hashed, and scope the write to one org. The
portal UI itself never uses these routes.

### `POST /api/ingest/conversations`

Upserts conversations by `external_id`. Re-posting the same `external_id`
updates the row in place and **replaces** the transcript, so the source system
stays authoritative. An `escalated` outcome automatically opens exactly one
escalation. Agents are matched by name and are never created implicitly — an
unknown name returns 422 listing the offenders.

```bash
curl -X POST http://localhost:3100/api/ingest/conversations \
  -H "Authorization: Bearer $MAINFRAME_INGEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conversations": [
      {
        "external_id": "crm-8891",
        "agent": "Sofie",
        "started_at": "2026-08-03T09:12:00Z",
        "ended_at": "2026-08-03T09:18:00Z",
        "channel": "whatsapp",
        "outcome": "escalated",
        "sentiment": "negative",
        "topic": "Levertijd",
        "token_input": 820,
        "token_output": 410,
        "messages": [
          { "role": "user", "content": "Waar blijft mijn bestelling?" },
          { "role": "assistant", "content": "Ik zet dit door naar een collega." }
        ]
      }
    ]
  }'
```

Response: `{ "ok": true, "created": 1, "updated": 0 }`

| Field | Required | Notes |
|---|---|---|
| `external_id` | yes | Idempotency key, max 200 chars |
| `agent` | yes | Must match an existing agent name in the org |
| `started_at` | yes | ISO 8601 |
| `ended_at` | no | Omit for unfinished conversations; duration then reads `—` |
| `channel` | no | Defaults to `web` |
| `outcome` | yes | `resolved` · `escalated` · `abandoned` |
| `sentiment` | no | `positive` · `neutral` · `negative`, defaults to `neutral` |
| `topic` | no | Drives the top-10 topics breakdown |
| `token_input` / `token_output` | no | Default `0` |
| `messages[]` | no | `role` is `user` · `assistant` · `system`; max 500 per conversation |

Batch limit is 100 conversations per request.

| Status | Meaning |
|---|---|
| `200` | Written; body reports `created` / `updated` counts |
| `401` | Missing or malformed `Authorization` header |
| `403` | Token not recognised or revoked |
| `422` | Payload failed validation, or references an unknown agent |

Each call appends one `ingest.conversations` row to `audit_log` with the
counts and the token id — writes are attributable without storing the token.

## Layout

```
app/(app)/          authenticated shell — sidebar, topbar, module pages
app/login/          unauthenticated login screen
auth.ts             Auth.js instance (database + bcrypt)
auth.config.ts      edge-safe half, imported by middleware
middleware.ts       route protection + deny-by-default module gating
db/schema.ts        Drizzle schema
lib/nl.ts           all Dutch UI copy
lib/rbac.ts         role → module access map
lib/audit.ts        append-only audit trail helper
brand-tokens.json   design tokens (see BRAND-AUDIT.md)
```

## Conventions

- Every mutation writes one row to `audit_log` via `recordAudit()`.
- Seed and demo rows carry `is_demo = true` and are always labelled in the UI.
- Empty states render `<EmptyState />` ("Nog geen data"); never placeholder
  numbers or invented sample rows.
- Module access is deny-by-default: a module missing from `MODULE_ACCESS` is
  hidden from the nav *and* blocked in middleware.
