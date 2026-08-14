# AVG-verwerkingsregister — Leads Agent

Verwerkingsregister voor de verwerking "prospectie en outreach voor MKB-leadgeneratie" door de Leads Agent, onderdeel van Mainframe HQ (Candelaria Agency). Dit document is de onderbouwing die §4 rule 11 van de projectspecificatie vereist en wordt bijgewerkt zodra de verwerking wijzigt (nieuwe bron, nieuwe ontvanger, andere bewaartermijn).

## 1. Verwerkingsverantwoordelijke

Candelaria Agency, J. Candelaria — j.candelaria171@gmail.com / candelaria.agency@pm.me. KvK-nummer en vestigingsadres: zie `COMPANY_KVK`/`COMPANY_ADDRESS` (momenteel niet ingevuld in deze omgeving — zie `docs/RUNBOOK-LEADS.md` §8).

## 2. Doel van de verwerking

Het identificeren van Nederlandse MKB-bedrijven zonder (of met een gebrekkige) website, het beoordelen van hun online aanwezigheid op basis van publiek zichtbare kenmerken, en het — na een expliciete go-live-vrijgave — benaderen van een selectie daarvan met een persoonlijk, op feiten gebaseerd aanbod voor websitediensten. Zolang `OUTBOUND_ENABLED=false` (huidige staat) blijft de verwerking beperkt tot ontdekking, verrijking en scoring; er wordt niets verzonden.

## 3. Rechtsgrond

**Artikel 6 lid 1 sub f AVG — gerechtvaardigd belang.** Candelaria Agency heeft een gerechtvaardigd commercieel belang bij het benaderen van bedrijven (niet natuurlijke personen als privépersoon) met een zakelijk aanbod, mits:

- alleen **publiek toegankelijke, zakelijke** gegevens worden gebruikt (KvK-registratie, bedrijfswebsite, algemeen bedrijfs-e-mailadres, algemeen telefoonnummer, publieke social-mediaprofielen van het bedrijf) — nooit privégegevens van een natuurlijk persoon buiten diens zakelijke rol;
- elk bericht een werkende afmeldmogelijkheid, een bronvermelding (waar de gegevens vandaan komen) en een link naar de privacyverklaring bevat (§4 rule 7, deterministisch afgedwongen in `identity-footer.ts` — nooit aan het AI-model overgelaten);
- een expliciete belangenafweging is gemaakt (zie §7 hieronder) vóórdat outbound daadwerkelijk wordt geactiveerd.

Er wordt geen toestemming (art. 6.1.a) gevraagd, omdat dit een B2B-koude-acquisitiecontext is — de gerechtvaardigd-belangtoets is hier de gangbare en toepasselijke grondslag, mits de afweging in stand blijft (zie §7).

## 4. Categorieën verwerkte gegevens

| Categorie | Voorbeelden | Bron |
|---|---|---|
| Bedrijfsidentificatie | Bedrijfsnaam, rechtsvorm, KvK-nummer, SBI-code, sector | KvK API (indien geconfigureerd), OSM Overpass, CSV-seed |
| Vestigingsgegevens | Straat, postcode, plaats, provincie | KvK, OSM, website |
| Contactgegevens (zakelijk) | Algemeen telefoonnummer, algemeen e-mailadres, contactformulier-URL | Bedrijfswebsite (gecrawld conform robots.txt) |
| Online aanwezigheid | Domeinnaam, social-mediaprofiel-URL's (bedrijfsaccounts) | Website, OSM/Places |
| Website-audit-signalen | HTTPS, mobielvriendelijkheid, laadsnelheid, platform, SEO-basis, analytics, chat/booking, schema.org | Eigen crawler + PageSpeed API (indien geconfigureerd) |
| Afgeleide score | Fit-score, pain-score, totaalscore, prioriteit, aanbevolen aanbod/kanaal | Eigen rubric-engine, evidence-gebonden |
| Outreach-inhoud | Gegenereerde e-mail/DM/belscript-concepten, verzendstatus, reacties | Eigen AI-lagen (indien `ANTHROPIC_API_KEY` aanwezig), verzendlog |

**Nadrukkelijk niet verzameld**: privé-social-media, privételefoonnummers, BSN, financiële gegevens, of enige bijzondere categorie persoonsgegevens (art. 9 AVG). Het systeem verwerkt uitsluitend bedrijfscontactgegevens van een medewerker in diens zakelijke hoedanigheid (bijv. "info@bedrijf.nl", niet een privé-Gmail-adres).

## 5. Bronnen

- **OSM Overpass** (openstreetmap.org) — publieke kaartgegevens, geen sleutel vereist, standaard actief.
- **Google Places API** — optioneel, alleen actief als `GOOGLE_PLACES_API_KEY` is ingesteld.
- **KvK API** — optioneel, alleen actief als `KVK_API_KEY` is ingesteld.
- **CSV-seed** — handmatig aangeleverde lijsten (Johan's eigen input).
- **Eigen websitecrawler** — respecteert `robots.txt`, uitsluitend publiek toegankelijke pagina's, geen inlog-vereisende content.
- **RDAP/DNS-over-HTTPS** — publieke domeinregistratie- en DNS-gegevens (voor eigen verzenddomein-health, niet voor leadgegevens).

## 6. Bewaartermijn

- **Onbenaderde leads** (`status = 'new'`, nooit gecontacteerd): standaard **180 dagen** na aanmaak, daarna automatisch verwijderd via de retentiejob (`lib/leads-agent/retention.ts`, handmatig te starten via **Instellingen → Retentie**, met verplichte bevestigingsstap). Configureerbaar via `thresholds.retentionDays`.
- **Agent-events** (interne procesevents, geen persoonsgegevens op zichzelf maar kunnen naar een lead verwijzen): 30 dagen.
- **Places-cache** (ruwe API-respons-cache): 30 dagen.
- **Benaderde/gekwalificeerde leads** (met contactgeschiedenis): geen automatische verwijdering — vallen onder het "recht op vergetelheid"-mechanisme (§8) op individueel verzoek, of handmatige opschoning.
- **Verzendlog en reacties**: bewaard zolang de bijbovengaande lead bestaat, voor traceerbaarheid van eerdere outreach (voorkomt dubbele of te frequente benadering).

## 7. Belangenafweging (art. 6.1.f — verplicht vóór go-live)

Toets, uit te voeren en te documenteren vóór `OUTBOUND_ENABLED=true` wordt gezet:

1. **Doel legitiem?** Ja — commerciële acquisitie van zakelijke dienstverlening aan bedrijven, geen consumentmarketing.
2. **Noodzakelijk?** Ja — zonder contactgegevens is geen persoonlijke, feitelijk onderbouwde benadering mogelijk; generieke advertenties zouden minder gericht en minder relevant zijn voor de ontvanger.
3. **Proportioneel?** Beperkt tot strikt zakelijke, publiek zichtbare gegevens; geen gedragsprofilering, geen tracking-pixels in outreach-mail (§11-checklistitem "tracking uitgeschakeld"), geen doorverkoop van gegevens aan derden.
4. **Verwachting van de ontvanger?** Een bedrijf dat zijn KvK-registratie en contactgegevens publiek maakt, moet redelijkerwijs rekening houden met zakelijke benadering — mits laagfrequent, transparant over de bron, en met een werkende afmeldoptie.
5. **Afmelding en herkenning**: een "afmelden"-antwoord of een expliciet vergeetverzoek (`POST /api/leads/[id]/forget`) leidt tot permanente, onomkeerbare (one-way SHA-256-hash) onderdrukking — het bedrijf wordt bij toekomstige herontdekking automatisch herkend en overgeslagen, nooit opnieuw benaderd.

Deze afweging moet opnieuw worden vastgelegd (nieuwe versie van dit document) als het doel, de gegevenscategorieën, of de ontvangers wijzigen.

## 8. Rechten van betrokkenen

- **Recht op vergetelheid**: `POST /api/leads/[id]/forget` (admin-only) verwijdert de lead volledig uit `leads` en slaat een onomkeerbare SHA-256-hash van diens domein/e-mailadressen op in de onderdrukkingslijst, zodat het bedrijf bij een latere discovery-run automatisch wordt overgeslagen (geverifieerd werkend gedrag, zie `docs/DECISIONS.md` Fase 11).
- **Recht op inzage/rectificatie**: leadgegevens zijn zichtbaar en direct bewerkbaar via `/leads/[id]` in de portal.
- **Recht van bezwaar**: een "afmelden"-antwoord op een outreach-bericht wordt automatisch als permanente onderdrukking verwerkt (`reply-classify.ts`, classificatie `optout`).

## 9. Ontvangers / verwerkers (sub-processors)

| Partij | Rol | Welke gegevens | Wanneer actief |
|---|---|---|---|
| **Anthropic** (Claude API) | AI-verwerker voor sector-classificatie, pain-brief, outreach-tekst, call-prep, reply-classificatie | Bedrijfsnaam, publiek zichtbare audit-signalen, eerder gegenereerde outreach-tekst (nooit privépersoonsgegevens) | Alleen als `ANTHROPIC_API_KEY` is ingesteld (momenteel niet in deze omgeving) |
| **Google** (Places API, PageSpeed API, DNS-over-HTTPS, RDAP via IANA) | Databron voor bedrijfslocaties, performance-metingen, DNS-opzoekingen | Bedrijfsnaam, adres, domeinnaam | Places/PageSpeed alleen indien API-sleutel ingesteld; DNS/RDAP altijd (geen persoonsgegevens, alleen domeintechniek) |
| **Toekomstige sequencer** (bijv. Instantly/Smartlead — nog niet geïntegreerd) | Feitelijke e-mailverzending bij live outbound | Bedrijfs-e-mailadres, gepersonaliseerde berichttekst | Pas na volledige go-live-checklist en expliciete koppeling — **niet gebouwd in deze fase**, alleen export-formaat (`/api/agents/leads/packs/export?format=instantly`) is voorbereid |
| **Hostingpartij** (Netlify) + **Neon/Vercel Postgres** | Infrastructuur, dataopslag | Alle bovenstaande categorieën, at-rest | Altijd (noodzakelijk voor de dienst zelf) |

Er vindt geen doorgifte plaats buiten deze partijen. Voor elke partij geldt: alleen de gegevens die functioneel noodzakelijk zijn voor de betreffende taak worden gedeeld — nooit de volledige leaddataset in bulk.

## 10. Beveiliging

- Alle admin-routes achter `requireAdmin()`-authenticatie.
- Elke config-wijziging, elk vergeetverzoek en elke retentie-uitvoering wordt gelogd in `audit_log` (§4 rule 4 — "audit alles").
- Secrets uitsluitend via omgevingsvariabelen, nooit in code of logs (§4 rule 7 van het hoofdproject-CLAUDE.md).
- Onderdrukkingsgegevens worden als onomkeerbare hash opgeslagen (`suppression.kind = 'hash'`), niet als leesbaar origineel, waar dat voor vergeetverzoeken van toepassing is.

## 11. Openstaande actie vóór live-gang

- `COMPANY_KVK`, `COMPANY_ADDRESS`, `PRIVACY_URL` moeten zijn ingevuld — dit document en de outreach-footer zijn hier nu nog van afhankelijk.
- Dit document moet één keer expliciet door Johan worden geaccordeerd als onderdeel van de go-live-checklist (item "privacy_live" dekt de publicatie van de klant-facing privacyverklaring; dit interne register is een aanvullend, apart stuk).
