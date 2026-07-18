import { db } from "@/lib/db";
import { leads, leadEvents } from "@/drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import LeadEditForm from "@/components/leads/LeadEditForm";
import DeleteLeadButton from "@/components/leads/DeleteLeadButton";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lead",
};

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const lead = await db.query.leads.findFirst({ where: eq(leads.id, id) });
  if (!lead) notFound();

  const events = await db
    .select()
    .from(leadEvents)
    .where(eq(leadEvents.leadId, id))
    .orderBy(desc(leadEvents.createdAt));

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/leads" className="text-sm text-brand-green hover:underline">
          ← Terug naar leads
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-brand-black">{lead.name || lead.email}</h1>
          <p className="text-gray-600">{lead.email}</p>
        </div>
        <DeleteLeadButton id={lead.id} name={lead.name || lead.email} redirectTo="/leads" />
      </div>

      <LeadEditForm lead={lead} />

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-brand-black mb-4">Activiteit</h2>
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
    </div>
  );
}
