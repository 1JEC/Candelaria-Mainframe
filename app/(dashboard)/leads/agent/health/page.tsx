import type { Metadata } from "next";

export const metadata: Metadata = { title: "Leads Agent — Health" };

export default function LeadsAgentHealthPage() {
  return (
    <div className="p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
      <p className="text-gray-600">DNS-checks (SPF/DKIM/DMARC), mailbox-gezondheid en de go-live-checklist worden in een volgende fase gebouwd.</p>
    </div>
  );
}
