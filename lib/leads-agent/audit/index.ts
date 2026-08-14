import * as cheerio from "cheerio";
import { fetchPage } from "@/lib/leads-agent/crawler/fetch-page";
import { detectPlatform, detectOutdatedMarker } from "./platform";
import { runPageSpeedInsights, type PsiResult } from "./pagespeed";
import type { CrawledPage } from "@/lib/leads-agent/crawler";

const ANALYTICS_SIGNATURES: { name: string; pattern: RegExp }[] = [
  { name: "google_analytics", pattern: /google-analytics\.com\/(analytics|gtag)\.js|gtag\(/i },
  { name: "google_tag_manager", pattern: /googletagmanager\.com\/gtm\.js/i },
  { name: "meta_pixel", pattern: /connect\.facebook\.net\/.*\/fbevents\.js/i },
  { name: "hotjar", pattern: /static\.hotjar\.com/i },
  { name: "microsoft_clarity", pattern: /clarity\.ms\/tag/i },
];

const BOOKING_SIGNATURES = [/calendly\.com/i, /simplybook\.(me|it)/i, /afspraak\s?maken/i, /boek\s?(nu|online)/i, /reserveer(ing)?/i];
const WEBSHOP_SIGNATURES = [/winkelwagen/i, /woocommerce/i, /shopify/i, /toevoegen aan (winkel)?mand/i, /\/cart\b/i, /\/checkout\b/i];

export interface AuditRaw {
  url: string;
  httpsValid: boolean;
  httpStatus: number | null;
  loadTimeMs: number | null;
  mobileViewport: boolean;
  platform: string | null;
  platformEvidence: string | null;
  outdatedMarker: string | null;
  outdatedMarkerEvidence: string | null;
  titlePresent: boolean;
  titleLength: number;
  metaDescriptionPresent: boolean;
  metaDescriptionLength: number;
  h1Present: boolean;
  h1Count: number;
  schemaOrgTypes: string[];
  analyticsDetected: string[];
  hasContactForm: boolean;
  hasChatOrWhatsapp: boolean;
  hasOnlineBooking: boolean;
  hasWebshop: boolean;
  brokenLinksSample: { url: string; status: number | null }[];
  imageCount: number;
  imagesWithoutAlt: number;
  htmlLangPresent: boolean;
  lastContentYearGuess: number | null;
  psi: PsiResult | null;
  auditedAt: string;
}

function extractSchemaOrgTypes($: cheerio.CheerioAPI): string[] {
  const types = new Set<string>();
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).contents().text());
      collectTypes(json, types);
    } catch {
      // malformed JSON-LD — skip, don't guess
    }
  });
  return [...types];
}

function collectTypes(node: unknown, types: Set<string>) {
  if (Array.isArray(node)) {
    node.forEach((n) => collectTypes(n, types));
    return;
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (typeof obj["@type"] === "string") types.add(obj["@type"]);
    if (Array.isArray(obj["@type"])) obj["@type"].forEach((t) => typeof t === "string" && types.add(t));
    if (Array.isArray(obj["@graph"])) collectTypes(obj["@graph"], types);
  }
}

function pageHasContactForm(html: string): boolean {
  const $ = cheerio.load(html);
  return $("form").filter((_, form) => $(form).find('input[type="email"], textarea, input[type="text"]').length > 0).length > 0;
}

async function measureLoadTimeMs(homepageUrl: string): Promise<number | null> {
  const samples: number[] = [];
  for (let i = 0; i < 3; i++) {
    const start = Date.now();
    const result = await fetchPage(homepageUrl, { skipCache: true });
    if (result.ok) samples.push(Date.now() - start);
  }
  if (samples.length === 0) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

async function sampleBrokenLinks(html: string, baseUrl: string, sampleSize = 5): Promise<{ url: string; status: number | null }[]> {
  const $ = cheerio.load(html);
  const origin = new URL(baseUrl).origin;
  const internalLinks = $("a[href]")
    .map((_, el) => $(el).attr("href"))
    .get()
    .filter((h): h is string => Boolean(h))
    .map((h) => {
      try {
        return new URL(h, baseUrl).toString();
      } catch {
        return null;
      }
    })
    .filter((u): u is string => u !== null && u.startsWith(origin));

  const unique = [...new Set(internalLinks)].slice(0, sampleSize);
  const results: { url: string; status: number | null }[] = [];
  for (const link of unique) {
    const result = await fetchPage(link);
    results.push({ url: link, status: result.ok ? result.status : null });
  }
  return results;
}

/**
 * Raw, measured audit — nothing here is guessed. Stored in lead_audits.raw_json;
 * translating it into scored lead_signals rows is Phase 4's job.
 */
export async function runAudit(website: string, crawl: { pages: CrawledPage[] }): Promise<AuditRaw> {
  const baseUrl = website.startsWith("http") ? website : `https://${website}`;
  const homepage = crawl.pages.find((p) => new URL(p.url).pathname === "/" || p.url === baseUrl) ?? crawl.pages[0];

  if (!homepage) {
    return {
      url: baseUrl,
      httpsValid: false,
      httpStatus: null,
      loadTimeMs: null,
      mobileViewport: false,
      platform: null,
      platformEvidence: null,
      outdatedMarker: null,
      outdatedMarkerEvidence: null,
      titlePresent: false,
      titleLength: 0,
      metaDescriptionPresent: false,
      metaDescriptionLength: 0,
      h1Present: false,
      h1Count: 0,
      schemaOrgTypes: [],
      analyticsDetected: [],
      hasContactForm: false,
      hasChatOrWhatsapp: false,
      hasOnlineBooking: false,
      hasWebshop: false,
      brokenLinksSample: [],
      imageCount: 0,
      imagesWithoutAlt: 0,
      htmlLangPresent: false,
      lastContentYearGuess: null,
      psi: null,
      auditedAt: new Date().toISOString(),
    };
  }

  const $ = cheerio.load(homepage.html);
  const platformMatch = detectPlatform(homepage.html);
  const outdatedMatch = detectOutdatedMarker(homepage.html);
  const combinedText = crawl.pages.map((p) => p.html).join("\n");
  // Contact forms are frequently on a dedicated /contact page, not the
  // homepage — check every crawled page, not just the homepage's $.
  const hasContactFormAnyPage = crawl.pages.some((p) => pageHasContactForm(p.html));

  const title = $("title").first().text().trim();
  const metaDescription = $('meta[name="description"]').attr("content")?.trim() ?? "";
  const viewportContent = $('meta[name="viewport"]').attr("content") ?? "";
  const images = $("img");
  const imagesWithoutAlt = images.filter((_, el) => !$(el).attr("alt")?.trim()).length;

  const copyrightMatch = homepage.html.match(/©\s*(\d{4})/) ?? homepage.html.match(/copyright\s*(\d{4})/i);

  const [loadTimeMs, brokenLinksSample, psi] = await Promise.all([
    measureLoadTimeMs(homepage.url),
    sampleBrokenLinks(homepage.html, homepage.url),
    runPageSpeedInsights(homepage.url),
  ]);

  return {
    url: homepage.url,
    httpsValid: homepage.url.startsWith("https://"),
    httpStatus: homepage.status,
    loadTimeMs,
    mobileViewport: viewportContent.includes("width=device-width"),
    platform: platformMatch?.platform ?? null,
    platformEvidence: platformMatch?.evidence ?? null,
    outdatedMarker: outdatedMatch?.label ?? null,
    outdatedMarkerEvidence: outdatedMatch?.evidence ?? null,
    titlePresent: title.length > 0,
    titleLength: title.length,
    metaDescriptionPresent: metaDescription.length > 0,
    metaDescriptionLength: metaDescription.length,
    h1Present: $("h1").length > 0,
    h1Count: $("h1").length,
    schemaOrgTypes: extractSchemaOrgTypes($),
    analyticsDetected: ANALYTICS_SIGNATURES.filter((sig) => sig.pattern.test(combinedText)).map((sig) => sig.name),
    hasContactForm: hasContactFormAnyPage,
    hasChatOrWhatsapp: /(wa\.me|api\.whatsapp\.com)/i.test(combinedText),
    hasOnlineBooking: BOOKING_SIGNATURES.some((p) => p.test(combinedText)),
    hasWebshop: WEBSHOP_SIGNATURES.some((p) => p.test(combinedText)),
    brokenLinksSample,
    imageCount: images.length,
    imagesWithoutAlt,
    htmlLangPresent: Boolean($("html").attr("lang")),
    lastContentYearGuess: copyrightMatch ? Number(copyrightMatch[1]) : null,
    psi,
    auditedAt: new Date().toISOString(),
  };
}
