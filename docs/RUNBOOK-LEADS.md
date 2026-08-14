# Runbook — Leads Agent

Praktische handleiding voor dagelijks gebruik van de Leads Agent binnen Mainframe HQ. Voor de architectuur en per-fase beslissingen: zie `docs/DECISIONS.md`. Voor de AVG-onderbouwing: zie `docs/AVG-VERWERKINGSREGISTER.md`.

## 1. Een eerste run starten (dry run)

1. Log in op de portal, ga naar **Leads → Agent → Console** (`/leads/agent/console`).
2. Klik **Nieuwe run starten**. De agent gebruikt de actieve ICP-configuratie (sectoren, steden, bedrijfsgrootte — zie **Instellingen**) om kandidaten te zoeken via OSM Overpass (standaard actieve bron).
3. De pagina pollt zelf elke paar seconden (`/api/agents/leads/runs/[id]/tick`) — geen achtergrondproces nodig, blijf de pagina open houden of ververs later.
4. Volg de live event-feed: discovery → dedupe → crawl → audit → score → (indien `ANTHROPIC_API_KEY` gezet) AI-pack.
5. Een run stopt vanzelf als de kandidatenlijst leeg is, of kan handmatig geannuleerd worden.
6. **Zonder `ANTHROPIC_API_KEY`** (huidige staat van deze omgeving) stopt elke gekwalificeerde lead na scoring bij status `qualified` — er wordt geen outreach-pack gegenereerd. Dit is verwacht gedrag (zie §4), niet een fout.

Resultaat bekijken: **Leads** (`/leads`) — gesorteerd, filterbaar op prioriteit/sector/plaats/score, met bewijs per lead onder de tabbladen **Bewijs**/**Historie**/**Outreach** op de detailpagina.

## 2. De rubric bijstellen

**Instellingen → Rubric-gewichten** (`/leads/agent/instellingen`) toont een live editor:

- Elk fit- en pain-gewicht is een los invoerveld; de tabel eronder herberekent **direct** (client-side, geen her-crawl) de score en rangorde van de huidige top-20 leads met de nieuwe gewichten, met ↑/↓ per lead zodat je ziet wat een wijziging concreet verschuift.
- **Opslaan** schrijft een nieuwe versie weg (audit-gelogd, wie/wanneer). De oude versie blijft bewaard.
- Onder de editor staat **Versiegeschiedenis** — elke eerdere versie is met één klik te herstellen (**Herstel vorige versie**), zelf ook weer als nieuwe versie gelogd (geen data gaat verloren).
- Wijzigingen werken alleen door op **toekomstige** scoring-runs — bestaande leads herscoren niet met terugwerkende kracht totdat ze opnieuw geaudit worden.

Vuistregel: begin met kleine stappen (±2-3 punten per gewicht), bekijk de live-preview, en pas pas daarna een echte run uit om het effect in productie te zien.

## 3. Een stad of sector toevoegen

ICP-configuratie zit in dezelfde config-store als de rubric (`lead_agent_config`, key `icp`). Er is nog geen bewerk-UI voor ICP (alleen read-only weergave in Instellingen) — pas aan via:

```bash
node --env-file=.env.local --import tsx scripts/<tijdelijk-script>.ts
```

met een `saveConfig("icp", { ...huidige waarden, cities: [...oud, "Nieuwe Stad"] }, userId)`-aanroep (zie `lib/leads-agent/config.ts`). Dit is een bewuste V2-openstaande post — zie DECISIONS.md Fase 11.

## 4. Wat te doen als een run vastloopt

- **Doctor-paneel** (`/api/agents/leads/doctor`, of het Doctor-blokje op de Console) toont `stale_runs`: runs met status `running` maar een verouderde heartbeat (>3 minuten). Dit gebeurt als niemand de pagina open had staan om te blijven pollen.
- Ga naar de run in kwestie en klik **Hervatten** (opent de Console met dezelfde run, pollen hervat) — of **Annuleren** als de run niet meer relevant is.
- Eén enkele mislukte taak (bijv. een timeout bij Overpass of een niet-bereikbare website) beëindigt de run niet: de taak gaat terug naar `pending` en wordt bij de volgende tick opnieuw geprobeerd. Alleen aanhoudende, structurele fouten (bijv. DB onbereikbaar) vereisen ingrijpen.
- Cron-vangnet: `/api/cron/lead-sweeper` (Vercel/Netlify cron, `CRON_SECRET`-beveiligd) tikt actieve runs door ook als niemand de UI open heeft — controleer dat deze cron daadwerkelijk is ingepland in het hostingplatform.

## 5. De handmatige DM-workflow

Regel §4.2 van dit project (Mainframe HQ CLAUDE.md): **geen DM-automatisering**. De agent genereert een DM-concept (tekst + het gevonden social-profiel-URL, zie Outreach-tab op de leaddetailpagina) — dit concept moet je **zelf, handmatig** kopiëren en versturen vanuit het eigen Instagram/LinkedIn-account. Er is en komt geen geautomatiseerde verzendknop voor DM's.

## 6. Maandelijkse suppressie-audit

- **Onderdrukkingslijst** bevat domeinen/e-mails/telefoonnummers/KvK-nummers die nooit meer benaderd mogen worden (klanten, partners, concurrenten, eerder "afgemeld"-antwoorden, en `hash`-vermeldingen uit `/api/leads/[id]/forget`-verzoeken — recht op vergetelheid, sha256, one-way).
- Controleer maandelijks (handmatig, geen UI hiervoor gebouwd deze fase — zie V2) of de lijst nog compleet is: nieuwe klanten en partners moeten er expliciet aan toegevoegd worden, dit gebeurt niet automatisch.
- **Retentie** (Instellingen-onderaan **Retentie**-paneel): toont hoeveel onbenaderde leads ouder dan de bewaartermijn (standaard 180 dagen), events ouder dan 30 dagen, en Places-cache ouder dan 30 dagen verwijderd zullen worden. **Nu uitvoeren** vraagt eerst bevestiging — verwijdering is definitief.

## 7. Van dry run naar live outbound — exacte stappen

1. Doorloop de **Go-live-checklist** volledig (**Instellingen → Health tab**, 11 items uit §11: domein geregistreerd ≥2 weken, privacyverklaring live, mailboxen klaar, DNS geverifieerd (mail-tester 10/10), Postmaster Tools, sequencer-warmup ≥14 dagen, tracking uit, reactieroutine afgesproken, suppressielijst geïmporteerd, testreeks aangekomen in hoofdinbox, verzendlimieten ingesteld).
2. Vul de ontbrekende env-vars in (zie §8 hieronder) — zonder deze blijven outreach-packs een zichtbare placeholder tonen in plaats van een adres/KvK-nummer.
3. Zet `OUTBOUND_ENABLED=true` pas als **elk** checklist-item is aangevinkt — de UI toont deze env var als "vergrendeld" totdat dat zo is.
4. De DB-kill-switch (`outbound_halt`, apart van de env var) staat los aan te zetten vanaf elk Outbound-scherm voor een direct incident-stop — geen redeploy nodig.
5. Eerste batch: max. 5/dag, plafond daarna 25/mailbox/dag — hard in de checklist, niet automatisch afgedwongen in code buiten de checklist zelf.
6. Alle vijf send-gates (kill switch/env var, verzendvenster, inhoudsvalidatie, mailbox-gezondheid, suppressielijst) moeten slagen voordat een verzending daadwerkelijk plaatsvindt — een enkele gate-fail logt de reden zichtbaar in de **Wachtrij**-tab.

## 8. Env-vars die nog ontbreken in deze omgeving

| Variabele | Effect indien ontbrekend |
|---|---|
| `ANTHROPIC_API_KEY` | Geen AI-lagen (sector-classificatie, pain-brief, outreach-pack, call-prep, reply-classificatie) — leads stoppen bij `qualified`. |
| `GOOGLE_PLACES_API_KEY` | Places-bron blijft uitgeschakeld — alleen OSM Overpass + CSV-seed + site-expansion actief. |
| `KVK_API_KEY` | KvK-bron blijft uitgeschakeld — geen KvK-verrijking (rechtsvorm, SBI-code). |
| `PAGESPEED_API_KEY` | Audit valt terug op een lichtere performance-heuristiek zonder officiële PageSpeed-score. |
| `RESEND_API_KEY` | Geen systeemmail-notificaties vanuit de agent. |
| `COMPANY_KVK` / `COMPANY_ADDRESS` / `PRIVACY_URL` | Outreach-footer toont een expliciete placeholder (`[...ONTBREEKT...]`) in plaats van de echte waarde — pack is zichtbaar niet verzendklaar. |
| `OUTREACH_DOMAIN` | Verzendgate blokkeert (domein-check voor warmup-leeftijd kan niet worden uitgevoerd). |
| `DKIM_SELECTOR` | DNS-health-check valt terug op het proberen van `"default"` als selector. |
| `CRON_SECRET` / `WORKER_SECRET` | Cron-sweeper en worker-endpoint blijven onbeveiligd bereikbaar bij misconfiguratie — zet deze voor productie. |
