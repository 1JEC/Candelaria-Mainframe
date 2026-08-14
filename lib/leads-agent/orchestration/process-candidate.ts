import { db } from "@/lib/db";
import { leads, leadContacts, leadAudits, leadSignals, leadPacks, leadEvents } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { crawlDomain } from "@/lib/leads-agent/crawler";
import { mergeContactExtractions, toContactFields, type ExtractedContacts } from "@/lib/leads-agent/extraction/contacts";
import { runAudit, type AuditRaw } from "@/lib/leads-agent/audit";
import { scoreLead } from "@/lib/leads-agent/scoring";
import type { ScoringInput } from "@/lib/leads-agent/scoring/types";
import { generatePainBrief, generateOutreachDrafts } from "@/lib/leads-agent/ai";
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
    code: "decision",
    messageNl: result.qualified ? `Gekwalificeerd — prioriteit ${result.priority}.` : result.disqualifiedReason ?? "Niet gekwalificeerd (score onder de drempel).",
  });

  if (result.qualified) {
    await generatePackForLead(runId, taskId, leadId, candidate.companyName, result.signals);
  }

  return { leadId, qualified: result.qualified, totalScore: result.totalScore };
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

async function generatePackForLead(runId: string, taskId: string, leadId: string, companyName: string, signals: Awaited<ReturnType<typeof scoreLead>>["signals"]) {
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

  await db.insert(leadPacks).values({
    id: crypto.randomUUID(),
    leadId,
    runId,
    email1: draftsResult.data.email1Body,
    email2: draftsResult.data.email2Body,
    email3: draftsResult.data.email3Body,
    dmDraft: draftsResult.data.dmBody,
    callScript: JSON.stringify(draftsResult.data.callScript),
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
