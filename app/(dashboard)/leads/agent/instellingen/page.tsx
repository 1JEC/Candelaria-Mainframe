import type { Metadata } from "next";
import { getConfig } from "@/lib/leads-agent/config";
import type { DEFAULT_ICP, DEFAULT_RUBRIC, DEFAULT_THRESHOLDS } from "@/lib/leads-agent/config";

export const metadata: Metadata = { title: "Leads Agent — Instellingen" };
export const dynamic = "force-dynamic";

export default async function LeadsAgentSettingsPage() {
  const [icp, rubric, thresholds] = await Promise.all([
    getConfig<typeof DEFAULT_ICP>("icp"),
    getConfig<typeof DEFAULT_RUBRIC>("rubric"),
    getConfig<typeof DEFAULT_THRESHOLDS>("thresholds"),
  ]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-brand-black mb-1">ICP (huidige configuratie)</h2>
        <p className="text-sm text-gray-600 mb-4">Standaardwaarden — bewerken volgt in een volgende fase.</p>
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

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-brand-black mb-1">Scoring-drempels</h2>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mt-4">
          <div>
            <dt className="text-gray-500">Minimale score</dt>
            <dd className="text-gray-900 font-semibold">{rubric.minScore}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Prioriteit A</dt>
            <dd className="text-gray-900 font-semibold">≥{rubric.priorityA}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Prioriteit B</dt>
            <dd className="text-gray-900 font-semibold">{rubric.priorityB}–{rubric.priorityA - 1}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Prioriteit C</dt>
            <dd className="text-gray-900 font-semibold">{rubric.priorityC}–{rubric.priorityB - 1}</dd>
          </div>
        </dl>
      </div>

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

      <div className="p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
        <p className="text-gray-600">Bewerken met live herberekening van de top 20 en versiegeschiedenis volgt in een volgende fase.</p>
      </div>
    </div>
  );
}
