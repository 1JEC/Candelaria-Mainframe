# Bouwprompt — Stijn in Mainframe HQ (gratis, op Vercel)

> Plak dit volledig als eerste bericht in een nieuwe Claude Code-sessie met
> `/Users/jcandelaria/mainframe-hq` als werkmap. De prompt is zelfdragend:
> hij bevat de context, de grenzen en de acceptatiecriteria.

---

## Rol en opdracht

Je bouwt **Stijn**: de AI-laag ín de Mainframe HQ-portal van Candelaria Agency.
Stijn vindt prospects, verzamelt bedrijfsinformatie, beoordeelt wat een bedrijf
nodig heeft en hoe risicovol het is, en beantwoordt vragen over de eigen data van
het bureau — allemaal zichtbaar in de portal, draaiend op Vercel, met **nul
marginale kosten per gebruik**.

De portal is een Next.js 15 App Router-app met TypeScript strict, Tailwind,
Drizzle ORM op Postgres, Auth.js met TOTP-2FA en een sluitende `audit_log`.

---

## Wat er AL is — niet opnieuw bouwen

De helft van Stijn bestaat en werkt. Lees deze bestanden vóór je iets schrijft
en bouw erop verder in plaats van ernaast:

| Wat | Waar |
|---|---|
| Discovery (OSM Overpass, Places, KvK, CSV, site-expansion) | `lib/leads-agent/discovery/` |
| Crawler met robots-respect en paginacache | `lib/leads-agent/crawler/` |
| Contactextractie (e-mail, telefoon, KvK, socials) | `lib/leads-agent/extraction/contacts.ts` |
| Technische audit (HTTPS, CMS, SEO, PSI, kapotte links) | `lib/leads-agent/audit/` |
| Scoring: fit 0-40 + pain 0-60, prioriteit A/B/C | `lib/leads-agent/scoring/` |
| Risicobeoordeling: bedrijfsrisico + samenwerkingsrisico | `lib/leads-agent/risk/` |
| AI-jobs: sectorclassificatie, pain-brief, outreach-pack, call-prep | `lib/leads-agent/ai/` |
| Grounding: strip elke zin met een getal zonder bewijs | `lib/leads-agent/ai/grounding.ts` |
| Budget- en sleutelgate vóór elke AI-call | `lib/leads-agent/ai/gate.ts` |
| Verwisselbare modelbackend (Anthropic / OpenAI-compatibel) | `lib/agents/providers.ts` |
| Taakwachtrij met claim, retries en heartbeat | `lib/leads-agent/orchestration/` |
| Outbound met sequences, verzendvenster, suppressie, mailbox-health | `lib/leads-agent/outbound/` |
| Versioneerbare config (ICP, rubric, risk, thresholds) | `lib/leads-agent/config.ts` |
| Diagnostiek | `lib/leads-agent/doctor.ts` |

**Ga uit van werkende code.** Vind je een bug, meld hem — herschrijf de module niet.

---

## Harde randvoorwaarden

### Kosten — alles gratis

1. **Geen enkele betaalde API.** Google Places en de KvK-API blijven uit
   (`DEFAULT_SOURCES` in `lib/leads-agent/config.ts`). Voeg geen betaalde
   verrijkingsbron toe, ook niet "optioneel".
2. **Modelbackend is een gratis gehoste tier.** Ollama is géén optie hier:
   Vercel-functies draaien serverless en kunnen `localhost:11434` niet bereiken.
   Standaard wordt **Groq**, met deze model-ID's — geverifieerd tegen
   `console.groq.com/docs/models` op 15-08-2026:
   - `MODEL_CHEAP="llama-3.1-8b-instant"` (het ruimste dagquotum)
   - `MODEL_SMART="llama-3.3-70b-versatile"`

   Google Gemini is het alternatief en zit al als preset in `providers.ts`
   (`AI_BASE_URL="gemini"`). Twee waarschuwingen als je die kiest: de modelnamen
   verlopen snel — de 2.x-generatie is inmiddels vervangen door 3.x — en Google
   publiceert de free-tier-limieten niet meer op de documentatiepagina maar
   alleen in AI Studio. **Verifieer bij het instellen zelf de actuele modelnaam
   en limieten in AI Studio.** Verzin geen model-ID.
3. `lib/agents/providers.ts` bestaat al en doet dit. **Gebruik het.** Bouw geen
   tweede client.
4. Kostenlogging in `agent_runs` blijft draaien. Gratis modellen loggen 0,00 —
   dat is correct, niet een bug om te "repareren".

### Vercel — de echte grenzen

5. **Functieduur.** Een trage gratis-tier-call mag geen request laten aflopen.
   Alle agentwerk loopt via de bestaande wachtrij (`orchestration/tick.ts`):
   één tick doet één taak en keert terug. Nooit een hele run in één request.
6. **Cron.** Er is nog geen `vercel.json`. Voeg er één toe voor
   `/api/cron/lead-sweeper` en de nieuwe tick-route. Op het Hobby-plan is cron
   beperkt tot dagelijks; schrijf de routes zo dat de frequentie een
   configuratiedetail is, geen aanname in de code.
7. **Cron-routes zijn beveiligd** met `CRON_SECRET` in de `Authorization`-header,
   zoals `/api/cron/lead-sweeper` al doet.
8. Bekend en geaccepteerd: Vercel Hobby staat commercieel gebruik niet toe, dus
   dit draait op Pro. Dat is een besluit van Johan — niet opnieuw ter discussie
   stellen, niet oplossen, niet in de code verwerken.

### Projectregels (uit `CLAUDE.md`, bindend)

9. **Nederlands** voor alles wat een mens leest; **Engels** voor code, comments,
   commits en variabelenamen.
10. **Nooit gokken.** Elk getoond feit heeft bewijs en een bron-URL. Kun je iets
    niet meten, benoem het als onbekend — nooit als "geen probleem gevonden".
11. **Audit alles.** Elke actie in `audit_log`, elke agentstap in `agent_events`.
12. **Goedkeuringsflow.** Stijn stelt voor; een mens verstuurt. Geen enkele
    uitgaande boodschap gaat zonder klik de deur uit.
13. **Geen tech debt.** Kwaliteit boven snelheid. TypeScript strict moet schoon
    zijn en elke nieuwe pure module krijgt tests in `tests/`.

---

## Bekende fout — eerst repareren

`processCandidateTask` in `lib/leads-agent/orchestration/process-candidate.ts` is
niet idempotent. De taakwachtrij zet een gefaalde taak terug op `pending` en
probeert het tot drie keer (`markTaskFailed` in `orchestration/task-queue.ts`),
maar de functie voegt `lead_contacts` en `lead_signals` elke keer opnieuw toe met
verse UUID's. Op die tabellen staat alleen een index op `lead_id`, geen unieke
constraint. Gevolg: elke retry dupliceert contactvelden en signalen, en daarmee
ook de bewijsregels in het outreach-pack.

Vandaag is dat zeldzaam. Op een gratis tier wordt het regel: een 429 tijdens de
AI-stap gooit een fout ná het wegschrijven van contacten en signalen, dus precies
het scenario dat dupliceert.

**Te doen vóór onderdeel 1:** maak het herverwerken van een kandidaat idempotent —
verwijder de bestaande `lead_contacts` en `lead_signals` van die lead binnen
dezelfde transactie voordat je de nieuwe wegschrijft, óf voeg een unieke
constraint toe op `(lead_id, field, value)` respectievelijk `(lead_id, code)`.
Kies één aanpak, onderbouw hem, en schrijf er een test bij die dezelfde kandidaat
twee keer verwerkt en telt.

Behandel een 429 daarnaast expliciet: niet als harde fout maar als "later
opnieuw", met backoff. De retry-lus bestaat al — bouw geen tweede.

---

## Te bouwen — vier onderdelen, in deze volgorde

### 1 · AI-instellingen in de portal

**Waarom:** Johan moet van backend kunnen wisselen zonder redeploy, en moet
kunnen zien of het werkt.

- Nieuw tabblad op `/settings`: **AI**.
- Toont de actieve provider via `describeProvider()`, de modellen
  (`MODEL_CHEAP` / `MODEL_SMART`), of er een sleutel is (`isAiConfigured()`),
  het verbruik van vandaag uit `agent_runs`, en het dagbudget.
- **Testknop** die één minimale call doet en toont: gelukt of niet, hoeveel
  tokens, hoeveel het kostte, hoe lang het duurde. De uitkomst gaat in
  `agent_runs` met `purpose: "connection_test"`.
- Modelkeuze en provider komen uit env; toon ze alleen-lezen met een duidelijke
  uitleg welke env-variabelen in Vercel gezet moeten worden. Sleutels **nooit**
  tonen, ook niet gemaskeerd.
- Alleen bereikbaar voor `role: "admin"`.

### 2 · Risico zichtbaar maken

**Waarom:** de data staat in `leads` (`business_risk`, `engagement_risk`,
`risk_headline_nl`, `risk_json`) maar is nergens te zien.

- Leadslijst: twee kolommen met gekleurde chips (laag / verhoogd / hoog) en een
  filter op bedrijfsrisico. Sorteerbaar.
- Leaddetail: risicoblok met per factor de Nederlandse label, het bewijs en een
  klikbare bron-URL, gegroepeerd per as (bedrijfsrisico apart van
  samenwerkingsrisico — die twee mogen visueel nooit versmelten).
- **De `unknowns`-lijst wordt altijd getoond**, ook als er geen risico's zijn.
  Een schone score zonder "dit konden we niet meten" is misleidend.
- Draai eerst `drizzle/migrations/0002_lead_risk_assessment.sql` — de kolommen
  bestaan mogelijk nog niet in de database.

### 3 · Stijn — vragen stellen over je eigen data

**Waarom:** dit is het ontbrekende hart. Nu moet Johan filters klikken; hij wil
kunnen vragen *"welke prospects in Rijswijk hebben hoog bedrijfsrisico en zijn
nog niet benaderd?"*

**Architectuur — dit is niet onderhandelbaar:**

- Nieuwe route `/stijn` plus `POST /api/stijn/ask`.
- **Read-only.** Stijn muteert niets, verstuurt niets, verwijdert niets.
- **Geen vrije SQL door het model.** Definieer een vaste set getypeerde
  querytools; het model kiest er één en levert parameters, de code voert een
  geparametriseerde Drizzle-query uit. Valideer elke parameterset met Zod
  (al een dependency). Bij een ongeldige toolkeuze: geen tweede poging met een
  gok, maar een eerlijke melding.
- Begin met precies deze tools, niet meer:
  - `search_leads` — filters: stad, sector, prioriteit, bedrijfsrisico, status, score-ondergrens
  - `get_lead` — één lead met signalen, risicofactoren en contactgegevens
  - `count_leads_by` — telling gegroepeerd op status, prioriteit, risico of stad
  - `list_recent_runs` — laatste agent-runs met statistieken en kosten
  - `get_outbound_health` — mailbox-health, bounce- en reactiepercentages
  - `list_agent_events` — laatste gebeurtenissen van een run
- **Antwoord met bronvermelding.** Elk antwoord noemt welke records het gebruikte
  en linkt ze. Kan Stijn de vraag niet beantwoorden met de beschikbare tools,
  dan zegt hij dat — hij verzint geen antwoord.
- Haal de output door `groundAiOutput()` heen, met de opgehaalde records als
  bewijsbasis.
- Gratis modellen zijn zwakker in tool-gebruik. Houd de toolset klein, de JSON
  strikt, en log elke toolkeuze in `agent_events` zodat je kunt zien wanneer het
  misgaat.
- Elke vraag en elk antwoord in `audit_log`.

### 4 · Dagbriefing

**Waarom:** Stijn moet ongevraagd nuttig zijn.

- Blok bovenaan `/dashboard`: wat is er sinds gisteren gebeurd.
- Opgebouwd uit **echte tellingen** (nieuwe leads, gekwalificeerd, hoog risico,
  verzonden, antwoorden, gefaalde taken) — de tekst eromheen mag van het model
  komen, de cijfers nooit.
- Eén call per dag, gecached in de database. Niet bij elke paginaweergave.
- Faalt de AI of is het budget op: toon de kale cijfers. De briefing verdwijnt
  nooit helemaal.

---

## Env-variabelen (in Vercel te zetten)

```bash
AI_PROVIDER="openai"
AI_BASE_URL="groq"
AI_API_KEY="<gratis Groq-sleutel van console.groq.com>"
MODEL_CHEAP="llama-3.1-8b-instant"
MODEL_SMART="llama-3.3-70b-versatile"
AI_TIMEOUT_MS="120000"
AI_DAILY_BUDGET_EUR="2.0"
CRON_SECRET="<willekeurig>"
```

Deze model-ID's zijn geverifieerd op 15-08-2026. Modelnamen verlopen; werkt er
één niet, controleer de providerdocumentatie en meld het — val niet stilzwijgend
terug op een betaald model en verzin geen ID.

Rate limits zijn per provider verschillend en veranderen. Bouw de pipeline zo
dat een 429 een taak terugzet in de wachtrij met backoff, niet een run laat
klappen. Dat is bij een gratis tier geen randgeval maar de normale gang van
zaken.

---

## Acceptatiecriteria

Klaar is het pas als dit allemaal waar is:

- [ ] `npm run type-check` is schoon en `npx vitest run` volledig groen.
- [ ] `npm run build` slaagt.
- [ ] Dezelfde kandidaat twee keer verwerken levert géén dubbele
      `lead_contacts` of `lead_signals` op, bewezen met een test.
- [ ] Met alleen gratis env-variabelen draait een volledige leads-run: discovery →
      crawl → audit → score → risico → pack, zonder één betaalde call.
- [ ] Zonder AI-sleutel draait diezelfde run nog steeds — alleen de concepten
      ontbreken, met een duidelijke melding in de console.
- [ ] `/settings` → AI toont de actieve backend en de testknop werkt.
- [ ] De leadslijst filtert op bedrijfsrisico; de detailpagina toont factoren
      mét bewijs, bron-URL én de `unknowns`.
- [ ] `/stijn` beantwoordt "welke prospects in Rijswijk hebben hoog
      bedrijfsrisico en zijn nog niet benaderd?" met kloppende, klikbare bronnen.
- [ ] Stijn weigert netjes bij een vraag die buiten zijn tools valt.
- [ ] Het dashboard toont een dagbriefing die ook zonder AI cijfers laat zien.
- [ ] `vercel.json` bevat de cron-definities; de cron-routes weigeren een verzoek
      zonder geldige `CRON_SECRET`.
- [ ] Elke nieuwe pure functie heeft tests in `tests/`.
- [ ] Geen enkele sleutel in code, logs of UI.

---

## Expliciet verboden

- Een tweede modelclient naast `lib/agents/providers.ts`.
- Vrije SQL of ruwe queries samengesteld door het model.
- Een AI die zelfstandig mail verstuurt, data wijzigt of records verwijdert.
- Verzonnen cijfers, verzonnen bedrijfsgegevens, verzonnen model-ID's.
- Een betaalde API "als fallback".
- Een risicoscore zonder bijbehorende `unknowns`.
- Bestaande werkende modules herschrijven omdat ze anders zouden zijn opgezet.

---

## Werkwijze

Werk in fasen zoals het project gewend is: bouw onderdeel 1, laat repo-status en
samenvatting zien, benoem open beslissingen, en **stop voor expliciete
goedkeuring** voordat je aan onderdeel 2 begint. Nederlandse samenvatting,
Engelse commits, aparte branch per fase.

Kom je iets tegen dat twee kanten op kan — vraag het. Niet gokken.
