# Brand Audit — Candelaria Mainframe

Phase 0 deliverable. Everything below was extracted from the live Candelaria
Agency website source; nothing was invented. Where a value had to be derived,
it is marked **[derived]** and the derivation is shown.

## 1. Source

| | |
|---|---|
| Audited folder | `~/Desktop/Candelaria agency/candelaria-website-demo-187n` |
| What it is | The Next.js 14 App Router marketing site, currently live at https://candelaria-agency.netlify.app |
| Files read | `tailwind.config.ts`, `app/globals.css`, `app/layout.tsx`, `components/sections/Navbar.tsx`, `public/logo*.png` |

`~/Desktop/` contained one plausible candidate (`Candelaria agency/`, capital C),
which holds a single project folder. Confirmed with you before proceeding.

## 2. Colours found

Straight from `tailwind.config.ts`:

| Role | Token | Value |
|---|---|---|
| Deepest warm brown-black (page bg) | `ink` | `#1a1512` |
| Panel / card surface | `ink.soft` | `#221c17` |
| Hairline border | `ink.line` | `#332a23` |
| Secondary text on dark | `ink.mute` | `#9a8f86` |
| Light surface | `cream` | `#f5f2ed` |
| Light surface, deeper | `cream.deep` | `#ebe6de` |
| Light border | `cream.line` | `#ddd6cb` |
| **Accent (primary)** | `flame` | `#e8552a` |
| Accent hover | `flame.hover` / `primary.hover` | `#d1471f` |
| Success / secondary | `moss` | `#4a9d5f` |
| Success hover | `moss.hover` | `#3d8450` |

Transparent variants also present: `flame.soft` `rgba(232,85,42,0.12)`,
`flame.line` `rgba(232,85,42,0.35)`, `flame.glow` `rgba(232,85,42,0.25)`,
`moss.soft` `rgba(74,157,95,0.15)`.

### The gold question — resolved

The master prompt assumed a **primary gold**. That was the one real conflict:
gold exists **only inside the logo raster**. There is no gold token anywhere in
the Tailwind config or CSS, and no gold pixel in the rendered UI. The entire
site UI runs on flame orange `#e8552a`.

Your decision: **flame stays the only interactive accent; gold is reserved for
brand moments** (monogram, login screen, report headers). That is encoded in
`brand-tokens.json` under `meta.accentPolicy` and must be respected in every
later phase.

### Gold scale **[derived]**

No gold token existed, so I sampled it from the artwork rather than guessing.
Method: read `public/logo.png`, keep opaque pixels with HSV saturation > 0.20,
value > 0.20 and hue in 0.06–0.16 (47 365 pixels), sort by brightness and take
percentiles.

| Token | Value | Percentile |
|---|---|---|
| `gold.shadow` | `#af7912` | p05 |
| `gold.deep` | `#bd8f2f` | p25 |
| `gold.DEFAULT` | `#cba23c` | p50 |
| `gold.light` | `#deba57` | p78 |
| `gold.highlight` | `#f7d671` | p95 |

### Status colours **[derived]**

A dashboard needs success/warning/danger; the marketing site only had two of
the three. Rather than invent a colour I reused existing brand values:

| Semantic | Value | Origin |
|---|---|---|
| `success` | `#4a9d5f` | existing `moss` |
| `warning` | `#cba23c` | derived `gold.DEFAULT` |
| `danger` | `#d1471f` | existing `flame.hover` / `primary.hover` |

## 3. Typography found

From `app/layout.tsx` (all three are `next/font/google`):

| Family | Variable | Weights | Role on the site |
|---|---|---|---|
| **Newsreader** (serif) | `--font-newsreader` | 300, 400, 500 + italic | Display headings, wordmark |
| **Inter** (sans) | `--font-inter` | variable | Body, UI — set as `font-sans` on `<body>` |
| **JetBrains Mono** | `--font-mono` | 400, 500 | Eyebrow labels, pills, badges |

Two signature type treatments were carried over verbatim:

- `.label` — `font-mono`, `11px`, `uppercase`, `letter-spacing: 0.18em`
- `.display` — `font-serif`, `font-normal`, `letter-spacing: -0.02em`, `line-height: 1.05`

### Montserrat — not found

The master prompt expected a Montserrat wordmark. **Montserrat does not appear
anywhere in the project.** The wordmark is not an asset at all: `Navbar.tsx`
renders the literal text `Candelaria` in `font-serif` (Newsreader) next to the
logo image. Per your decision the portal does exactly the same, so no third
typeface is introduced.

### Type scale **[derived]**

The site's scale is cinematic (hero runs to `5.75rem`). A dashboard needs
something denser, so I compressed it while keeping the same fonts, tracking and
serif/sans split. Full scale in `brand-tokens.json` → `typeScale`
(`label` 11px → `display` 56px, with `kpi` at 40px serif for headline figures).

## 4. Logo assets

Copied to `/public/brand/`:

| File | Dimensions | Notes |
|---|---|---|
| `logo.png` | 468 × 400 | Primary monogram, used in the site navbar |
| `logo-transparent.png` / `.webp` | 1024 × 1024 | Larger square variant |
| `logo-mark.png` / `.webp` | 596 × 213 | Wide crop |

**No SVG exists.** The master prompt expected a "gold monogram SVG"; only
rasters are available. Per your decision we use the PNG/WebP as-is and render
the wordmark as live Newsreader text — identical to the marketing site.

The monogram is a gold gradient "C" with two swooping strokes. It is the only
place gold appears, which is exactly why the accent policy above matters.

## 5. Radii, shadows, spacing

| | Found on the site | In the portal |
|---|---|---|
| Buttons / pills | `rounded-full` | unchanged — `radius.full` |
| Inputs | `rounded-lg` (8px) | `radius.md` 8px |
| Scrollbar thumb | `6px` | `radius.sm` 6px |
| Cards | *(site has almost no cards)* | **[derived]** `radius.lg` 12px |
| Shadows | none — the site is flat, depth comes from huge blurred glows | **[derived]** subtle `sm`/`md`/`lg` for dashboard elevation; the glows are kept as `glowFlame` / `glowGold` |
| Content width | `max-w-[1400px]` | unchanged |

Layout metrics (sidebar 248px, topbar 64px, card padding 20px) are **[derived]**
— the marketing site has no dashboard chrome to copy from.

## 6. Visual motifs

| Motif | Verdict |
|---|---|
| `bg-grid-pattern` — 34px white 2.5% rules | **Login screen only.** On the marketing site this was removed from the hero because it showed through the video. Never behind tables or charts. |
| `streaks` — two soft diagonal gradients (cream + flame) | Kept, very low intensity |
| Blurred radial glow (`blur-[140px]`) | Kept on the login screen in gold at 5% |
| `::selection` `rgba(232,85,42,0.35)` | Kept verbatim |
| Focus ring `2px solid #e8552a`, offset 2px | Kept verbatim |
| Custom scrollbar | Kept, retinted to token values |
| Marquees, meteors, orbit, aurora, ripple (Magic UI) | **Dropped.** Dashboard, not a landing page. |

Motion is capped at 150–200 ms colour/opacity transitions with the site's
`cubic-bezier(0.4, 0, 0.2, 1)` easing, and `prefers-reduced-motion` zeroes it.

## 7. How the tokens are wired

```
brand-tokens.json  ──imported by──>  tailwind.config.ts  ──generates──>  utility classes
                   └─imported by──>  components/brand/Logo.tsx (logo paths + dimensions)
```

`tailwind.config.ts` contains **no literal colour, font, radius or shadow
values** — every entry reads from the JSON. Raw CSS in `globals.css` uses
Tailwind's `theme()` function so it resolves back to the same source.

Verified in the running app via computed styles:

| Element | Expected | Measured |
|---|---|---|
| `body` background | `#1a1512` | `rgb(26, 21, 18)` ✓ |
| `body` colour | `#f5f2ed` | `rgb(245, 242, 237)` ✓ |
| `body` font | Inter 14px | `Inter…, 14px` ✓ |
| `.label.text-gold` | `#cba23c`, mono 11px, 0.18em | `rgb(203, 162, 60)`, JetBrains Mono 11px, 1.98px ✓ |
| `.bg-primary` dot | `#e8552a` | `rgb(232, 85, 42)` ✓ |

One unavoidable exception: `next/font/google` requires literal arguments, so the
font *families* are named in `app/layout.tsx`. The CSS variable names they
expose are what the config consumes, and the families match
`brand-tokens.json → font.*`. This is noted in a comment in that file.

## 8. Open items for later phases

1. **Charts** — no charting library exists on the site. Palette proposal for
   Phase 1: flame primary, moss secondary, gold tertiary, `ink.mute` for axes.
2. **Light mode** — the site has a full cream palette that the portal does not
   use yet. Tokens are present if you ever want a light theme.
3. **Favicon** — still the create-next-app default; should become the monogram.
4. **Vectorising the monogram** — you chose PNG for now. If the portal ever
   needs a very large or recolourable mark, revisit.
