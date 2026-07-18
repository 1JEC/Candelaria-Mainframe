import { db } from "@/lib/db";
import { emails } from "@/drizzle/schema";
import { desc, eq, and, ilike } from "drizzle-orm";
import SearchFilterBar from "@/components/ui/SearchFilterBar";
import Pagination from "@/components/ui/Pagination";
import EmailActions from "@/components/inbox/EmailActions";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mailbox",
};

const PAGE_SIZE = 20;

const FOLDER_OPTIONS = [
  { value: "inbox", label: "Inbox" },
  { value: "archived", label: "Gearchiveerd" },
];

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const folder = params.status || "inbox";
  const q = params.q?.trim();

  const conditions = [eq(emails.folder, folder)];
  if (q) conditions.push(ilike(emails.subject, `%${q}%`));
  const where = and(...conditions);

  const allInbox = await db.select().from(emails).where(eq(emails.folder, "inbox"));
  const unreadCount = allInbox.filter((e) => !(e.flags || []).includes("read")).length;
  const highPriorityCount = allInbox.filter((e) => (e.aiTriagePriority ?? 99) <= 1).length;
  const needsReplyCount = allInbox.filter((e) => e.isInbound && !e.replySentAt).length;

  const emailList = await db
    .select()
    .from(emails)
    .where(where)
    .orderBy(desc(emails.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const filteredAll = await db.select().from(emails).where(where);
  const totalPages = Math.max(1, Math.ceil(filteredAll.length / PAGE_SIZE));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-brand-black">Mailbox</h1>
        <p className="text-gray-600">Proton Mail sync, triage, responses</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Emails" value={allInbox.length} />
        <StatCard label="Unread" value={unreadCount} />
        <StatCard label="High Priority" value={highPriorityCount} />
        <StatCard label="Needs Reply" value={needsReplyCount} />
      </div>

      <SearchFilterBar placeholder="Zoek op onderwerp..." statusOptions={FOLDER_OPTIONS} />

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
                  <th className="px-6 py-3 text-left font-semibold">Actie</th>
                </tr>
              </thead>
              <tbody>
                {emailList.map((email) => {
                  const isRead = (email.flags || []).includes("read");
                  return (
                    <tr key={email.id} className={`border-b border-gray-200 hover:bg-gray-50 ${!isRead ? "font-semibold" : ""}`}>
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
                        {email.createdAt ? new Date(email.createdAt).toLocaleDateString("nl-NL") : "—"}
                      </td>
                      <td className="px-6 py-3">
                        <EmailActions id={email.id} isRead={isRead} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
          <p className="text-gray-600">Geen e-mails in deze map.</p>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} />

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          📧 <strong>AI-conceptantwoorden komen in Fase 4:</strong> Proton Mail Bridge-integratie voor
          live e-mailsynchronisatie is nog niet aangesloten.
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
