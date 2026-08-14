import { db } from "@/lib/db";
import { leads, leadEvents, leadSignals, leadContacts } from "@/drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import LeadEditForm from "@/components/leads/LeadEditForm";
import DeleteLeadButton from "@/components/leads/DeleteLeadButton";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lead",
};

const TABS = [
  { key: "overzicht", label: "Overzicht" },
  { key: "bewijs", label: "Bewijs" },
  { key: "historie", label: "Historie" },
];

export default async function LeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const tab = TABS.some((t) => t.key === tabParam) ? tabParam! : "overzicht";

  const lead = await db.query.leads.findFirst({ where: eq(leads.id, id) });
  if (!lead) notFound();

  const [events, signals, contacts] = await Promise.all([
    db.select().from(leadEvents).where(eq(leadEvents.leadId, id)).orderBy(desc(leadEvents.createdAt)),
    db.select().from(leadSignals).where(eq(leadSignals.leadId, id)).orderBy(desc(leadSignals.points)),
    db.select().from(leadContacts).where(eq(leadContacts.leadId, id)),
  ]);

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/leads" className="text-sm text-brand-green hover:underline">
          ← Terug naar leads
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-brand-black">{lead.name || lead.company || lead.email || "—"}</h1>
          <p className="text-gray-600">{lead.email}</p>
          {lead.totalScore !== null && (
            <p className="text-sm text-gray-500 mt-1">
              Score: <span className="font-semibold text-gray-700">{lead.totalScore}</span> (fit {lead.fitScore}, pain {lead.painScore})
              {lead.priority && ` — prioriteit ${lead.priority}`}
              {lead.recommendedOffer && ` — aanbevolen: ${lead.recommendedOffer}`}
            </p>
          )}
        </div>
        <DeleteLeadButton id={lead.id} name={lead.name || lead.email || "—"} redirectTo="/leads" />
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/leads/${id}?tab=${t.key}`}
              className={`px-4 py-2.5 min-h-11 flex items-center text-sm font-medium border-b-2 transition-colors ${
                tab === t.key ? "text-brand-green border-brand-green" : "text-gray-600 border-transparent hover:text-brand-green"
              }`}
            >
              {t.label}
              {t.key === "bewijs" && signals.length > 0 && <span className="ml-1.5 text-xs text-gray-400">({signals.length})</span>}
            </Link>
          ))}
        </nav>
      </div>

      {tab === "overzicht" && (
        <div className="space-y-6">
          <LeadEditForm lead={lead} />
          {contacts.length > 0 && (
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-sm font-semibold text-brand-black mb-3">Contactkanalen (met bron)</h2>
              <div className="space-y-2">
                {contacts.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2 last:border-0">
                    <div>
                      <span className="text-gray-500">{c.field}:</span> <span className="text-gray-900">{c.value}</span>
                    </div>
                    <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-green hover:underline">
                      bron →
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "bewijs" && (
        <div className="space-y-3">
          {signals.length > 0 ? (
            signals.map((signal) => (
              <div key={signal.id} className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <span className="font-medium text-sm text-gray-900">{signal.labelNl || signal.code}</span>
                  <span className={`text-xs font-semibold ${(signal.points ?? 0) > 0 ? "text-brand-green" : "text-gray-400"}`}>
                    {(signal.points ?? 0) > 0 ? `+${signal.points}` : signal.points}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{signal.evidence}</p>
                {signal.sourceUrl && (
                  <a href={signal.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-green hover:underline">
                    Bron: {signal.sourceUrl} →
                  </a>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">Nog geen bewijs — deze lead is nog niet geaudit door de Leads Agent.</p>
          )}
        </div>
      )}

      {tab === "historie" && (
        <div>
          {events.length > 0 ? (
            <div className="space-y-3">
              {events.map((event) => (
                <div key={event.id} className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span className="font-semibold text-gray-700">{event.type}</span>
                    <span>{event.createdAt ? new Date(event.createdAt).toLocaleString("nl-NL") : "—"}</span>
                  </div>
                  <p className="text-sm text-gray-700">{event.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Nog geen activiteit gelogd voor deze lead.</p>
          )}
        </div>
      )}
    </div>
  );
}
