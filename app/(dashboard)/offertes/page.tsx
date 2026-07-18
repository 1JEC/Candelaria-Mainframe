import { db } from "@/lib/db";
import { intakeSubmissions } from "@/drizzle/schema";
import { desc, count, and, or, eq, ilike, isNull } from "drizzle-orm";
import Link from "next/link";
import type { Metadata } from "next";
import SearchFilterBar from "@/components/ui/SearchFilterBar";
import Pagination from "@/components/ui/Pagination";
import SubmissionActions from "@/components/offertes/SubmissionActions";
import { formTypeLabel, FORM_TYPE_LABELS } from "@/lib/formTypes";

export const metadata: Metadata = {
  title: "Offertes",
};

const PAGE_SIZE = 20;

const TYPE_OPTIONS = Object.entries(FORM_TYPE_LABELS).map(([value, label]) => ({ value, label }));

export default async function OffertesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const q = params.q?.trim();
  const formType = params.status;

  const conditions = [];
  if (formType) conditions.push(eq(intakeSubmissions.formType, formType));
  if (q) {
    conditions.push(
      or(
        ilike(intakeSubmissions.name, `%${q}%`),
        ilike(intakeSubmissions.email, `%${q}%`),
        ilike(intakeSubmissions.company, `%${q}%`)
      )
    );
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const submissions = await db
    .select()
    .from(intakeSubmissions)
    .where(where)
    .orderBy(desc(intakeSubmissions.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const [{ count: totalCount }] = await db.select({ count: count() }).from(intakeSubmissions).where(where);
  const [{ count: offerteCount }] = await db
    .select({ count: count() })
    .from(intakeSubmissions)
    .where(eq(intakeSubmissions.formType, "offerte"));
  const [{ count: openCount }] = await db
    .select({ count: count() })
    .from(intakeSubmissions)
    .where(isNull(intakeSubmissions.reviewedAt));

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-brand-black">Offertes</h1>
        <p className="text-gray-600">Aanvragen binnengekomen via de website</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Totaal aanvragen" value={totalCount} />
        <StatCard label="Waarvan offertes" value={offerteCount} />
        <StatCard label="Nog niet verwerkt" value={openCount} />
      </div>

      <SearchFilterBar placeholder="Zoek op naam, e-mail of bedrijf..." statusOptions={TYPE_OPTIONS} />

      {submissions.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">Type</th>
                  <th className="px-6 py-3 text-left font-semibold">Naam</th>
                  <th className="px-6 py-3 text-left font-semibold">Bedrijf</th>
                  <th className="px-6 py-3 text-left font-semibold">E-mail</th>
                  <th className="px-6 py-3 text-left font-semibold">Status</th>
                  <th className="px-6 py-3 text-left font-semibold">Datum</th>
                  <th className="px-6 py-3 text-left font-semibold">Actie</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id} className={`border-b border-gray-200 hover:bg-gray-50 ${s.isSpam ? "opacity-50" : ""}`}>
                    <td className="px-6 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          s.formType === "offerte" ? "bg-brand-green/10 text-brand-green" : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {formTypeLabel(s.formType)}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <Link href={`/offertes/${s.id}`} className="font-medium text-brand-green hover:underline">
                        {s.name || "—"}
                      </Link>
                    </td>
                    <td className="px-6 py-3">{s.company || "—"}</td>
                    <td className="px-6 py-3 text-gray-600">{s.email}</td>
                    <td className="px-6 py-3">
                      {s.isSpam ? (
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">Spam</span>
                      ) : s.reviewedAt ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Verwerkt</span>
                      ) : (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">Open</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500">
                      {s.createdAt ? new Date(s.createdAt).toLocaleDateString("nl-NL") : "—"}
                    </td>
                    <td className="px-6 py-3">
                      <SubmissionActions id={s.id} isSpam={Boolean(s.isSpam)} reviewed={Boolean(s.reviewedAt)} compact />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
          <p className="text-gray-600">Nog geen aanvragen binnengekomen.</p>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg">
      <p className="text-gray-600 text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold text-brand-black">{value}</p>
    </div>
  );
}
