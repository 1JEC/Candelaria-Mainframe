import type { DEFAULT_RUBRIC } from "@/lib/leads-agent/config";

type Rubric = typeof DEFAULT_RUBRIC;

/**
 * Maps each signal code (Phase 4's signals.ts) to where its point value
 * lives in the rubric config. A lead's *presence* of a condition (did it
 * actually have no HTTPS, etc.) doesn't change when weights change — only
 * the point value assigned to that already-true condition does. That's
 * what makes a live re-ranking preview possible without re-crawling or
 * re-auditing anything: replace each already-earned signal's point value
 * with what the edited rubric would award, and re-sum.
 */
const SIGNAL_TO_RUBRIC_FIELD: Record<string, (r: Rubric) => number> = {
  icp_sector: (r) => r.fit.icpSector,
  size_match: (r) => r.fit.sizeMatch,
  in_target_area: (r) => r.fit.inTargetArea,
  commercial_intent: (r) => r.fit.commercialIntent,
  active_business: (r) => r.fit.activeBusiness,
  multi_location: (r) => r.fit.multiLocation,
  no_website: (r) => r.pain.noWebsite,
  no_https: (r) => r.pain.noHttps,
  no_mobile_viewport: (r) => r.pain.noMobileViewport,
  slow_or_low_psi: (r) => r.pain.slowOrLowPsi,
  stale_content: (r) => r.pain.staleContent,
  no_contact_form: (r) => r.pain.noContactForm,
  broken_webshop: (r) => r.pain.brokenWebshop,
  outdated_platform: (r) => r.pain.outdatedPlatform,
  seo_title_missing: (r) => Math.round(r.pain.seoBasicsBroken / 3),
  seo_meta_missing: (r) => Math.round(r.pain.seoBasicsBroken / 3),
  seo_h1_missing: (r) => Math.round(r.pain.seoBasicsBroken / 3),
  no_analytics: (r) => r.pain.noAnalytics,
  no_chat_or_booking: (r) => r.pain.noChatOrBooking,
  no_schema_org: (r) => r.pain.noSchemaOrg,
};

const FIT_CODES = new Set(["icp_sector", "size_match", "in_target_area", "commercial_intent", "active_business", "multi_location"]);

export interface PreviewLeadInput {
  leadId: string;
  company: string;
  signalCodes: string[]; // codes of signals this lead actually earned (points > 0 originally)
}

export interface PreviewResult {
  leadId: string;
  company: string;
  fitScore: number;
  painScore: number;
  totalScore: number;
  priority: "A" | "B" | "C" | null;
  qualified: boolean;
}

export function recomputeWithRubric(leads: PreviewLeadInput[], rubric: Rubric): PreviewResult[] {
  return leads
    .map((lead): PreviewResult => {
      let fitScore = 0;
      let painScore = 0;
      for (const code of lead.signalCodes) {
        const getValue = SIGNAL_TO_RUBRIC_FIELD[code];
        if (!getValue) continue;
        if (FIT_CODES.has(code)) fitScore += getValue(rubric);
        else painScore += getValue(rubric);
      }
      fitScore = Math.min(40, fitScore);
      painScore = Math.min(60, painScore);
      const totalScore = Math.min(100, fitScore + painScore);
      const disqualified = fitScore < rubric.minFitToQualify;
      const priority = disqualified ? null : totalScore >= rubric.priorityA ? "A" : totalScore >= rubric.priorityB ? "B" : totalScore >= rubric.priorityC ? "C" : null;
      return { leadId: lead.leadId, company: lead.company, fitScore, painScore, totalScore, priority, qualified: !disqualified && totalScore >= rubric.minScore };
    })
    .sort((a, b) => b.totalScore - a.totalScore);
}
