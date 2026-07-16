import { db } from "@/lib/db";
import { leads, leadEvents } from "@/drizzle/schema";
import { desc, count } from "drizzle-orm";
import Link from "next/link";

export default async function LeadsPage() {
  const leadsList = await db
    .select()
    .from(leads)
    .orderBy(desc(leads.createdAt))
    .limit(50);

  const leadCount = await db.select({ count: count() }).from(leads);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-black">Leads ({leadCount[0]?.count || 0})</h1>
          <p className="text-gray-600">CRM — klanten en prospects</p>
        </div>
      </div>

      {leadsList.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                </tr>
              </thead>
              <tbody>
                {leadsList.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="px-6 py-3">
                      <Link
                        href={`/dashboard/leads/${lead.id}`}
                        className="font-medium text-brand-green hover:underline"
                      >
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
                    <td className="px-6 py-3 text-xs text-gray-500">
                      {lead.source}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
          <p className="text-gray-600">Geen leads nog. Website intake vindt hier terecht.</p>
        </div>
      )}
    </div>
  );
}
