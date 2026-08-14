import { db } from "@/lib/db";
import { leads, leadSignals } from "@/drizzle/schema";
import { desc, count, and, or, ilike, eq, gte, isNotNull, inArray } from "drizzle-orm";
import Link from "next/link";
import NewLeadButton from "@/components/leads/NewLeadButton";
import DeleteLeadButton from "@/components/leads/DeleteLeadButton";
import LeadCard from "@/components/leads/LeadCard";
import SearchFilterBar from "@/components/ui/SearchFilterBar";
import LeadAgentFilters from "@/components/leads/LeadAgentFilters";
import Pagination from "@/components/ui/Pagination";
import { DEFAULT_ICP } from "@/lib/leads-agent/config";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leads",
};

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "new", label: "Nieuw" },
  { value: "qualified", label: "Gekwalificeerd" },
  { value: "packed", label: "Pack klaar" },
  { value: "contacted", label: "Benaderd" },
  { value: "replied", label: "Gereageerd" },
  { value: "won", label: "Gewonnen" },
  { value: "lost", label: "Verloren" },
  { value: "suppressed", label: "Onderdrukt" },
];

// Fit signal codes from Phase 4's rubric — everything else is a pain
// signal. Used to pick a real "pijnpunt" (pain point) one-liner per row
// rather than showing whatever signal happened to score highest overall.
const FIT_SIGNAL_CODES = new Set(["icp_sector", "size_match", "in_target_area", "commercial_intent", "active_business", "multi_location"]);

const PRIORITY_STYLES: Record<string, string> = {
  A: "bg-red-100 text-red-800",
  B: "bg-yellow-100 text-yellow-800",
  C: "bg-blue-100 text-blue-800",
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    priority?: string;
    sector?: string;
    city?: string;
    scoreMin?: string;
    hasEmail?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const q = params.q?.trim();
  const status = params.status;
  const priority = params.priority;
  const sector = params.sector;
  const city = params.city;
  const scoreMin = params.scoreMin ? Number(params.scoreMin) : undefined;
  const hasEmail = params.hasEmail === "1";

  const conditions = [];
  if (q) {
    conditions.push(or(ilike(leads.name, `%${q}%`), ilike(leads.email, `%${q}%`), ilike(leads.company, `%${q}%`)));
  }
  if (status) conditions.push(eq(leads.status, status));
  if (priority) conditions.push(eq(leads.priority, priority));
  if (sector) conditions.push(eq(leads.sector, sector));
  if (city) conditions.push(eq(leads.city, city));
  if (scoreMin !== undefined && !Number.isNaN(scoreMin)) conditions.push(gte(leads.totalScore, scoreMin));
  if (hasEmail) conditions.push(isNotNull(leads.email));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [leadsList, [{ count: totalCount }], [{ count: unfilteredCount }]] = await Promise.all([
    db.select().from(leads).where(where).orderBy(desc(leads.totalScore), desc(leads.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ count: count() }).from(leads).where(where),
    db.select({ count: count() }).from(leads),
  ]);

  const leadIds = leadsList.map((l) => l.id);
  const signalsByLead = new Map<string, { labelNl: string; points: number }[]>();
  if (leadIds.length > 0) {
    const signalRows = await db
      .select({ leadId: leadSignals.leadId, labelNl: leadSignals.labelNl, points: leadSignals.points, code: leadSignals.code })
      .from(leadSignals)
      .where(inArray(leadSignals.leadId, leadIds));
    for (const row of signalRows) {
      if (FIT_SIGNAL_CODES.has(row.code)) continue;
      const list = signalsByLead.get(row.leadId) ?? [];
      list.push({ labelNl: row.labelNl ?? row.code, points: row.points ?? 0 });
      signalsByLead.set(row.leadId, list);
    }
  }

  function painPointFor(leadId: string): string | null {
    const signals = signalsByLead.get(leadId);
    if (!signals || signals.length === 0) return null;
    return signals.sort((a, b) => b.points - a.points)[0].labelNl;
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const exportParams = new URLSearchParams();
  if (q) exportParams.set("q", q);
  if (status) exportParams.set("status", status);
  if (priority) exportParams.set("priority", priority);
  if (sector) exportParams.set("sector", sector);
  if (city) exportParams.set("city", city);
  if (scoreMin !== undefined) exportParams.set("scoreMin", String(scoreMin));
  if (hasEmail) exportParams.set("hasEmail", "1");

  const leadsWithPainPoint = leadsList.map((lead) => ({ ...lead, painPoint: painPointFor(lead.id) }));

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-brand-black">Leads ({totalCount})</h1>
          <p className="text-gray-600">CRM — klanten en prospects</p>
        </div>
        <div className="flex items-center gap-3">
          <a href={`/api/leads/export?${exportParams.toString()}`} className="btn-secondary text-sm py-2 px-4">
            Exporteren (CSV)
          </a>
          <NewLeadButton />
        </div>
      </div>

      <SearchFilterBar placeholder="Zoek op naam, e-mail of bedrijf..." statusOptions={STATUS_OPTIONS} />
      <LeadAgentFilters sectors={DEFAULT_ICP.sectors} cities={DEFAULT_ICP.cities} />

      {leadsList.length > 0 ? (
        <>
          {/* Mobile: cards */}
          <div className="md:hidden space-y-3">
            {leadsWithPainPoint.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </div>

          {/* Tablet/desktop: table */}
          <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Prio</th>
                    <th className="px-4 py-3 text-left font-semibold">Score</th>
                    <th className="px-4 py-3 text-left font-semibold">Bedrijf</th>
                    <th className="px-4 py-3 text-left font-semibold">Plaats</th>
                    <th className="px-4 py-3 text-left font-semibold">Sector</th>
                    <th className="px-4 py-3 text-left font-semibold">Pijnpunt</th>
                    <th className="px-4 py-3 text-left font-semibold">Kanaal</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Laatst gezien</th>
                    <th className="px-4 py-3 text-left font-semibold">Actie</th>
                  </tr>
                </thead>
                <tbody>
                  {leadsWithPainPoint.map((lead) => (
                    <tr key={lead.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {lead.priority ? (
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${PRIORITY_STYLES[lead.priority] ?? "bg-gray-100 text-gray-700"}`}>
                            {lead.priority}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <div className="w-14 bg-gray-200 rounded-full h-2 mr-2">
                            <div className="bg-brand-green h-2 rounded-full" style={{ width: `${Math.min(lead.totalScore ?? lead.score ?? 0, 100)}%` }} />
                          </div>
                          <span className="text-xs">{lead.totalScore ?? lead.score ?? 0}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/leads/${lead.id}`} className="font-medium text-brand-green hover:underline">
                          {lead.company || lead.name || "—"}
                        </Link>
                        {lead.registrableDomain && <p className="text-xs text-gray-400">{lead.registrableDomain}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{lead.city || "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{lead.sector || "—"}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={lead.painPoint ?? undefined}>
                        {lead.painPoint || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs">
                          {lead.emailGeneral && <span title={lead.emailGeneral}>📧</span>}
                          {lead.phoneE164 && <span title={lead.phoneE164}>☎️</span>}
                          {lead.contactFormUrl && <span title="Contactformulier">📝</span>}
                          {!lead.emailGeneral && !lead.phoneE164 && !lead.contactFormUrl && <span className="text-gray-300">—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{lead.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {lead.lastSeenAt ? new Date(lead.lastSeenAt).toLocaleDateString("nl-NL") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <DeleteLeadButton id={lead.id} name={lead.name || lead.company || lead.email || "—"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : unfilteredCount === 0 ? (
        <div className="p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
          <p className="text-gray-600">Nog geen leads. Start een run in de Leads Agent om leads te vinden.</p>
          <Link href="/leads/agent/console" className="btn-primary inline-block mt-3 text-sm">
            Naar Leads Agent
          </Link>
        </div>
      ) : (
        <div className="p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
          <p className="text-gray-600">Geen resultaten binnen dit filter.</p>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} />
    </div>
  );
}
