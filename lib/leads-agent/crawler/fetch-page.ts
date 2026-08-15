import crypto from "crypto";
import { db } from "@/db";
import { prospectPageCache } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_CRAWL } from "@/lib/leads-agent/config";
import { isAllowedByRobots } from "./robots";

const CACHE_MAX_AGE_DAYS = 30; // matches the lead-level audit staleness threshold

// §4 rule 14: 1 concurrent request per host, >=1500ms between requests to
// the same host, global concurrency <=5. A single Node process only (this
// doesn't coordinate across serverless invocations) — adequate for how
// Phase 6 actually dispatches work (one host crawled per task), logged as
// a LIMITATION rather than building cross-instance coordination nobody
// needs yet.
const hostLastFetchAt = new Map<string, number>();
let globalInFlight = 0;
const MAX_GLOBAL_CONCURRENCY = 5;
const MIN_HOST_INTERVAL_MS = 1500;

export type FetchPageResult =
  | { ok: true; html: string; status: number; finalUrl: string; fromCache: boolean }
  | { ok: false; reason: "robots_disallowed" | "fetch_error" | "too_large"; error?: string };

function urlHash(url: string): string {
  return crypto.createHash("sha256").update(url).digest("hex");
}

async function waitForSlot(host: string) {
  while (globalInFlight >= MAX_GLOBAL_CONCURRENCY) {
    await new Promise((r) => setTimeout(r, 200));
  }
  const last = hostLastFetchAt.get(host) ?? 0;
  const wait = MIN_HOST_INTERVAL_MS - (Date.now() - last);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

export async function fetchPage(pageUrl: string, opts: { skipCache?: boolean } = {}): Promise<FetchPageResult> {
  const allowed = await isAllowedByRobots(pageUrl);
  if (!allowed) return { ok: false, reason: "robots_disallowed" };

  const hash = urlHash(pageUrl);
  if (!opts.skipCache) {
    const [cached] = await db.select().from(prospectPageCache).where(eq(prospectPageCache.urlHash, hash));
    if (cached?.body && cached.fetchedAt) {
      const ageDays = (Date.now() - cached.fetchedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays < CACHE_MAX_AGE_DAYS) {
        return { ok: true, html: cached.body, status: cached.status ?? 200, finalUrl: pageUrl, fromCache: true };
      }
    }
  }

  const host = new URL(pageUrl).host;
  await waitForSlot(host);
  globalInFlight++;
  hostLastFetchAt.set(host, Date.now());

  try {
    const res = await fetch(pageUrl, {
      headers: { "User-Agent": DEFAULT_CRAWL.userAgent },
      signal: AbortSignal.timeout(DEFAULT_CRAWL.timeoutMs),
      redirect: "follow",
    });

    const declaredLength = Number(res.headers.get("content-length") ?? 0);
    if (declaredLength > DEFAULT_CRAWL.maxResponseBytes) {
      return { ok: false, reason: "too_large" };
    }

    let html = await res.text();
    // ASSUMPTION: character-count truncation as a pragmatic stand-in for
    // exact byte-streaming enforcement (fetch() has no built-in byte cap;
    // full streaming truncation is meaningfully more code for marginal
    // benefit here since this only guards against unusually large pages).
    if (html.length > DEFAULT_CRAWL.maxResponseBytes) {
      html = html.slice(0, DEFAULT_CRAWL.maxResponseBytes);
    }

    await db
      .insert(prospectPageCache)
      .values({ urlHash: hash, url: pageUrl, status: res.status, body: html })
      .onConflictDoUpdate({ target: prospectPageCache.urlHash, set: { status: res.status, body: html, fetchedAt: new Date() } });

    return { ok: true, html, status: res.status, finalUrl: res.url || pageUrl, fromCache: false };
  } catch (err) {
    return { ok: false, reason: "fetch_error", error: err instanceof Error ? err.message : String(err) };
  } finally {
    globalInFlight--;
  }
}
