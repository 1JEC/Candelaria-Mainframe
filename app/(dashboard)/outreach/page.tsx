import { db } from "@/lib/db";
import { outreachTasks } from "@/drizzle/schema";
import { desc, count, eq } from "drizzle-orm";

export default async function OutreachPage() {
  const tasks = await db
    .select()
    .from(outreachTasks)
    .orderBy(desc(outreachTasks.createdAt))
    .limit(20);

  const taskCount = await db.select({ count: count() }).from(outreachTasks);
  const pendingCount = await db
    .select({ count: count() })
    .from(outreachTasks)
    .where(eq(outreachTasks.status, "pending"));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-brand-black">Prospecting</h1>
        <p className="text-gray-600">Lead research & outreach campaigns</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Tasks" value={taskCount[0]?.count || 0} />
        <StatCard label="Pending" value={pendingCount[0]?.count || 0} />
        <StatCard label="Completed" value={Math.max(0, (taskCount[0]?.count || 0) - (pendingCount[0]?.count || 0))} />
      </div>

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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
          <p className="text-gray-600">
            Geen outreach-taken. Prospecting agent genereert tasks op commando.
          </p>
        </div>
      )}
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
