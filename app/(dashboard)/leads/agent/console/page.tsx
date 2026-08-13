import { runDoctorChecks } from "@/lib/leads-agent/doctor";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Leads Agent — Console" };
export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  green: "bg-green-100 text-green-800",
  amber: "bg-yellow-100 text-yellow-800",
  red: "bg-red-100 text-red-800",
};

export default async function LeadsAgentConsolePage() {
  const report = await runDoctorChecks();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-brand-black">Systeemstatus</h2>
          <span className={`px-2 py-1 rounded text-xs font-semibold ${STATUS_STYLES[report.overall]}`}>
            {report.overall === "green" ? "OK" : report.overall === "amber" ? "Let op" : "Probleem"}
          </span>
        </div>
        <div className="space-y-2">
          {report.checks.map((check) => (
            <div key={check.name} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
              <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                check.status === "green" ? "bg-green-500" : check.status === "amber" ? "bg-yellow-500" : "bg-red-500"
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{check.name}</p>
                <p className="text-sm text-gray-600">{check.detail}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-4">Laatst gecontroleerd: {new Date(report.checkedAt).toLocaleString("nl-NL")}</p>
      </div>

      <div className="p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
        <p className="text-gray-600">De live run-console (start/stop, event-feed) wordt in een volgende fase gebouwd.</p>
      </div>
    </div>
  );
}
