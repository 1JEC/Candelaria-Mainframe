import Link from "next/link";
import DeleteLeadButton from "@/components/leads/DeleteLeadButton";

export default function LeadCard({
  lead,
}: {
  lead: {
    id: string;
    name: string | null;
    email: string;
    company: string | null;
    status: string | null;
    score: number | null;
    source: string;
  };
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/leads/${lead.id}`} className="font-medium text-brand-green hover:underline">
          {lead.name || "—"}
        </Link>
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs whitespace-nowrap">
          {lead.status}
        </span>
      </div>
      <div className="text-sm text-gray-600 space-y-1">
        <p>{lead.company || "—"}</p>
        <p>{lead.email}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className="bg-brand-green h-2 rounded-full"
            style={{ width: `${Math.min(lead.score || 0, 100)}%` }}
          ></div>
        </div>
        <span className="text-xs text-gray-500">{lead.score || 0}</span>
      </div>
      <div className="flex items-center justify-between pt-1 border-t border-gray-100">
        <span className="text-xs text-gray-500">{lead.source}</span>
        <DeleteLeadButton id={lead.id} name={lead.name || lead.email} />
      </div>
    </div>
  );
}
