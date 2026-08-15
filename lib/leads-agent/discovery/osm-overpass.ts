import crypto from "crypto";
import { db } from "@/db";
import { prospectPageCache } from "@/db/schema";
import { eq } from "drizzle-orm";
import { toRegistrableDomain } from "@/lib/leads-agent/domain";
import { DEFAULT_CRAWL } from "@/lib/leads-agent/config";
import { sectorToOsmTags } from "./osm-sectors";
import type { DiscoveredCandidate, DiscoveryParams, DiscoverySource } from "./types";

// The primary public instance is community-run with no SLA and returns
// transient 406/502/504s under load (observed directly — same request
// succeeds seconds later). Retry once against the same endpoint, then fall
// back to the next mirror before giving up.
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const MIN_QUERY_INTERVAL_MS = 3000; // spec: max 1 query/3s
const CACHE_DAYS = 30;
const RETRYABLE_STATUS = new Set([406, 429, 502, 503, 504]);

let lastQueryAt = 0;

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  tags?: Record<string, string>;
  center?: { lat: number; lon: number };
}
interface OverpassResponse {
  elements: OverpassElement[];
}

function buildQuery(city: string, tags: string[]): string {
  const clauses = tags
    .map((tag) => {
      const [k, v] = tag.split("=");
      return `  node["${k}"="${v}"](area.searchArea);\n  way["${k}"="${v}"](area.searchArea);`;
    })
    .join("\n");
  return `[out:json][timeout:25];
area["name"="${city.replace(/"/g, '\\"')}"]["boundary"="administrative"]->.searchArea;
(
${clauses}
);
out center tags;`;
}

async function throttle() {
  const wait = MIN_QUERY_INTERVAL_MS - (Date.now() - lastQueryAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastQueryAt = Date.now();
}

function queryHash(query: string): string {
  return crypto.createHash("sha256").update(query).digest("hex");
}

async function fetchWithCache(query: string): Promise<OverpassResponse> {
  const urlHash = queryHash(query);
  const [cached] = await db.select().from(prospectPageCache).where(eq(prospectPageCache.urlHash, urlHash));
  if (cached?.body && cached.fetchedAt) {
    const ageDays = (Date.now() - cached.fetchedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays < CACHE_DAYS) return JSON.parse(cached.body) as OverpassResponse;
  }

  let lastError: Error | null = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      await throttle();
      let res: Response;
      try {
        res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": DEFAULT_CRAWL.userAgent,
          },
          body: `data=${encodeURIComponent(query)}`,
          signal: AbortSignal.timeout(DEFAULT_CRAWL.timeoutMs * 2),
        });
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        continue;
      }

      if (res.ok) {
        const json = (await res.json()) as OverpassResponse;
        await db
          .insert(prospectPageCache)
          .values({ urlHash, url: endpoint, status: res.status, body: JSON.stringify(json) })
          .onConflictDoUpdate({
            target: prospectPageCache.urlHash,
            set: { status: res.status, body: JSON.stringify(json), fetchedAt: new Date() },
          });
        return json;
      }

      lastError = new Error(`Overpass API error: ${res.status} ${res.statusText} (${endpoint})`);
      if (!RETRYABLE_STATUS.has(res.status)) throw lastError;
      // retryable — try again (same endpoint once, then the next mirror)
    }
  }

  throw lastError ?? new Error("Overpass API: alle endpoints faalden");
}

function elementToCandidate(el: OverpassElement, sector: string): DiscoveredCandidate | null {
  const tags = el.tags ?? {};
  const name = tags["name"];
  if (!name) return null; // no invented names — skip anything OSM doesn't name

  const website = tags["website"] ?? tags["contact:website"];
  const phone = tags["phone"] ?? tags["contact:phone"];
  const street = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ") || undefined;

  return {
    companyName: name,
    website,
    registrableDomain: website ? (toRegistrableDomain(website) ?? undefined) : undefined,
    street,
    postcode: tags["addr:postcode"],
    city: tags["addr:city"],
    province: undefined,
    phone,
    sector,
    sourceUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    sourceMethod: "osm_overpass",
    capturedAt: new Date().toISOString(),
    raw: { ...tags, osmType: el.type, osmId: el.id, lat: el.center?.lat, lon: el.center?.lon },
  };
}

export const osmOverpassSource: DiscoverySource = {
  key: "osm_overpass",
  label: "OpenStreetMap Overpass",
  isEnabled: () => true, // free, no key required — always available

  async discover(params: DiscoveryParams): Promise<DiscoveredCandidate[]> {
    const tags = sectorToOsmTags(params.sector);
    if (tags.length === 0) return [];

    const query = buildQuery(params.city, tags);
    const response = await fetchWithCache(query);

    const candidates: DiscoveredCandidate[] = [];
    for (const el of response.elements) {
      const candidate = elementToCandidate(el, params.sector);
      if (candidate) candidates.push(candidate);
      if (candidates.length >= params.limit) break;
    }
    return candidates;
  },
};
