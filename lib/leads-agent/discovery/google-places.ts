import { toRegistrableDomain } from "@/lib/leads-agent/domain";
import type { DiscoveredCandidate, DiscoveryParams, DiscoverySource } from "./types";

const TEXT_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json";
const DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json";

interface PlaceTextSearchResult {
  place_id: string;
  name: string;
  formatted_address?: string;
}
interface PlaceDetailsResult {
  name: string;
  formatted_phone_number?: string;
  website?: string;
  business_status?: string;
  rating?: number;
  address_components?: { long_name: string; types: string[] }[];
}

async function textSearch(query: string, apiKey: string): Promise<PlaceTextSearchResult[]> {
  const url = `${TEXT_SEARCH_URL}?query=${encodeURIComponent(query)}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google Places text search failed: ${res.status}`);
  const json = await res.json();
  return (json.results ?? []) as PlaceTextSearchResult[];
}

async function details(placeId: string, apiKey: string): Promise<PlaceDetailsResult | null> {
  const fields = "name,formatted_phone_number,website,business_status,rating,address_component";
  const url = `${DETAILS_URL}?place_id=${placeId}&fields=${fields}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  return (json.result ?? null) as PlaceDetailsResult | null;
}

function addressComponent(components: PlaceDetailsResult["address_components"], type: string): string | undefined {
  return components?.find((c) => c.types.includes(type))?.long_name;
}

export const googlePlacesSource: DiscoverySource = {
  key: "google_places",
  label: "Google Places",
  isEnabled: () => Boolean(process.env.GOOGLE_PLACES_API_KEY),

  async discover(params: DiscoveryParams): Promise<DiscoveredCandidate[]> {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) return []; // disables itself gracefully — checked by isEnabled(), belt-and-suspenders here

    const results = await textSearch(`${params.sector} in ${params.city}`, apiKey);
    const capturedAt = new Date().toISOString();
    const candidates: DiscoveredCandidate[] = [];

    for (const result of results.slice(0, params.limit)) {
      const info = await details(result.place_id, apiKey);
      if (!info?.name) continue;

      candidates.push({
        companyName: info.name,
        website: info.website,
        registrableDomain: info.website ? (toRegistrableDomain(info.website) ?? undefined) : undefined,
        street: addressComponent(info.address_components, "route"),
        postcode: addressComponent(info.address_components, "postal_code"),
        city: addressComponent(info.address_components, "locality") ?? params.city,
        province: addressComponent(info.address_components, "administrative_area_level_1"),
        phone: info.formatted_phone_number,
        sector: params.sector,
        sourceUrl: `https://www.google.com/maps/place/?q=place_id:${result.place_id}`,
        sourceMethod: "google_places",
        capturedAt,
        raw: { placeId: result.place_id, businessStatus: info.business_status, rating: info.rating, placesFetchedAt: capturedAt },
      });
    }
    return candidates;
  },
};
