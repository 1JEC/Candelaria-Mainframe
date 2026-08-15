import type { AuditRaw } from "@/lib/leads-agent/audit";
import type { DnsCheckResult } from "@/lib/leads-agent/health/dns-check";
import type { ExtractedContacts } from "@/lib/leads-agent/extraction/contacts";

export type RiskLevel = "laag" | "verhoogd" | "hoog";

/**
 * Two independent axes — they answer different questions and must never be
 * collapsed into one number:
 *
 *   business   = how exposed the PROSPECT is right now (security, compliance,
 *                continuity). This is the honest reason to approach them.
 *   engagement = how risky taking them on would be for US (reachability,
 *                fit, delivery friction). This only drives internal triage.
 */
export type RiskAxis = "business" | "engagement";

export type RiskCategory =
  | "security"
  | "compliance"
  | "continuity"
  | "reachability"
  | "fit"
  | "delivery";

/**
 * Structurally assignable to ScoredSignal (code/labelNl/evidence/sourceUrl/
 * points), so risk factors can be fed straight into groundAiOutput() and the
 * evidence sheet alongside scoring signals.
 */
export interface RiskFactor {
  code: string;
  labelNl: string;
  evidence: string;
  sourceUrl: string;
  points: number;
  axis: RiskAxis;
  category: RiskCategory;
}

export interface RiskInput {
  sector: string;
  /** Where the candidate's name/sector/city came from — the fallback evidence source when there is no website to point at. */
  discoverySourceUrl: string;
  hasWebsite: boolean;
  homepageUrl?: string;
  /** undefined when the site is unreachable/dead, or hasWebsite is false */
  audit?: AuditRaw;
  contacts?: ExtractedContacts;
  /** URLs of every page actually crawled — used to look for a privacy/cookie page */
  crawledPageUrls?: string[];
  /** Optional MX/SPF/DKIM/DMARC results for the prospect's own domain. Omitted -> those factors are skipped and reported as an unknown, never assumed absent. */
  dns?: DnsCheckResult[];
}

export interface RiskAssessment {
  businessRisk: RiskLevel;
  businessRiskScore: number;
  engagementRisk: RiskLevel;
  engagementRiskScore: number;
  factors: RiskFactor[];
  /** One line for the lead card, built from the heaviest factors — never AI-written. */
  headlineNl: string;
  /** What could NOT be measured. Always populated; an empty risk score with no unknowns would be a lie. */
  unknowns: string[];
}
