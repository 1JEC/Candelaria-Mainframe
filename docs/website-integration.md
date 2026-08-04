# Website integration — lead intake + analytics

Two independent integrations connect `candelaria-agency.nl` (hosted
anywhere) to this Mainframe HQ deployment over plain HTTPS. Neither requires
the website to be a Next.js app or share infrastructure with Mainframe HQ.

- **Lead intake** (`POST /api/intake/leads`) — the "Book an audit call" form.
- **Analytics collector** (`POST /api/collect`) — pageview beacon, fired on
  every page load.

Replace `<mainframe-hq-domain>` below with the actual production domain.

## 1. Lead intake

### Required env vars (this app)

| Var | Purpose |
|---|---|
| `INTAKE_SECRET` | Shared secret the website sends as `x-intake-token` |
| `ALLOWED_ORIGIN` | The website's origin, for CORS |
| `AGENCY_NOTIFY_EMAIL` | Where the new-lead notification goes (defaults to Johan's address) |
| `RESEND_API_KEY` | Optional — without it, notifications are logged, not sent |

### Recommended: server-side proxy

The website's own backend forwards to Mainframe HQ, so `INTAKE_SECRET` never
reaches the browser. This is the safer of the two options and is what you
should use if the website has any server runtime at all (Next.js API route,
a small Express/serverless function, etc.).

**Website-side route** (`/api/book-audit` on the website, Next.js example):

```ts
// app/api/book-audit/route.ts — runs on the website's own server
export async function POST(req: Request) {
  const body = await req.json()

  const res = await fetch('https://<mainframe-hq-domain>/api/intake/leads', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-intake-token': process.env.MAINFRAME_INTAKE_SECRET!, // server-only env var
    },
    body: JSON.stringify(body),
  })

  return new Response(await res.text(), { status: res.status })
}
```

**Website form** posts to its own `/api/book-audit` — no secret, no CORS
concerns (same-origin).

### Alternative: direct from the browser

Only use this if the website is fully static with no server runtime at all.
The token is visible in the browser's network tab — anyone can read it and
submit leads directly. `INTAKE_SECRET` should be treated as low-value in
this mode (it stops casual scraping, not a determined attacker).

```html
<form id="audit-form">
  <input name="name" required />
  <input name="email" type="email" required />
  <input name="company" />
  <input name="phone" />
  <textarea name="message"></textarea>
  <!-- Honeypot: hidden via CSS, must stay empty. Bots that fill every field
       trip this and are silently dropped server-side. -->
  <input name="_hp" style="position:absolute;left:-9999px" tabindex="-1" autocomplete="off" />
  <button type="submit">Plan een audit</button>
</form>

<script>
  document.getElementById('audit-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const form = new FormData(e.target)
    const sid = sessionStorage.getItem('cdl_sid')
    const p = new URLSearchParams(location.search)

    const res = await fetch('https://<mainframe-hq-domain>/api/intake/leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-intake-token': '<INTAKE_SECRET — see warning above>',
      },
      body: JSON.stringify({
        name: form.get('name'),
        email: form.get('email'),
        company: form.get('company'),
        phone: form.get('phone'),
        message: form.get('message'),
        _hp: form.get('_hp'),
        session_id: sid,
        utm_source: p.get('utm_source'),
        utm_medium: p.get('utm_medium'),
        utm_campaign: p.get('utm_campaign'),
      }),
    })
    const data = await res.json()
    if (data.ok) e.target.reset()
  })
</script>
```

### Response

```json
{ "ok": true, "id": "5d82dd4d-bc04-4781-88a9-bc641a3fd52e" }
```

`401` wrong/missing token · `422` validation failed · `429` rate-limited
(same IP, 5+ submissions in 10 minutes) · `413` body over 32KB.

## 2. Analytics collector

No auth token — this is a public beacon endpoint, same pattern as any
first-party analytics script. Bot traffic and the geo/IP handling are all
server-side; the website only needs to fire the beacon.

**Geo headers work because the beacon request lands on this Vercel
deployment** (`x-vercel-ip-country` etc. are added by Vercel's edge network
to any request hitting a Vercel-hosted function) — this is true regardless
of where `candelaria-agency.nl` itself is hosted (Netlify, anywhere).

### Plain HTML/JS (add once, site-wide — e.g. in the root layout)

```html
<script>
  (function () {
    try {
      var sid = sessionStorage.getItem('cdl_sid') ||
        (sessionStorage.setItem('cdl_sid', crypto.randomUUID()), sessionStorage.getItem('cdl_sid'));
      var p = new URLSearchParams(location.search);
      navigator.sendBeacon('https://<mainframe-hq-domain>/api/collect', JSON.stringify({
        site: 'candelaria-agency',
        path: location.pathname,
        referrer: document.referrer,
        session_id: sid,
        utm: { source: p.get('utm_source'), medium: p.get('utm_medium'), campaign: p.get('utm_campaign') }
      }));
    } catch (e) {}
  })();
</script>
```

### Next.js client-component variant

```tsx
// components/Analytics.tsx — mount once in the root layout
'use client'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

const ENDPOINT = 'https://<mainframe-hq-domain>/api/collect'

export function Analytics() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    try {
      let sid = sessionStorage.getItem('cdl_sid')
      if (!sid) {
        sid = crypto.randomUUID()
        sessionStorage.setItem('cdl_sid', sid)
      }
      navigator.sendBeacon(ENDPOINT, JSON.stringify({
        site: 'candelaria-agency',
        path: pathname,
        referrer: document.referrer,
        session_id: sid,
        utm: {
          source: searchParams.get('utm_source'),
          medium: searchParams.get('utm_medium'),
          campaign: searchParams.get('utm_campaign'),
        },
      }))
    } catch {
      // sendBeacon/sessionStorage unavailable — fail silently, never block rendering
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  return null
}
```

### Linking a lead to its pageview journey

The same `cdl_sid` (`session_id`) read for `/api/collect` should be sent
along with the lead submission's `session_id` field. Mainframe HQ links a
lead to its pageviews via `visitor_hash` (server-derived, daily-rotating —
see `lib/visitor-hash.ts`), not `session_id` directly, but both are useful:
`session_id` for same-session journeys, `visitor_hash` for same-day journeys
across sessions. Send both from the website where available.

## Privacy

- Pageview IPs are stored **truncated only** (`ip_truncated`, last IPv4
  octet masked / IPv6 collapsed to 3 groups) — never a full address. Legal
  basis: legitimate interest, no consent banner required for this.
- Lead form submissions store the **full IP** (`ip_address`) — legal basis:
  legitimate interest for security/fraud prevention on an active,
  user-initiated submission (not for tracking).
- **Update the website's privacy statement** to reflect both of the above
  before this goes live. See the handover note in `DECISIONS.md`.
