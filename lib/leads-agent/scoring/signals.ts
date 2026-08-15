import type { DEFAULT_ICP, DEFAULT_RUBRIC } from "@/lib/leads-agent/config";
import type { ScoredSignal, ScoringInput } from "./types";

type Icp = typeof DEFAULT_ICP;
type Rubric = typeof DEFAULT_RUBRIC;

function currentYear(): number {
  return new Date().getFullYear();
}

// ---------- FIT (max 40) ----------

export function evaluateFitSignals(input: ScoringInput, icp: Icp, rubric: Rubric): ScoredSignal[] {
  const signals: ScoredSignal[] = [];
  const sectorOk = icp.sectors.includes(input.sector) && !icp.disqualifySectors.includes(input.sector);

  if (sectorOk) {
    signals.push({
      code: "icp_sector",
      labelNl: "Sector past bij ICP",
      evidence: `Sector "${input.sector}" staat op de doelgroeplijst.`,
      sourceUrl: input.discoverySourceUrl,
      points: rubric.fit.icpSector,
    });
  }

  const teamPageUrl = input.crawledPageUrls?.find((u) => /team|over-ons/i.test(u));
  if (teamPageUrl) {
    signals.push({
      code: "size_match",
      labelNl: "Team-/over-ons-pagina gevonden",
      evidence: "Bedrijf heeft een team- of over-ons-pagina (proxy voor 2-50 medewerkers — geen exact medewerkersaantal beschikbaar uit gratis bronnen).",
      sourceUrl: teamPageUrl,
      points: rubric.fit.sizeMatch,
    });
  }

  if (input.city && icp.cities.some((c) => c.toLowerCase() === input.city!.toLowerCase())) {
    signals.push({
      code: "in_target_area",
      labelNl: "Binnen doelgebied",
      evidence: `Plaats "${input.city}" valt binnen het doelgebied.`,
      sourceUrl: input.discoverySourceUrl,
      points: rubric.fit.inTargetArea,
    });
  }

  if (input.audit && input.homepageUrl && (input.audit.hasWebshop || input.audit.hasOnlineBooking || input.audit.hasContactForm)) {
    const evidenceParts = [
      input.audit.hasWebshop && "webshop",
      input.audit.hasOnlineBooking && "online boeken",
      input.audit.hasContactForm && "contactformulier",
    ].filter(Boolean);
    signals.push({
      code: "commercial_intent",
      labelNl: "Commerciële intentie zichtbaar",
      evidence: `Website toont: ${evidenceParts.join(", ")}.`,
      sourceUrl: input.homepageUrl,
      points: rubric.fit.commercialIntent,
    });
  }

  const recentEnough = input.audit?.lastContentYearGuess == null || input.audit.lastContentYearGuess >= currentYear() - 2;
  if (input.contacts?.phoneE164 && recentEnough) {
    signals.push({
      code: "active_business",
      labelNl: "Actief bedrijf",
      evidence: "Werkend telefoonnummer gevonden op de website.",
      sourceUrl: input.contacts.phoneE164.sourceUrl,
      points: rubric.fit.activeBusiness,
    });
  }

  const multiLocationUrl = input.crawledPageUrls?.find((u) => /vestiging|locaties/i.test(u));
  if (multiLocationUrl) {
    signals.push({
      code: "multi_location",
      labelNl: "Meerdere vestigingen",
      evidence: "Vestigingen-/locaties-pagina gevonden.",
      sourceUrl: multiLocationUrl,
      points: rubric.fit.multiLocation,
    });
  }

  return signals;
}

// ---------- PAIN (max 60) ----------

export function evaluatePainSignals(input: ScoringInput, rubric: Rubric): ScoredSignal[] {
  const signals: ScoredSignal[] = [];
  const siteUnreachable = !input.hasWebsite || !input.audit;

  if (siteUnreachable) {
    signals.push({
      code: "no_website",
      labelNl: "Geen werkende website",
      evidence: input.hasWebsite
        ? "Website opgegeven maar niet bereikbaar tijdens de crawl (mogelijk offline, verlopen certificaat of geparkeerd domein)."
        : "Geen website gevonden bij deze bron.",
      sourceUrl: input.discoverySourceUrl,
      points: rubric.pain.noWebsite,
    });
    return signals; // rest of the pain checks need a real audit — nothing more to evidence
  }

  const audit = input.audit!;
  const homepageUrl = input.homepageUrl ?? audit.url;

  if (!audit.httpsValid) {
    signals.push({ code: "no_https", labelNl: "Geen geldige HTTPS", evidence: "Website heeft geen geldig HTTPS-certificaat.", sourceUrl: homepageUrl, points: rubric.pain.noHttps });
  }
  if (!audit.mobileViewport) {
    signals.push({ code: "no_mobile_viewport", labelNl: "Niet mobielvriendelijk", evidence: "Geen mobile viewport-tag gevonden.", sourceUrl: homepageUrl, points: rubric.pain.noMobileViewport });
  }

  const slow = audit.loadTimeMs != null && audit.loadTimeMs > 3000;
  const lowPsi = audit.psi?.performanceScore != null && audit.psi.performanceScore < 40;
  if (slow || lowPsi) {
    const parts = [slow && `laadtijd ${audit.loadTimeMs}ms`, lowPsi && `PSI-score ${audit.psi?.performanceScore}`].filter(Boolean);
    signals.push({ code: "slow_or_low_psi", labelNl: "Trage website", evidence: parts.join(", "), sourceUrl: homepageUrl, points: rubric.pain.slowOrLowPsi });
  }

  if (audit.lastContentYearGuess != null && audit.lastContentYearGuess <= currentYear() - 3) {
    signals.push({
      code: "stale_content",
      labelNl: "Verouderde content",
      evidence: `Copyright-jaar in de footer is ${audit.lastContentYearGuess} (schatting, geen exacte laatste-wijzigingsdatum).`,
      sourceUrl: homepageUrl,
      points: rubric.pain.staleContent,
    });
  }

  if (!audit.hasContactForm) {
    signals.push({ code: "no_contact_form", labelNl: "Geen contactformulier", evidence: "Geen contactformulier gevonden op de gecrawlde pagina's.", sourceUrl: homepageUrl, points: rubric.pain.noContactForm });
  }

  // Conservative: only fires on an actually-observed broken cart/checkout
  // link in the crawl's broken-link sample — never inferred from webshop
  // presence alone (that would be guessing "broken" without evidence).
  const brokenCheckoutLink = audit.brokenLinksSample.find((l) => /cart|checkout|winkelwagen/i.test(l.url) && l.status !== 200);
  if (audit.hasWebshop && brokenCheckoutLink) {
    signals.push({
      code: "broken_webshop",
      labelNl: "Webshop met kapotte checkout",
      evidence: `Checkout-gerelateerde link geeft status ${brokenCheckoutLink.status ?? "onbereikbaar"}.`,
      sourceUrl: brokenCheckoutLink.url,
      points: rubric.pain.brokenWebshop,
    });
  }

  if (audit.outdatedMarker) {
    signals.push({
      code: "outdated_platform",
      labelNl: "Verouderd/hobbyistisch platform",
      evidence: `${audit.outdatedMarker} (${audit.outdatedMarkerEvidence}).`,
      sourceUrl: homepageUrl,
      points: rubric.pain.outdatedPlatform,
    });
  }

  if (!audit.titlePresent) {
    signals.push({ code: "seo_title_missing", labelNl: "Geen title-tag", evidence: "Pagina mist een <title>.", sourceUrl: homepageUrl, points: Math.round(rubric.pain.seoBasicsBroken / 3) });
  }
  if (!audit.metaDescriptionPresent) {
    signals.push({ code: "seo_meta_missing", labelNl: "Geen meta-omschrijving", evidence: "Pagina mist een meta description.", sourceUrl: homepageUrl, points: Math.round(rubric.pain.seoBasicsBroken / 3) });
  }
  if (!audit.h1Present) {
    signals.push({ code: "seo_h1_missing", labelNl: "Geen H1", evidence: "Pagina mist een H1-kop.", sourceUrl: homepageUrl, points: Math.round(rubric.pain.seoBasicsBroken / 3) });
  }

  if (audit.analyticsDetected.length === 0) {
    signals.push({ code: "no_analytics", labelNl: "Geen analytics", evidence: "Geen Google Analytics/Tag Manager/Meta Pixel gedetecteerd.", sourceUrl: homepageUrl, points: rubric.pain.noAnalytics });
  }

  if (!audit.hasChatOrWhatsapp && !audit.hasOnlineBooking) {
    signals.push({
      code: "no_chat_or_booking",
      labelNl: "Geen chat/WhatsApp/boeken",
      evidence: "Geen WhatsApp-link, chat of online-boeksysteem gevonden.",
      sourceUrl: homepageUrl,
      points: rubric.pain.noChatOrBooking,
    });
  }

  if (audit.schemaOrgTypes.length === 0) {
    signals.push({ code: "no_schema_org", labelNl: "Geen schema.org-markup", evidence: "Geen structured data (schema.org) gevonden.", sourceUrl: homepageUrl, points: rubric.pain.noSchemaOrg });
  }

  return signals;
}
