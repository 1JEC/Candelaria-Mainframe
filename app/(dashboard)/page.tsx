import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLog } from "@/drizzle/schema";
import { count, desc, limit } from "drizzle-orm";

export default async function DashboardPage() {
  const session = await auth();

  // Get recent audit logs
  const recentLogs = await db
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt))
    .limit(5);

  const logCount = await db.select({ count: count() }).from(auditLog);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-brand-black mb-2">
          Welkom, {session?.user?.name || session?.user?.email}
        </h1>
        <p className="text-gray-600">
          Mainframe HQ — Internal Operations Portal
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Audit Logs"
          value={logCount[0]?.count || 0}
          change="All-time"
        />
        <StatCard label="Posts" value={0} change="This week" />
        <StatCard label="Leads" value={0} change="New" />
        <StatCard label="Emails" value={0} change="Unread" />
      </div>

      {/* Module Status */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-brand-black mb-4">
          Module Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ModuleCard
            name="Social Publisher"
            status="Coming in Fase 3"
            icon="📱"
          />
          <ModuleCard
            name="Website Intake"
            status="Coming in Fase 2"
            icon="📋"
          />
          <ModuleCard name="Mailbox" status="Coming in Fase 4" icon="📧" />
          <ModuleCard
            name="Lead Engine"
            status="Coming in Fase 5"
            icon="🎯"
          />
          <ModuleCard name="Dashboard" status="Coming in Fase 6" icon="📊" />
          <ModuleCard
            name="Settings"
            status="Active (Fase 1) ✓"
            icon="⚙️"
            active
          />
        </div>
      </section>

      {/* Recent Activity */}
      <section>
        <h2 className="text-2xl font-bold text-brand-black mb-4">
          Recent Activity
        </h2>
        {recentLogs.length > 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">Action</th>
                    <th className="px-6 py-3 text-left font-semibold">
                      Resource
                    </th>
                    <th className="px-6 py-3 text-left font-semibold">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-200">
                      <td className="px-6 py-3 font-medium">{log.action}</td>
                      <td className="px-6 py-3 text-gray-600">
                        {log.resourceType}
                      </td>
                      <td className="px-6 py-3 text-gray-500 text-xs">
                        {new Date(log.createdAt).toLocaleString("nl-NL")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-gray-600">Geen recente activiteit.</p>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  change,
}: {
  label: string;
  value: number;
  change: string;
}) {
  return (
    <div className="p-6 bg-white border-l-4 border-brand-green rounded-lg">
      <p className="text-gray-600 text-sm mb-1">{label}</p>
      <p className="text-3xl font-bold text-brand-black">{value}</p>
      <p className="text-xs text-gray-500 mt-2">{change}</p>
    </div>
  );
}

function ModuleCard({
  name,
  status,
  icon,
  active = false,
}: {
  name: string;
  status: string;
  icon: string;
  active?: boolean;
}) {
  return (
    <div
      className={`p-4 rounded-lg border-2 transition ${
        active
          ? "bg-brand-green/10 border-brand-green"
          : "border-gray-200 hover:border-brand-green"
      }`}
    >
      <div className="text-2xl mb-2">{icon}</div>
      <h3 className="font-semibold text-brand-black mb-1">{name}</h3>
      <p className="text-sm text-gray-600">{status}</p>
    </div>
  );
}
