import { db } from "@/lib/db";
import { auditLog } from "@/drizzle/schema";
import { desc, count, ilike, and } from "drizzle-orm";
import SearchFilterBar from "@/components/ui/SearchFilterBar";
import Pagination from "@/components/ui/Pagination";

const PAGE_SIZE = 25;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const q = params.q?.trim();

  const where = q ? and(ilike(auditLog.action, `%${q}%`)) : undefined;

  const allLogs = await db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(500);
  const logCount = await db.select({ count: count() }).from(auditLog);

  const logs = await db
    .select()
    .from(auditLog)
    .where(where)
    .orderBy(desc(auditLog.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const [{ count: filteredCount }] = await db.select({ count: count() }).from(auditLog).where(where);
  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));

  const actionCounts = allLogs.reduce(
    (acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-brand-black">Audit Log</h1>
        <p className="text-gray-600">Complete activity trail ({logCount[0]?.count || 0} entries)</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Entries" value={logCount[0]?.count || 0} />
        <StatCard
          label="Today"
          value={
            allLogs.filter((l) => {
              const today = new Date();
              const logDate = l.createdAt ? new Date(l.createdAt) : null;
              return logDate?.toDateString() === today.toDateString();
            }).length
          }
        />
        <StatCard label="Unique Actions" value={Object.keys(actionCounts).length} />
        <StatCard label="Unique Users" value={new Set(allLogs.map((l) => l.userId)).size} />
      </div>

      {/* Top Actions */}
      <div className="mb-8 p-6 bg-white border border-gray-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Top Actions</h2>
        <div className="space-y-2">
          {Object.entries(actionCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([action, actionCount]) => (
              <div key={action} className="flex justify-between">
                <span className="text-gray-700">{action}</span>
                <span className="font-semibold">{actionCount}</span>
              </div>
            ))}
        </div>
      </div>

      <SearchFilterBar placeholder="Zoek op actie..." />

      {/* Full Log */}
      {logs.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">Action</th>
                  <th className="px-6 py-3 text-left font-semibold">Resource</th>
                  <th className="px-6 py-3 text-left font-semibold">User</th>
                  <th className="px-6 py-3 text-left font-semibold">IP</th>
                  <th className="px-6 py-3 text-left font-semibold">Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">{log.action}</td>
                    <td className="px-6 py-3 text-gray-600">{log.resourceType}</td>
                    <td className="px-6 py-3 text-xs">{log.userId || "system"}</td>
                    <td className="px-6 py-3 text-xs text-gray-500">{log.ip}</td>
                    <td className="px-6 py-3 text-xs text-gray-500">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString("nl-NL") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
          <p className="text-gray-600">Geen audit log entries gevonden.</p>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} />
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
