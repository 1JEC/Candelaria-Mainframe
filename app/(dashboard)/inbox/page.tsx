import { db } from "@/lib/db";
import { emails } from "@/drizzle/schema";
import { desc, count } from "drizzle-orm";

export default async function InboxPage() {
  const emailList = await db
    .select()
    .from(emails)
    .orderBy(desc(emails.createdAt))
    .limit(20);

  const emailCount = await db.select({ count: count() }).from(emails);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-brand-black">Mailbox</h1>
        <p className="text-gray-600">Proton Mail sync, triage, responses</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Emails" value={emailCount[0]?.count || 0} />
        <StatCard label="Unread" value={0} />
        <StatCard label="High Priority" value={0} />
        <StatCard label="Needs Reply" value={0} />
      </div>

      {emailList.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">From</th>
                  <th className="px-6 py-3 text-left font-semibold">Subject</th>
                  <th className="px-6 py-3 text-left font-semibold">Category</th>
                  <th className="px-6 py-3 text-left font-semibold">Priority</th>
                  <th className="px-6 py-3 text-left font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {emailList.map((email) => (
                  <tr key={email.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">{email.from}</td>
                    <td className="px-6 py-3 truncate">{email.subject || "(No subject)"}</td>
                    <td className="px-6 py-3">
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                        {email.aiTriageCategory || "pending"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs">
                      {email.aiTriagePriority ? `P${email.aiTriagePriority}` : "—"}
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500">
                      {new Date(email.createdAt).toLocaleDateString("nl-NL")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
          <p className="text-gray-600">
            Geen e-mails. Proton Bridge worker zal hier mails syngen (Fase 4).
          </p>
        </div>
      )}

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          📧 <strong>Mailbox coming in Fase 4:</strong> Proton Mail Bridge integration, AI triage, draft responses
        </p>
      </div>
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
