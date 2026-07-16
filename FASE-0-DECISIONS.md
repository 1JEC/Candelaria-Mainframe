# Fase 0 — Decisions Awaiting Johan

All code structure is ready. These decisions must be made before Fase 1 starts.

## 1. Meta Graph API Setup

**What we need**: App ID, App Secret, Facebook Page ID, Instagram Business Account ID

**Action**: 
- [ ] Go to [meta.com/developers](https://developers.facebook.com)
- [ ] Create or select existing Meta App
- [ ] Connect Facebook Business Account and Facebook Page
- [ ] Connect Instagram Business Account
- [ ] Generate long-lived token (refresh every 60 days, handle in code)
- [ ] Provide credentials

**Related files**: `env.example`, `lib/adapters/meta-graph.ts` (Fase 3)

---

## 2. X (Twitter) API Setup

**What we need**: API Key, API Secret, Bearer Token, Access Token, Access Secret, **Tier specification**

**Tier Impact**:
- **Free**: Limited posts/analytics. Max 300 posts/month, reduced metrics.
- **Basic**: $100/month. More posts, full analytics.
- **Pro**: $5,000/month. Enterprise support, highest limits.

**Decision**: Which tier? (Recommend **Basic** for serious publishing)

**Action**:
- [ ] Go to [developer.twitter.com](https://developer.twitter.com)
- [ ] Create app or select existing
- [ ] Set tier (free/basic/pro)
- [ ] Generate credentials (API Key, Secret, Bearer Token, Access Token, Secret)
- [ ] Provide tier + credentials

**Related files**: `env.example`, `lib/adapters/x-api.ts` (Fase 3)

---

## 3. Database — Vercel Postgres or Neon?

**Vercel Postgres** (recommended):
- Managed by Vercel (easy integration)
- Storage: $0.50/GB/month
- Included in Vercel hobby tier if project on Vercel

**Neon** (alternative):
- Free tier 3GB, $0.15/GB after
- Works with Vercel

**Decision**: Which provider? How much monthly budget?

**Action**:
- [ ] Choose provider (Vercel Postgres vs Neon)
- [ ] Create database
- [ ] Provide connection string (`DATABASE_URL`)

**Related files**: `env.example`, `drizzle/drizzle.config.ts`

---

## 4. Resend — Domain Setup

**What we need**: API Key + verified domain for outbound email

**Action**:
- [ ] Go to [resend.com](https://resend.com)
- [ ] Create account or use existing
- [ ] Generate API Key
- [ ] Add custom domain (e.g., `mail.candelaria-agency.com`)
- [ ] Setup SPF + DKIM records
- [ ] Verify domain
- [ ] Provide API Key + verified domain

**Related files**: `env.example`, `lib/adapters/resend.ts`

---

## 5. Proton Mail Setup

**Current situation**: Existing Proton account exists (j.candelaria171@gmail.com uses proton)

**What we need**: 
- Confirm Proton account has **Bridge capability** (requires Proton Mail Plus)
- Proton Bridge running locally or on always-on worker
- Bridge password (different from login password)

**Action**:
- [ ] Confirm Proton subscription tier (Plus or higher for Bridge)
- [ ] Download/setup Proton Mail Bridge
- [ ] Test Bridge IMAP/SMTP connection (localhost:1143 for IMAP, 1025 for SMTP)
- [ ] Set Bridge password
- [ ] Provide Bridge credentials for worker

**Related files**: `env.example`, `worker/proton-bridge-sync.ts` (Fase 4)

---

## 6. Always-On Worker (for Proton Sync)

**What we need**: A cheap VPS to run the Proton Bridge sync worker 24/7

**Options**:
- **Hetzner CX11** (~€3.50/month, 1 vCPU, 1GB RAM, Germany)
- **Linode Nanode** (~$6/month, 1 vCPU, 1GB RAM, US)
- **DigitalOcean Droplet** (~$6/month, 1 vCPU, 1GB RAM)
- **Fly.io** (~$3-5/month, Docker-native)
- **Railway** (~$7-10/month, simple deployments)

**Action**:
- [ ] Choose VPS provider
- [ ] Provision instance (Linux, ~1GB RAM sufficient)
- [ ] Provide access details (SSH key, IP) to set up worker
- [ ] Confirm budget (typically €3-10/month)

**Related files**: `worker/Dockerfile`, `worker/docker-compose.yml`

---

## 7. Portal Subdomain

**What we need**: A subdomain pointing to the Vercel deployment

**Examples**:
- `hq.candelaria-agency.com`
- `mainframe.candelaria-agency.com`
- `ops.candelaria-agency.com`

**Action**:
- [ ] Choose subdomain
- [ ] Update DNS records to point to Vercel (typically a CNAME to `cname.vercel-dns.com`)
- [ ] Verify domain in Vercel dashboard
- [ ] Provide subdomain

**Related files**: `next.config.ts` (headers), `env.example` (`NEXTAUTH_URL`)

---

## 8. Email Auto-Reply Configuration

**What we need**: Which email categories should automatically reply (without approval)?

**Examples of categories** (AI triage):
- `new_request` — New intake form
- `customer` — Existing customer
- `invoice` — Payment/invoice
- `acknowledgment` — Simple "thanks for reaching out"
- `other` — Miscellaneous

**Decision**: Which categories can auto-reply? Which need approval?

**Recommendation**:
- ✅ Auto-reply: `acknowledgment` (simple, low-risk)
- ✅ Manual approval: `new_request`, `customer`, `invoice`

**Action**:
- [ ] Decide which categories auto-reply
- [ ] Provide list

**Related files**: `drizzle/schema.ts` (`settings.emailAutoReplyCategories`), Fase 4

---

## 9. Encryption Key Generation

**What we need**: A random 256-bit AES key (for encrypting API credentials at rest)

**How to generate** (run once):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Action**:
- [ ] Generate key (command above)
- [ ] Store ONLY in Vercel env var `ENCRYPTION_KEY` (NEVER in code)
- [ ] Also store in `.env.local` for local dev

**Related files**: `lib/crypto.ts`, `env.example`

---

## 10. Google Places API (Optional, for Prospecting)

**What we need**: API key for prospect research (Fase 5, not critical)

**Action**:
- [ ] Optional for now; can add in Fase 5
- [ ] If needed: [console.cloud.google.com](https://console.cloud.google.com) → Enable Google Places API

**Related files**: `env.example` (`GOOGLE_PLACES_API_KEY`)

---

## Summary Checklist

- [ ] Meta Graph API (App ID, App Secret, Page ID, IG Account ID)
- [ ] X API (Key, Secret, Token, Access Token + **Tier**)
- [ ] Database (Vercel Postgres or Neon conn string)
- [ ] Resend (API Key + verified domain)
- [ ] Proton Mail (confirm Bridge available, test credentials)
- [ ] Always-on Worker VPS (choose provider, provision, provide SSH access)
- [ ] Portal subdomain (choose, setup DNS, verify)
- [ ] Email auto-reply categories (decide which → auto, which → manual)
- [ ] Encryption key (generate, store in env)

---

## Timeline

Once all ✅ confirmed, **Fase 1 starts immediately** (~1-2 weeks):
- Auth system (credentials + 2FA)
- Dashboard shell
- Database operations
- Audit logging setup

**Questions?** Ask Johan before filling these in — do NOT guess.
