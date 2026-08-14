import Link from "next/link";
import DeleteLeadButton from "@/components/leads/DeleteLeadButton";

const PRIORITY_STYLES: Record<string, string> = {
  A: "bg-red-100 text-red-800",
  B: "bg-yellow-100 text-yellow-800",
  C: "bg-blue-100 text-blue-800",
};

export default function LeadCard({
  lead,
}: {
  lead: {
    id: string;
    name: string | null;
    email: string | null;
    company: string | null;
    status: string | null;
    score: number | null;
    source: string;
    totalScore?: number | null;
    priority?: string | null;
    city?: string | null;
    sector?: string | null;
    painPoint?: string | null;
    emailGeneral?: string | null;
    phoneE164?: string | null;
    contactFormUrl?: string | null;
    lastSeenAt?: Date | string | null;
  };
}) {
  const score = lead.totalScore ?? lead.score ?? 0;
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/leads/${lead.id}`} className="font-medium text-brand-green hover:underline">
          {lead.company || lead.name || "—"}
        </Link>
        <div className="flex items-center gap-1.5">
          {lead.priority && (
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${PRIORITY_STYLES[lead.priority] ?? "bg-gray-100 text-gray-700"}`}>
              {lead.priority}
            </span>
          )}
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs whitespace-nowrap">{lead.status}</span>
        </div>
      </div>
      <div className="text-sm text-gray-600 space-y-1">
        <p>{[lead.sector, lead.city].filter(Boolean).join(" — ") || "—"}</p>
        {lead.painPoint && <p className="text-xs text-gray-500 truncate">{lead.painPoint}</p>}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div className="bg-brand-green h-2 rounded-full" style={{ width: `${Math.min(score, 100)}%` }}></div>
        </div>
        <span className="text-xs text-gray-500">{score}</span>
      </div>
      <div className="flex items-center justify-between pt-1 border-t border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {lead.emailGeneral && <span title={lead.emailGeneral}>📧</span>}
          {lead.phoneE164 && <span title={lead.phoneE164}>☎️</span>}
          {lead.contactFormUrl && <span title="Contactformulier">📝</span>}
          <span>{lead.source}</span>
        </div>
        <DeleteLeadButton id={lead.id} name={lead.name || lead.company || lead.email || "—"} />
      </div>
    </div>
  );
}
