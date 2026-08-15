import { db } from "@/lib/db";
import { leads, leadContacts, leadAudits, leadSignals, leadPacks, leadEvents } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { crawlDomain } from "@/lib/leads-agent/crawler";
import { mergeContactExtractions, toContactFields, type ExtractedContacts } from "@/lib/leads-agent/extraction/contacts";
import { runAudit, type AuditRaw } from "@/lib/leads-agent/audit";
import { scoreLead } from "@/lib/leads-agent/scoring";
import type { ScoringInput } from "@/lib/leads-agent/scoring/types";
import { assessRisk } from "@/lib/leads-agent/risk";
import { runDnsChecks, type DnsCheckResult } from "@/lib/leads-agent/health/dns-check";
import { generatePainBrief, generateOutreachDrafts } from "@/lib/leads-agent/ai";
import { assembleOutreachPack, validatePackContent } from "@/lib/leads-agent/outreach/assemble";
import { MODEL_SMART } from "@/lib/agents/anthropic-client";
import { logAudit } from "@/lib/audit";
import type { DiscoveredCandidate } from "@/lib/leads-agent/discovery/types";
import { emitEvent } from "./events";

const EMPTY_CONTACTS: ExtractedContacts = { socials: [], hasChatOrWhatsapp: false, hasContactForm: false };

export async function processCandidateTask(runId: string, taskId: string, targetJson: string, startedBy: string | null) {
  const candidate: DiscoveredCandidate = JSON.parse(targetJson);
  const now = new Date();

  const leadId = await upsertLead(candidate, now);

  await db.insert(leadEvents).values({
    id: crypto.randomUUID(),
    leadId,
    type: "agent_discovered",
    description: `Gevonden via ${candidate.sourceMethod}.`,
    metadata: { runId, sourceUrl: candidate.sourceUrl },
  });
  await logAudit({ userId: startedBy ?? undefined, action: "lead_agent_created", resourceType: "lead", resourceId: leadId, after: { company: candidate.companyName, source: candidate.sourceMethod } });

  let audit: AuditRaw | undefined;
  let contacts: ExtractedContacts = EMPTY_CONTACTS;
  let crawledPageUrls: string[] = [];
  let homepageUrl: string | undefined;

  if (candidate.website) {
    const crawl = await crawlDomain(candidate.website);
    crawledPageUrls = crawl.pages.map((p) => p.url);
    homepageUrl = crawl.pages[0]?.url;
    await emitEvent({
      runId,
      taskId,
      leadId,
      code: "fetch.page",
      messageNl: `${crawl.pages.length} pagina('s) opgehaald, ${crawl.skipped.length} overgeslagen.`,
    });

    // A retried task (up to 3 attempts, see task-queue.ts's markTaskFailed)
    // re-runs this whole function against the same leadId. Without clearing
    // prior contacts/signals first, a retry that fails AFTER this insert
    // (e.g. a rate-limited AI call further down) duplicates every contact
    // field and evidence row on each attempt.
    await db.delete(leadContacts).where(eq(leadContacts.leadId, leadId));
    await db.delete(leadSignals).where(eq(leadSignals.leadId, leadId));

    contacts = mergeContactExtractions(crawl.pages);
    const contactFields = toContactFields(contacts);
    if (contactFields.length > 0) {
      await db.insert(leadContacts).values(
        contactFields.map((f) => ({ id: crypto.randomUUID(), leadId, field: f.field, value: f.value, sourceUrl: f.sourceUrl }))
      );
      await emitEvent({ runId, taskId, leadId, code: "extract.contact", messageNl: `${contactFields.length} contactveld(en) gevonden met bewijs.` });
    }

    if (crawl.pages.length > 0) {
      audit = await runAudit(candidate.website, crawl);
      await db.insert(leadAudits).values({ id: crypto.randomUUID(), leadId, runId, rawJson: audit });
      await emitEvent({
        runId,
        taskId,
        leadId,
        code: "audit.signal",
        messageNl: `Audit voltooid — HTTPS ${audit.httpsValid ? "geldig" : "ongeldig"}, laadtijd ${audit.loadTimeMs ?? "onbekend"}ms.`,
      });
    }
  } else {
    await emitEvent({ runId, taskId, leadId, code: "warn", messageNl: "Geen website opgegeven bij deze bron." });
  }

  const scoringInput: ScoringInput = {
    sector: candidate.sector,
    city: candidate.city,
    discoverySourceUrl: candidate.sourceUrl,
    hasWebsite: Boolean(candidate.website),
    homepageUrl,
    audit,
    contacts,
    crawledPageUrls,
  };
  const result = scoreLead(scoringInput);

  // Risk runs on the same already-measured inputs as scoring, plus a DNS
  // lookup on the prospect's own domain when there is one. Only MX/SPF/DMARC
  // feed risk factors — DKIM is skipped deliberately: we don't know a
  // prospect's selector, so a non-resolving "default" proves nothing.
  const dns = candidate.registrableDomain ? await safeDnsChecks(candidate.registrableDomain) : undefined;
  const risk = assessRisk({
    sector: candidate.sector,
    discoverySourceUrl: candidate.sourceUrl,
    hasWebsite: Boolean(candidate.website),
    homepageUrl,
    audit,
    contacts,
    crawledPageUrls,
    dns,
  });

  if (result.signals.length > 0) {
    await db.insert(leadSignals).values(
      result.signals.map((s) => ({ id: crypto.randomUUID(), leadId, code: s.code, labelNl: s.labelNl, evidence: s.evidence, sourceUrl: s.sourceUrl, points: s.points }))
    );
  }

  await db
    .update(leads)
    .set({
      fitScore: result.fitScore,
      painScore: result.painScore,
      totalScore: result.totalScore,
      priority: result.priority,
      recommendedOffer: result.recommendedOffer,
      recommendedChannel: result.recommendedChannel,
      status: result.qualified ? "qualified" : "new",
      auditedAt: audit ? now : null,
      email: contacts.emailGeneral?.value ?? null,
      emailGeneral: contacts.emailGeneral?.value ?? null,
      phoneE164: contacts.phoneE164?.value ?? null,
      contactFormUrl: contacts.contactFormUrl?.value ?? null,
      socialsJson: contacts.socials.length > 0 ? contacts.socials : null,
      businessRisk: risk.businessRisk,
      businessRiskScore: risk.businessRiskScore,
      engagementRisk: risk.engagementRisk,
      engagementRiskScore: risk.engagementRiskScore,
      riskHeadlineNl: risk.headlineNl,
      riskJson: { factors: risk.factors, unknowns: risk.unknowns },
      riskAssessedAt: now,
      updatedAt: now,
    })
    .where(eq(leads.id, leadId));

  await emitEvent({
    runId,
    taskId,
    leadId,
    code: "score.computed",
    messageNl: `Score: fit ${result.fitScore}, pain ${result.painScore}, totaal ${result.totalScore}${result.priority ? ` (prioriteit ${result.priority})` : ""}.`,
  });
  await emitEvent({
    runId,
    taskId,
    leadId,
    code: "risk.assessed",
    messageNl: `Risico bedrijf ${risk.businessRisk} (${risk.businessRiskScore}), risico samenwerking ${risk.engagementRisk} (${risk.engagementRiskScore}) — ${risk.headlineNl}`,
  });
  await emitEvent({
    runId,
    taskId,
    leadId,
    code: "decision",
    messageNl: result.qualified ? `Gekwalificeerd — prioriteit ${result.priority}.` : result.disqualifiedReason ?? "Niet gekwalificeerd (score onder de drempel).",
  });

  if (result.qualified) {
    await generatePackForLead(runId, taskId, leadId, candidate.companyName, candidate.sourceUrl, contacts, result.signals);
  }

  return { leadId, qualified: result.qualified, totalScore: result.totalScore };
}

/**
 * A DNS lookup must never take a run down, and a failed lookup must never
 * read as "no mail risk found". Returning undefined pushes it into the
 * assessment's `unknowns` instead of silently scoring as a pass.
 */
async function safeDnsChecks(domain: string): Promise<DnsCheckResult[] | undefined> {
  try {
    return await runDnsChecks(domain);
  } catch {
    return undefined;
  }
}

async function upsertLead(candidate: DiscoveredCandidate, now: Date): Promise<string> {
  if (candidate.registrableDomain) {
    const [existing] = await db.select({ id: leads.id }).from(leads).where(eq(leads.registrableDomain, candidate.registrableDomain));
    if (existing) {
      await db.update(leads).set({ lastSeenAt: now, updatedAt: now }).where(eq(leads.id, existing.id));
      return existing.id;
    }
  }

  const leadId = crypto.randomUUID();
  await db.insert(leads).values({
    id: leadId,
    company: candidate.companyName,
    website: candidate.website ?? null,
    registrableDomain: candidate.registrableDomain ?? null,
    sector: candidate.sector,
    city: candidate.city ?? null,
    street: candidate.street ?? null,
    postcode: candidate.postcode ?? null,
    phone: candidate.phone ?? null,
    source: candidate.sourceMethod,
    status: "new",
    firstSeenAt: now,
    lastSeenAt: now,
  });
  return leadId;
}

async function generatePackForLead(
  runId: string,
  taskId: string,
  leadId: string,
  companyName: string,
  sourceUrl: string,
  contacts: ExtractedContacts,
  signals: Awaited<ReturnType<typeof scoreLead>>["signals"]
) {
  const painBriefResult = await generatePainBrief(companyName, signals, runId);
  if (!painBriefResult.ok) {
    await emitEvent({
      runId,
      taskId,
      leadId,
      code: "warn",
      messageNl: painBriefResult.reason === "no_api_key" ? "AI niet beschikbaar (geen API-sleutel) — pack volgt later." : "AI-dagbudget bereikt — pack volgt later.",
    });
    return;
  }

  const draftsResult = await generateOutreachDrafts(companyName, signals, painBriefResult.data, runId);
  if (!draftsResult.ok) {
    await emitEvent({
      runId,
      taskId,
      leadId,
      code: "warn",
      messageNl: draftsResult.reason === "no_api_key" ? "AI niet beschikbaar (geen API-sleutel) — pack volgt later." : "AI-dagbudget bereikt — pack volgt later.",
    });
    return;
  }

  const socialProfileUrl = contacts.socials[0]?.value;
  const assembled = assembleOutreachPack({ companyName, sourceUrl, socialProfileUrl, drafts: draftsResult.data, signals });

  try {
    validatePackContent(assembled, sourceUrl);
  } catch (err) {
    await emitEvent({
      runId,
      taskId,
      leadId,
      code: "error",
      level: "error",
      messageNl: `Pack-validatie mislukt, niet opgeslagen: ${err instanceof Error ? err.message : String(err)}`,
    });
    return;
  }

  if (assembled.missingConfig.length > 0) {
    await emitEvent({
      runId,
      taskId,
      leadId,
      code: "warn",
      messageNl: `Pack gegenereerd met placeholders voor ontbrekende configuratie: ${assembled.missingConfig.join(", ")}.`,
    });
  }
  for (const warning of assembled.wordCountWarnings) {
    await emitEvent({ runId, taskId, leadId, code: "warn", messageNl: `Woordlimiet overschreden — ${warning}` });
  }

  await db.insert(leadPacks).values({
    id: crypto.randomUUID(),
    leadId,
    runId,
    email1: assembled.email1,
    email2: assembled.email2,
    email3: assembled.email3,
    dmDraft: assembled.dmDraft,
    callScript: assembled.callScript,
    evidenceMd: assembled.evidenceMd,
    model: MODEL_SMART,
    grounded: true,
  });
  await db.update(leads).set({ status: "packed" }).where(eq(leads.id, leadId));
  await emitEvent({ runId, taskId, leadId, code: "pack.generated", messageNl: "Outreach-pack gegenereerd." });

  for (const sentence of [...painBriefResult.strippedSentences, ...draftsResult.strippedSentences]) {
    await emitEvent({
      runId,
      taskId,
      leadId,
      code: "ai.ungrounded_claim",
      level: "warn",
      messageNl: `AI-bewering zonder bewijs verwijderd: "${sentence}"`,
    });
  }
}
