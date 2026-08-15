export interface DiscoveredCandidate {
  companyName: string;
  website?: string;
  registrableDomain?: string;
  street?: string;
  postcode?: string;
  city?: string;
  province?: string;
  phone?: string;
  sector: string;
  sourceUrl: string;
  sourceMethod: string; // osm_overpass | google_places | kvk | csv_seed | site_expansion
  capturedAt: string;
  raw: Record<string, unknown>;
}

export interface DiscoveryParams {
  city: string;
  sector: string; // key into DEFAULT_ICP.sectors
  limit: number;
}

export interface DiscoverySource {
  key: string;
  label: string;
  isEnabled(): boolean;
  discover(params: DiscoveryParams): Promise<DiscoveredCandidate[]>;
}
