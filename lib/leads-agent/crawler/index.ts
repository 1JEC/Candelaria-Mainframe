import { DEFAULT_CRAWL } from "@/lib/leads-agent/config";
import { findExpansionUrls } from "@/lib/leads-agent/discovery/site-expansion";
import { fetchPage } from "./fetch-page";

export interface CrawledPage {
  url: string;
  html: string;
  status: number;
  fromCache: boolean;
}
export interface CrawlSkip {
  url: string;
  reason: string;
}
export interface CrawlResult {
  pages: CrawledPage[];
  skipped: CrawlSkip[];
}

function normalizeBaseUrl(website: string): string {
  return website.startsWith("http://") || website.startsWith("https://") ? website : `https://${website}`;
}

/**
 * §4 rules 12-15 crawl: robots-respecting, per-host politeness, page-budget
 * capped, cached. Page selection: homepage first, then contact/team/about
 * pages from the sitemap (site-expansion, Phase 2), deduped, capped at
 * DEFAULT_CRAWL.maxPagesPerDomain (8).
 */
export async function crawlDomain(website: string, maxPages = DEFAULT_CRAWL.maxPagesPerDomain): Promise<CrawlResult> {
  const baseUrl = normalizeBaseUrl(website);
  const pages: CrawledPage[] = [];
  const skipped: CrawlSkip[] = [];

  const expansionUrls = await findExpansionUrls(baseUrl).catch(() => [] as string[]);
  const candidateUrls = [...new Set([baseUrl, ...expansionUrls])].slice(0, maxPages);

  for (const url of candidateUrls) {
    const result = await fetchPage(url);
    if (result.ok) {
      pages.push({ url: result.finalUrl, html: result.html, status: result.status, fromCache: result.fromCache });
    } else {
      skipped.push({ url, reason: result.reason });
    }
  }

  return { pages, skipped };
}
