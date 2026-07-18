import { db } from "@/lib/db";
import { leads } from "@/drizzle/schema";
import { desc, count, and, or, ilike, eq } from "drizzle-orm";
import Link from "next/link";
import NewLeadButton from "@/components/leads/NewLeadButton";
import DeleteLeadButton from "@/components/leads/DeleteLeadButton";
import LeadCard from "@/components/leads/LeadCard";
import SearchFilterBar from "@/components/ui/SearchFilterBar";
import Pagination from "@/components/ui/Pagination";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leads",
};

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "new", label: "Nieuw" },
  { value: "contacted", label: "Benaderd" },
  { value: "qualified", label: "Gekwalificeerd" },
  { value: "won", label: "Gewonnen" },
  { value: "lost", label: "Verloren" },
];

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const q = params.q?.trim();
  const status = params.status;

  const conditions = [];
  if (q) {
    conditions.push(
      or(
        ilike(leads.name, `%${q}%`),
        ilike(leads.email, `%${q}%`),
        ilike(leads.company, `%${q}%`)
      )
    );
  }
  if (status) {
    conditions.push(eq(leads.status, status));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const leadsList = await db
    .select()
    .from(leads)
    .where(where)
    .orderBy(desc(leads.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const [{ count: totalCount }] = await db
    .select({ count: count() })
    .from(leads)
    .where(where);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const exportParams = new URLSearchParams();
  if (q) exportParams.set("q", q);
  if (status) exportParams.set("status", status);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-brand-black">Leads ({totalCount})</h1>
          <p className="text-gray-600">CRM — klanten en prospects</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/api/leads/export?${exportParams.toString()}`}
            className="btn-secondary text-sm py-2 px-4"
          >
            Exporteren (CSV)
          </a>
          <NewLeadButton />
        </div>
      </div>

      <SearchFilterBar
        placeholder="Zoek op naam, e-mail of bedrijf..."
        statusOptions={STATUS_OPTIONS}
      />

      {leadsList.length > 0 ? (
        <>
          {/* Mobile: cards */}
          <div className="md:hidden space-y-3">
            {leadsList.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </div>

          {/* Tablet/desktop: table */}
          <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">Naam</th>
                  <th className="px-6 py-3 text-left font-semibold">Bedrijf</th>
                  <th className="px-6 py-3 text-left font-semibold">E-mail</th>
                  <th className="px-6 py-3 text-left font-semibold">Status</th>
                  <th className="px-6 py-3 text-left font-semibold">Score</th>
                  <th className="px-6 py-3 text-left font-semibold">Bron</th>
                  <th className="px-6 py-3 text-left font-semibold">Actie</th>
                </tr>
              </thead>
              <tbody>
                {leadsList.map((lead) => (
                  <tr key={lead.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <Link href={`/leads/${lead.id}`} className="font-medium text-brand-green hover:underline">
                        {lead.name || "—"}
                      </Link>
                    </td>
                    <td className="px-6 py-3">{lead.company || "—"}</td>
                    <td className="px-6 py-3 text-gray-600">{lead.email}</td>
                    <td className="px-6 py-3">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-brand-green h-2 rounded-full"
                            style={{ width: `${Math.min(lead.score || 0, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs">{lead.score || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500">{lead.source}</td>
                    <td className="px-6 py-3">
                      <DeleteLeadButton id={lead.id} name={lead.name || lead.email} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        </>
      ) : (
        <div className="p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
          <p className="text-gray-600">Geen leads gevonden.</p>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} />
    </div>
  );
}
