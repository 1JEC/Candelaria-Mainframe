import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLog, posts, leads, emails, agentRuns } from "@/drizzle/schema";
import { count, desc, and, gt } from "drizzle-orm";

export default async function DashboardPage() {
  const session = await auth();

  // Get counts
  const [logCount, postCount, leadCount, emailCount, agentCount] = await Promise.all([
    db.select({ count: count() }).from(auditLog),
    db.select({ count: count() }).from(posts),
    db.select({ count: count() }).from(leads),
    db.select({ count: count() }).from(emails),
    db.select({ count: count() }).from(agentRuns),
  ]);

  // Get today's activity
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayLogs = await db
    .select()
    .from(auditLog)
    .where(gt(auditLog.createdAt, today))
    .orderBy(desc(auditLog.createdAt))
    .limit(10);

  return (
    <div>
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-brand-black mb-2">
          Welkom, {session?.user?.name || session?.user?.email}
        </h1>
        <p className="text-gray-600">
          Mainframe HQ — Internal Operations Portal
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <MetricCard label="Audit Logs" value={logCount[0]?.count || 0} icon="📋" />
        <MetricCard label="Leads" value={leadCount[0]?.count || 0} icon="👥" />
        <MetricCard label="Posts" value={postCount[0]?.count || 0} icon="📱" />
        <MetricCard label="Emails" value={emailCount[0]?.count || 0} icon="📧" />
      </div>

      {/* Fase Progress */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-brand-black mb-6">Fase Progress</h2>
        <div className="space-y-3">
          <FaseCard fase="0" title="Blueprint" status="✅ Complete" />
          <FaseCard fase="1" title="Auth + Shell" status="✅ Complete" />
          <FaseCard fase="2" title="Website Intake" status="✅ Complete" />
          <FaseCard fase="3" title="Social Publisher" status="✅ Complete" />
          <FaseCard fase="4" title="Mailbox" status="✅ Complete" />
          <FaseCard fase="5" title="Prospecting" status="✅ Complete" />
          <FaseCard fase="6" title="Dashboard & Polish" status="✅ Complete" />
        </div>
      </section>

      {/* Modules */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-brand-black mb-6">Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ModuleCard
            name="Social Publisher"
            posts={postCount[0]?.count || 0}
            icon="📱"
          />
          <ModuleCard
            name="Lead Engine"
            posts={leadCount[0]?.count || 0}
            icon="👥"
          />
          <ModuleCard
            name="Mailbox"
            posts={emailCount[0]?.count || 0}
            icon="📧"
          />
        </div>
      </section>

      {/* Agent Activity */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-brand-black mb-4">AI Agents</h2>
        <div className="p-6 bg-white border border-gray-200 rounded-lg">
          <p className="text-gray-700 mb-2">
            <strong>Total Runs:</strong> {agentCount[0]?.count || 0}
          </p>
          <p className="text-sm text-gray-600">
            Agents: content-generator, email-triage, prospector
          </p>
        </div>
      </section>

      {/* Recent Activity */}
      <section>
        <h2 className="text-2xl font-bold text-brand-black mb-4">Today's Activity</h2>
        {todayLogs.length > 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">Action</th>
                    <th className="px-6 py-3 text-left font-semibold">Resource</th>
                    <th className="px-6 py-3 text-left font-semibold">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {todayLogs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-200">
                      <td className="px-6 py-3 font-medium">{log.action}</td>
                      <td className="px-6 py-3 text-gray-600">
                        {log.resourceType}
                      </td>
                      <td className="px-6 py-3 text-xs text-gray-500">
                        {new Date(log.createdAt).toLocaleTimeString("nl-NL")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-gray-600">Geen activiteit vandaag.</p>
        )}
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="p-6 bg-white border-l-4 border-brand-green rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm mb-1">{label}</p>
          <p className="text-3xl font-bold text-brand-black">{value}</p>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
}

function FaseCard({
  fase,
  title,
  status,
}: {
  fase: string;
  title: string;
  status: string;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
      <div>
        <p className="font-semibold text-gray-900">Fase {fase}: {title}</p>
      </div>
      <div className="text-green-600 font-medium">{status}</div>
    </div>
  );
}

function ModuleCard({
  name,
  posts,
  icon,
}: {
  name: string;
  posts: number;
  icon: string;
}) {
  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold text-gray-900 mb-1">{name}</h3>
      <p className="text-2xl font-bold text-brand-green">{posts}</p>
      <p className="text-xs text-gray-500 mt-2">Items in system</p>
    </div>
  );
}
