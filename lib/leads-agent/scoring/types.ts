import type { AuditRaw } from "@/lib/leads-agent/audit";
import type { ExtractedContacts } from "@/lib/leads-agent/extraction/contacts";

export interface ScoringInput {
  sector: string;
  city?: string;
  /** Where the candidate's name/sector/city came from (Overpass node URL, Places result, etc.) — evidence source for sector/location-derived fit signals. */
  discoverySourceUrl: string;
  hasWebsite: boolean;
  homepageUrl?: string;
  /** undefined when the site is unreachable/dead, or hasWebsite is false */
  audit?: AuditRaw;
  contacts?: ExtractedContacts;
  /** URLs of every page actually crawled — used for team-page/vestigingen proxy signals */
  crawledPageUrls?: string[];
}

export interface ScoredSignal {
  code: string;
  labelNl: string;
  evidence: string;
  sourceUrl: string;
  points: number;
}

export interface ScoringResult {
  fitScore: number;
  painScore: number;
  totalScore: number;
  priority: "A" | "B" | "C" | null;
  qualified: boolean;
  disqualifiedReason: string | null;
  signals: ScoredSignal[];
  recommendedOffer: string;
  recommendedChannel: string | null;
}
