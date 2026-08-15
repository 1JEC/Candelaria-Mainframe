import { DEFAULT_ICP, DEFAULT_RISK } from "@/lib/leads-agent/config";
import { evaluateBusinessRisk, evaluateEngagementRisk } from "./factors";
import type { RiskAssessment, RiskFactor, RiskInput, RiskLevel } from "./types";

export type { RiskAssessment, RiskFactor, RiskInput, RiskLevel, RiskAxis, RiskCategory } from "./types";

/**
 * Evidence-bound risk assessment, deliberately separate from scoreLead().
 *
 * Scoring answers "is there work here and does it fit our ICP?".
 * This answers two different questions: what is at stake for the prospect
 * (businessRisk — the honest reason to reach out), and what taking them on
 * would cost us (engagementRisk — internal triage only, never in outreach).
 *
 * Pure and synchronous like scoreLead: every input is already-measured data.
 * Nothing here fetches, and nothing here is inferred from absence of
 * evidence — unmeasurable things land in `unknowns` instead of quietly
 * scoring as zero.
 */
export function assessRisk(
  input: RiskInput,
  risk: typeof DEFAULT_RISK = DEFAULT_RISK,
  icp: typeof DEFAULT_ICP = DEFAULT_ICP
): RiskAssessment {
  const businessFactors = evaluateBusinessRisk(input, risk);
  const engagementFactors = evaluateEngagementRisk(input, risk, icp);

  const businessRiskScore = Math.min(100, businessFactors.reduce((sum, f) => sum + f.points, 0));
  const engagementRiskScore = Math.min(100, engagementFactors.reduce((sum, f) => sum + f.points, 0));

  return {
    businessRisk: levelFor(businessRiskScore, risk.businessHigh, risk.businessElevated),
    businessRiskScore,
    engagementRisk: levelFor(engagementRiskScore, risk.engagementHigh, risk.engagementElevated),
    engagementRiskScore,
    factors: [...businessFactors, ...engagementFactors],
    headlineNl: buildHeadline(businessFactors, businessRiskScore, risk),
    unknowns: collectUnknowns(input),
  };
}

function levelFor(score: number, high: number, elevated: number): RiskLevel {
  if (score >= high) return "hoog";
  if (score >= elevated) return "verhoogd";
  return "laag";
}

/**
 * Deterministic one-liner for the lead card and the evidence sheet. Built by
 * concatenation from the factors themselves, never by a model — this string
 * is shown next to a risk verdict, so it may not drift from its evidence.
 */
function buildHeadline(businessFactors: RiskFactor[], score: number, risk: typeof DEFAULT_RISK): string {
  if (businessFactors.length === 0) {
    return "Geen risico's met bewijs gevonden op de gecrawlde pagina's.";
  }

  const top = [...businessFactors].sort((a, b) => b.points - a.points).slice(0, 3);
  const labels = top.map((f) => f.labelNl.toLowerCase());
  const level = levelFor(score, risk.businessHigh, risk.businessElevated);
  const rest = businessFactors.length - top.length;

  const list = labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(", ")} en ${labels[labels.length - 1]}`;
  return `Risico ${level}: ${list}${rest > 0 ? ` (+${rest} overige)` : ""}.`;
}

/**
 * What this assessment could not see. Always non-empty in practice — credit
 * standing is never measurable from free sources, and saying so is the
 * difference between a risk score and a guess.
 */
function collectUnknowns(input: RiskInput): string[] {
  const unknowns: string[] = [
    "Kredietwaardigheid, betaalgedrag en omzet zijn niet gemeten — dat vereist een betaalde bron (KvK Handelsregister, Graydon of Creditsafe).",
  ];

  if (!input.dns) {
    unknowns.push("DNS-controles (MX, SPF, DMARC) zijn niet uitgevoerd voor dit domein — mailrisico's konden niet worden beoordeeld.");
  }
  if (input.hasWebsite && !input.audit) {
    unknowns.push("Website was onbereikbaar tijdens de crawl — technische en compliance-risico's konden niet worden vastgesteld.");
  }
  if (input.audit && !input.audit.psi) {
    unknowns.push("PageSpeed Insights leverde geen resultaat — snelheidsoordeel steunt alleen op de gemeten laadtijd.");
  }
  if (!input.crawledPageUrls || input.crawledPageUrls.length === 0) {
    unknowns.push("Geen pagina's gecrawld — de controle op een privacy-/cookiepagina is niet uitgevoerd.");
  }

  return unknowns;
}
