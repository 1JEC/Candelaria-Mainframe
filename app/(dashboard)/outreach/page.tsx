import { db } from "@/lib/db";
import { outreachTasks } from "@/drizzle/schema";
import { desc, count, eq, and } from "drizzle-orm";
import SearchFilterBar from "@/components/ui/SearchFilterBar";
import Pagination from "@/components/ui/Pagination";
import TaskActions from "@/components/outreach/TaskActions";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "pending", label: "Openstaand" },
  { value: "completed", label: "Afgerond" },
];

export default async function OutreachPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const status = params.status;
  const where = status ? and(eq(outreachTasks.status, status)) : undefined;

  const tasks = await db
    .select()
    .from(outreachTasks)
    .where(where)
    .orderBy(desc(outreachTasks.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const [{ count: totalCount }] = await db.select({ count: count() }).from(outreachTasks).where(where);
  const [{ count: taskCount }] = await db.select({ count: count() }).from(outreachTasks);
  const [{ count: pendingCount }] = await db
    .select({ count: count() })
    .from(outreachTasks)
    .where(eq(outreachTasks.status, "pending"));

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-black">Prospecting</h1>
          <p className="text-gray-600">Lead research & outreach campaigns</p>
        </div>
        <a href="/api/outreach/export" className="btn-secondary text-sm py-2 px-4">
          Exporteren (CSV)
        </a>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Tasks" value={taskCount} />
        <StatCard label="Pending" value={pendingCount} />
        <StatCard label="Completed" value={Math.max(0, taskCount - pendingCount)} />
      </div>

      <SearchFilterBar placeholder="Zoek..." statusOptions={STATUS_OPTIONS} />

      {tasks.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">Type</th>
                  <th className="px-6 py-3 text-left font-semibold">Status</th>
                  <th className="px-6 py-3 text-left font-semibold">Notes</th>
                  <th className="px-6 py-3 text-left font-semibold">Created</th>
                  <th className="px-6 py-3 text-left font-semibold">Actie</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="border-b border-gray-200">
                    <td className="px-6 py-3 font-medium">{task.taskType}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          task.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {task.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-600">{task.notes || "—"}</td>
                    <td className="px-6 py-3 text-xs text-gray-500">
                      {task.createdAt ? new Date(task.createdAt).toLocaleDateString("nl-NL") : "—"}
                    </td>
                    <td className="px-6 py-3">
                      <TaskActions id={task.id} status={task.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
          <p className="text-gray-600">Geen outreach-taken gevonden.</p>
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
