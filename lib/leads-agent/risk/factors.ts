import type { DEFAULT_ICP, DEFAULT_RISK } from "@/lib/leads-agent/config";
import type { RiskFactor, RiskInput } from "./types";

type Risk = typeof DEFAULT_RISK;
type Icp = typeof DEFAULT_ICP;

const PRIVACY_PAGE_PATTERN = /privacy|cookie|avg|gdpr|disclaimer/i;
const CLOSED_BUILDER_PLATFORMS = ["Wix", "Squarespace"];

function currentYear(): number {
  return new Date().getFullYear();
}

function dnsStatus(input: RiskInput, name: string): "green" | "amber" | "red" | undefined {
  return input.dns?.find((c) => c.name === name)?.status;
}

function dnsDetail(input: RiskInput, name: string): string {
  return input.dns?.find((c) => c.name === name)?.detail ?? "";
}

// ---------- BUSINESS RISK: what the prospect is exposed to ----------

export function evaluateBusinessRisk(input: RiskInput, risk: Risk): RiskFactor[] {
  const factors: RiskFactor[] = [];
  const domainSourceUrl = input.homepageUrl ?? input.audit?.url ?? input.discoverySourceUrl;

  if (!input.hasWebsite || !input.audit) {
    factors.push({
      code: "risk_site_unreachable",
      labelNl: "Geen bereikbare website",
      evidence: input.hasWebsite
        ? "Website opgegeven maar niet bereikbaar tijdens de crawl — bezoekers en aanvragen komen op dit moment niet aan."
        : "Geen website gevonden bij deze bron — het bedrijf is online niet vindbaar via een eigen site.",
      sourceUrl: input.discoverySourceUrl,
      points: risk.business.siteUnreachable,
      axis: "business",
      category: "continuity",
    });
    // Every remaining business factor needs a real audit. Stop here rather
    // than scoring absence of evidence as evidence of absence.
    return factors;
  }

  const audit = input.audit;

  if (!audit.httpsValid) {
    factors.push({
      code: "risk_no_https",
      labelNl: "Geen geldige HTTPS",
      evidence: "Website draait niet op een geldig HTTPS-certificaat — browsers tonen een waarschuwing en ingevulde formuliergegevens gaan onversleuteld over de lijn.",
      sourceUrl: domainSourceUrl,
      points: risk.business.noHttps,
      axis: "business",
      category: "security",
    });

    if (audit.hasWebshop) {
      factors.push({
        code: "risk_webshop_without_https",
        labelNl: "Webshop zonder HTTPS",
        evidence: "Webshop-kenmerken gevonden op een site zonder geldig HTTPS — bestel- en betaalgegevens worden onversleuteld verzonden.",
        sourceUrl: domainSourceUrl,
        points: risk.business.webshopWithoutHttps,
        axis: "business",
        category: "security",
      });
    }
  }

  if (audit.httpStatus != null && audit.httpStatus >= 400) {
    factors.push({
      code: "risk_http_error",
      labelNl: "Website geeft een foutstatus",
      evidence: `Homepage antwoordt met HTTP-status ${audit.httpStatus}.`,
      sourceUrl: domainSourceUrl,
      points: risk.business.httpError,
      axis: "business",
      category: "continuity",
    });
  }

  if (audit.outdatedMarker) {
    factors.push({
      code: "risk_outdated_platform",
      labelNl: "Verouderde techniek met beveiligingsrisico",
      evidence: `${audit.outdatedMarker} (${audit.outdatedMarkerEvidence}) — verouderde componenten krijgen geen beveiligingsupdates meer.`,
      sourceUrl: domainSourceUrl,
      points: risk.business.outdatedPlatform,
      axis: "business",
      category: "security",
    });
  }

  // Mail-domain factors only fire when DNS was actually queried. Without a
  // dns array these are unknowns, not passes — assessRisk() reports that.
  if (input.dns) {
    if (dnsStatus(input, "DMARC") === "red") {
      factors.push({
        code: "risk_no_dmarc",
        labelNl: "Mailadres is te vervalsen",
        evidence: `Geen DMARC-record op het domein (${dnsDetail(input, "DMARC")}) — derden kunnen mail versturen die van dit bedrijf lijkt te komen.`,
        sourceUrl: domainSourceUrl,
        points: risk.business.noDmarc,
        axis: "business",
        category: "security",
      });
    }

    const spf = dnsStatus(input, "SPF");
    if (spf === "red" || spf === "amber") {
      factors.push({
        code: "risk_weak_spf",
        labelNl: "SPF ontbreekt of is te ruim",
        evidence: `SPF-controle: ${dnsDetail(input, "SPF")} — eigen mail belandt vaker in spam en spoofing wordt niet geblokkeerd.`,
        sourceUrl: domainSourceUrl,
        points: risk.business.weakSpf,
        axis: "business",
        category: "security",
      });
    }

    if (dnsStatus(input, "MX") === "red") {
      factors.push({
        code: "risk_no_mx",
        labelNl: "Domein kan geen mail ontvangen",
        evidence: `MX-controle: ${dnsDetail(input, "MX")}`,
        sourceUrl: domainSourceUrl,
        points: risk.business.noMx,
        axis: "business",
        category: "continuity",
      });
    }
  }

  // Analytics/pixels present but no privacy or cookie page found anywhere in
  // the crawl. Worded as an indication, not a verdict: consent tooling and
  // policy pages are often injected by JavaScript or live behind a footer
  // route the crawler's page budget never reached.
  const privacyPageUrl = input.crawledPageUrls?.find((u) => PRIVACY_PAGE_PATTERN.test(u));
  if (audit.analyticsDetected.length > 0 && !privacyPageUrl) {
    factors.push({
      code: "risk_analytics_without_privacy_page",
      labelNl: "Tracking zonder zichtbare privacypagina",
      evidence: `${audit.analyticsDetected.join(", ")} gedetecteerd, maar op de gecrawlde pagina's is geen privacy- of cookiepagina gevonden — indicatie van een AVG-risico (let op: consent-tooling wordt vaak via JavaScript geladen en kan zijn gemist).`,
      sourceUrl: domainSourceUrl,
      points: risk.business.analyticsWithoutPrivacyPage,
      axis: "business",
      category: "compliance",
    });
  }

  const brokenLink = audit.brokenLinksSample.find((l) => l.status == null || l.status >= 400);
  if (brokenLink) {
    factors.push({
      code: "risk_broken_links",
      labelNl: "Kapotte links op de site",
      evidence: `Interne link geeft status ${brokenLink.status ?? "onbereikbaar"} — bezoekers lopen vast.`,
      sourceUrl: brokenLink.url,
      points: risk.business.brokenLinks,
      axis: "business",
      category: "continuity",
    });
  }

  if (audit.lastContentYearGuess != null && audit.lastContentYearGuess <= currentYear() - 3) {
    factors.push({
      code: "risk_stale_content",
      labelNl: "Site oogt verlaten",
      evidence: `Copyright-jaar in de footer is ${audit.lastContentYearGuess} (schatting) — bezoekers kunnen denken dat het bedrijf gestopt is.`,
      sourceUrl: domainSourceUrl,
      points: risk.business.staleContent,
      axis: "business",
      category: "continuity",
    });
  }

  if (!audit.mobileViewport) {
    factors.push({
      code: "risk_no_mobile_viewport",
      labelNl: "Onbruikbaar op mobiel",
      evidence: "Geen mobile viewport-tag gevonden — het merendeel van het verkeer krijgt een onleesbare pagina.",
      sourceUrl: domainSourceUrl,
      points: risk.business.noMobileViewport,
      axis: "business",
      category: "continuity",
    });
  }

  return factors;
}

// ---------- ENGAGEMENT RISK: what taking them on would cost us ----------

export function evaluateEngagementRisk(input: RiskInput, risk: Risk, icp: Icp): RiskFactor[] {
  const factors: RiskFactor[] = [];
  const audit = input.audit;
  const contacts = input.contacts;
  const domainSourceUrl = input.homepageUrl ?? audit?.url ?? input.discoverySourceUrl;

  if (icp.disqualifySectors.includes(input.sector)) {
    factors.push({
      code: "risk_sector_disqualified",
      labelNl: "Sector staat op de uitsluitlijst",
      evidence: `Sector "${input.sector}" staat op de uitsluitlijst (concurrent of ongeschikt verdienmodel).`,
      sourceUrl: input.discoverySourceUrl,
      points: risk.engagement.sectorDisqualified,
      axis: "engagement",
      category: "fit",
    });
  }

  const hasChannel = Boolean(contacts?.emailGeneral || contacts?.phoneE164 || contacts?.contactFormUrl);
  if (!hasChannel) {
    factors.push({
      code: "risk_no_reachable_channel",
      labelNl: "Geen bruikbaar contactkanaal",
      evidence: "Geen e-mailadres, telefoonnummer of contactformulier gevonden met bewijs — benaderen kost handwerk zonder zekerheid dat het aankomt.",
      sourceUrl: input.discoverySourceUrl,
      points: risk.engagement.noReachableChannel,
      axis: "engagement",
      category: "reachability",
    });
  }

  // Three independent "this company may no longer trade" indications at once.
  // Any one alone is too weak to act on; together they justify deprioritising.
  const staleYear = audit?.lastContentYearGuess != null && audit.lastContentYearGuess <= currentYear() - 3;
  if ((!input.hasWebsite || !audit || staleYear) && !contacts?.phoneE164 && !contacts?.emailGeneral) {
    factors.push({
      code: "risk_possibly_inactive",
      labelNl: "Mogelijk niet meer actief",
      evidence: `${!audit ? "Geen bereikbare website" : `Content uit ${audit.lastContentYearGuess}`}, geen telefoonnummer en geen e-mailadres gevonden — het bedrijf handelt mogelijk niet meer.`,
      sourceUrl: input.discoverySourceUrl,
      points: risk.engagement.possiblyInactive,
      axis: "engagement",
      category: "fit",
    });
  }

  // A site that is already fine is a poor prospect: nothing to fix means
  // nothing to sell, and outreach lands as noise.
  if (audit) {
    const recentContent = audit.lastContentYearGuess == null || audit.lastContentYearGuess >= currentYear() - 1;
    const fastEnough = audit.psi?.performanceScore == null ? audit.loadTimeMs != null && audit.loadTimeMs <= 2000 : audit.psi.performanceScore >= 70;
    if (audit.httpsValid && audit.mobileViewport && audit.analyticsDetected.length > 0 && recentContent && fastEnough && !audit.outdatedMarker) {
      factors.push({
        code: "risk_low_pain_modern_site",
        labelNl: "Site is al op orde",
        evidence: "HTTPS geldig, mobielvriendelijk, analytics aanwezig, recente content en acceptabele snelheid — weinig aanleiding voor een gesprek.",
        sourceUrl: domainSourceUrl,
        points: risk.engagement.lowPainModernSite,
        axis: "engagement",
        category: "fit",
      });
    }
  }

  const multiLocationUrl = input.crawledPageUrls?.find((u) => /vestiging|locaties/i.test(u));
  if (multiLocationUrl && audit?.hasWebshop) {
    factors.push({
      code: "risk_enterprise_scope",
      labelNl: "Scope groter dan MKB-traject",
      evidence: "Meerdere vestigingen én een webshop — omvang valt waarschijnlijk buiten het standaard MKB-traject en vereist een aparte begroting.",
      sourceUrl: multiLocationUrl,
      points: risk.engagement.enterpriseScope,
      axis: "engagement",
      category: "delivery",
    });
  }

  if (audit?.platform && CLOSED_BUILDER_PLATFORMS.includes(audit.platform)) {
    factors.push({
      code: "risk_closed_platform",
      labelNl: "Gesloten bouwplatform",
      evidence: `Site draait op ${audit.platform} (${audit.platformEvidence}) — content en vormgeving zijn niet zonder meer over te zetten, wat migratietijd kost.`,
      sourceUrl: domainSourceUrl,
      points: risk.engagement.closedPlatform,
      axis: "engagement",
      category: "delivery",
    });
  }

  if (!contacts?.kvkNumber) {
    factors.push({
      code: "risk_unverified_identity",
      labelNl: "Geen KvK-nummer gevonden",
      evidence: "Geen KvK-nummer op de site gevonden — rechtsvorm en inschrijving zijn niet geverifieerd.",
      sourceUrl: domainSourceUrl,
      points: risk.engagement.unverifiedIdentity,
      axis: "engagement",
      category: "fit",
    });
  }

  return factors;
}
