import type { Metadata } from "next";

export const metadata: Metadata = { title: "Leads Agent — Outbound" };

export default function LeadsAgentOutboundPage() {
  const enabled = process.env.OUTBOUND_ENABLED === "true";
  return (
    <div className="space-y-4">
      {!enabled && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 text-sm rounded-lg px-4 py-3">
          Proefmodus — er wordt niets verstuurd.
        </div>
      )}
      <div className="p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
        <p className="text-gray-600">Wachtrij, verzonden berichten en reacties worden in een volgende fase gebouwd.</p>
      </div>
    </div>
  );
}
