import type { Metadata } from "next";

export const metadata: Metadata = { title: "Leads Agent — Leads" };

export default function LeadsAgentLeadsPage() {
  return (
    <div className="p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
      <p className="text-gray-600">
        De gescoorde leadlijst (met bewijs per signaal) wordt in een volgende fase toegevoegd — extendeert de bestaande{" "}
        <a href="/leads" className="text-brand-green hover:underline">/leads</a> pagina.
      </p>
    </div>
  );
}
