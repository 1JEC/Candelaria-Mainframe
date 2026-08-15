import type { DiscoveredCandidate, DiscoveryParams, DiscoverySource } from "./types";

// KvK's public Zoeken (search) API v2. Endpoint/response shape below match
// KvK's published API docs as of this writing, but this adapter has never
// run against a live key in this environment (KVK_API_KEY is unset here) —
// `ASSUMPTION`: verify the exact response shape against a real KvK sandbox
// key before relying on this in production. KvK explicitly contains no
// email addresses — this source is verification/firmographics only, never
// a contact-channel source.
const KVK_SEARCH_URL = "https://api.kvk.nl/api/v2/zoeken";

interface KvkResultItem {
  kvkNummer: string;
  naam: string;
  adres?: {
    binnenlandsAdres?: {
      straatnaam?: string;
      postcode?: string;
      plaats?: string;
      huisnummer?: number;
    };
  };
  sbiActiviteiten?: { sbiCode: string }[];
}
interface KvkSearchResponse {
  resultaten: KvkResultItem[];
}

export const kvkSource: DiscoverySource = {
  key: "kvk",
  label: "KvK Handelsregister",
  isEnabled: () => Boolean(process.env.KVK_API_KEY),

  async discover(params: DiscoveryParams): Promise<DiscoveredCandidate[]> {
    const apiKey = process.env.KVK_API_KEY;
    if (!apiKey) return [];

    const url = `${KVK_SEARCH_URL}?plaats=${encodeURIComponent(params.city)}&aantal=${Math.min(params.limit, 100)}`;
    const res = await fetch(url, { headers: { apikey: apiKey } });
    if (!res.ok) throw new Error(`KvK zoeken API error: ${res.status}`);
    const json = (await res.json()) as KvkSearchResponse;
    const capturedAt = new Date().toISOString();

    return (json.resultaten ?? []).slice(0, params.limit).map((item): DiscoveredCandidate => {
      const addr = item.adres?.binnenlandsAdres;
      return {
        companyName: item.naam,
        street: addr ? [addr.straatnaam, addr.huisnummer].filter(Boolean).join(" ") : undefined,
        postcode: addr?.postcode,
        city: addr?.plaats,
        sector: params.sector,
        sourceUrl: `https://www.kvk.nl/zoeken/?kvknummer=${item.kvkNummer}`,
        sourceMethod: "kvk",
        capturedAt,
        raw: { kvkNummer: item.kvkNummer, sbiCode: item.sbiActiviteiten?.[0]?.sbiCode },
      };
    });
  },
};
