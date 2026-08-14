import type { Metadata } from "next";
import { getConfig, listConfigVersions } from "@/lib/leads-agent/config";
import type { DEFAULT_ICP, DEFAULT_RUBRIC, DEFAULT_THRESHOLDS } from "@/lib/leads-agent/config";
import { previewRetentionJob } from "@/lib/leads-agent/retention";
import { db } from "@/lib/db";
import { leads, leadSignals } from "@/drizzle/schema";
import { and, desc, gt, inArray, isNotNull } from "drizzle-orm";
import { RubricEditor } from "@/components/leads-agent/RubricEditor";
import { RetentionPanel } from "@/components/leads-agent/RetentionPanel";
import { ConfigVersionHistory } from "@/components/leads-agent/ConfigVersionHistory";
import type { PreviewLeadInput } from "@/lib/leads-agent/scoring/rubric-preview";

export const metadata: Metadata = { title: "Leads Agent — Instellingen" };
export const dynamic = "force-dynamic";

export default async function LeadsAgentSettingsPage() {
  const [icp, rubric, thresholds, retentionPreview, rubricVersions] = await Promise.all([
    getConfig<typeof DEFAULT_ICP>("icp"),
    getConfig<typeof DEFAULT_RUBRIC>("rubric"),
    getConfig<typeof DEFAULT_THRESHOLDS>("thresholds"),
    previewRetentionJob(),
    listConfigVersions("rubric"),
  ]);

  const top20 = await db
    .select({ id: leads.id, company: leads.company, name: leads.name })
    .from(leads)
    .where(isNotNull(leads.totalScore))
    .orderBy(desc(leads.totalScore))
    .limit(20);

  const top20Ids = top20.map((l) => l.id);
  const signalRows =
    top20Ids.length > 0
      ? await db.select({ leadId: leadSignals.leadId, code: leadSignals.code }).from(leadSignals).where(and(inArray(leadSignals.leadId, top20Ids), gt(leadSignals.points, 0)))
      : [];
  const signalsByLead = new Map<string, string[]>();
  for (const row of signalRows) {
    const list = signalsByLead.get(row.leadId) ?? [];
    list.push(row.code);
    signalsByLead.set(row.leadId, list);
  }

  const topLeadsForPreview: PreviewLeadInput[] = top20.map((l) => ({
    leadId: l.id,
    company: l.company || l.name || "—",
    signalCodes: signalsByLead.get(l.id) ?? [],
  }));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-brand-black mb-1">ICP</h2>
        <p className="text-sm text-gray-600 mb-4">Bewerken via de config-API volgt in een volgende iteratie — huidige waarden hieronder.</p>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Sectoren</dt>
            <dd className="text-gray-900">{icp.sectors.join(", ")}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Bedrijfsgrootte</dt>
            <dd className="text-gray-900">{icp.sizeMin}–{icp.sizeMax} medewerkers</dd>
          </div>
          <div>
            <dt className="text-gray-500">Doelsteden</dt>
            <dd className="text-gray-900">{icp.cities.join(", ")}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Uitgesloten</dt>
            <dd className="text-gray-900">{icp.disqualifySectors.join(", ")}</dd>
          </div>
        </dl>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-brand-black mb-3">Rubric-gewichten</h2>
        <RubricEditor initialRubric={rubric} topLeads={topLeadsForPreview} />
      </div>

      <ConfigVersionHistory
        configKey="rubric"
        versions={rubricVersions.map((v) => ({ version: v.version, isActive: v.isActive, createdAt: v.createdAt }))}
      />

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-brand-black mb-1">Retentie & crawl</h2>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm mt-4">
          <div>
            <dt className="text-gray-500">Bewaartermijn</dt>
            <dd className="text-gray-900">{thresholds.retentionDays} dagen</dd>
          </div>
          <div>
            <dt className="text-gray-500">Audit-verval</dt>
            <dd className="text-gray-900">{thresholds.auditStaleDays} dagen</dd>
          </div>
          <div>
            <dt className="text-gray-500">Places-verversing</dt>
            <dd className="text-gray-900">{thresholds.placesRefreshDays} dagen</dd>
          </div>
        </dl>
      </div>

      <RetentionPanel preview={retentionPreview} />
    </div>
  );
}
