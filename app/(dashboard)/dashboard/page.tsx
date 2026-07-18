import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { posts, postVersions, leads, outreachTasks, emails } from "@/drizzle/schema";
import { count, desc, eq, gte, sql } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [postCount] = await db.select({ count: count() }).from(posts);
  const [publishedCount] = await db.select({ count: count() }).from(posts).where(eq(posts.status, "published"));
  const [scheduledCount] = await db.select({ count: count() }).from(posts).where(eq(posts.status, "scheduled"));
  const [draftCount] = await db.select({ count: count() }).from(posts).where(eq(posts.status, "draft"));

  const [leadCount] = await db.select({ count: count() }).from(leads);
  const [leadsThisWeek] = await db
    .select({ count: count() })
    .from(leads)
    .where(gte(leads.createdAt, weekAgo));

  const [outreachPending] = await db
    .select({ count: count() })
    .from(outreachTasks)
    .where(eq(outreachTasks.status, "pending"));
  const [outreachTotal] = await db.select({ count: count() }).from(outreachTasks);

  const [emailCount] = await db.select({ count: count() }).from(emails);

  const recentPosts = await db
    .select({
      id: posts.id,
      status: posts.status,
      platforms: posts.platforms,
      contentType: posts.contentType,
      createdAt: posts.createdAt,
      caption: postVersions.caption,
    })
    .from(posts)
    .leftJoin(postVersions, eq(postVersions.postId, posts.id))
    .orderBy(desc(posts.createdAt))
    .limit(4);

  const leadsPerDay = await db
    .select({
      day: sql<string>`to_char(${leads.createdAt}, 'YYYY-MM-DD')`,
      total: count(),
    })
    .from(leads)
    .where(gte(leads.createdAt, new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)))
    .groupBy(sql`to_char(${leads.createdAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${leads.createdAt}, 'YYYY-MM-DD')`);

  const maxDay = Math.max(1, ...leadsPerDay.map((d) => d.total));
  const responseRate =
    outreachTotal.count > 0
      ? Math.round(((outreachTotal.count - outreachPending.count) / outreachTotal.count) * 100)
      : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main Content - 2 columns */}
      <div className="lg:col-span-2 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Dashboard</h1>
          <p className="text-gray-600 text-sm">
            Overzicht van Candelaria Agency operations. <span className="font-semibold">{postCount.count} posts</span>,{" "}
            <span className="font-semibold">{leadCount.count} leads</span> en{" "}
            <span className="font-semibold">{emailCount.count} e-mails</span> in de portal.
          </p>
        </div>

        {/* OVERVIEW */}
        <section className="space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">OVERZICHT</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-6 bg-white border border-gray-100 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">TOTAAL LEADS</p>
                    <p className="text-4xl font-bold text-gray-900">{leadCount.count}</p>
                  </div>
                  <div className="text-2xl">👥</div>
                </div>
                <p className="text-xs text-gray-600">+{leadsThisWeek.count} deze week</p>
              </div>

              <div className="p-6 bg-white border border-gray-100 rounded-2xl">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">POSTS GEPUBLICEERD</p>
                  <p className="text-3xl font-bold text-gray-900">{publishedCount.count}</p>
                </div>
                <p className="text-xs text-gray-600 mt-4">{scheduledCount.count} ingepland • {draftCount.count} concept</p>
              </div>

              <div className="p-6 bg-white border border-gray-100 rounded-2xl">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">OUTREACH RESPONSE RATE</p>
                  <p className="text-3xl font-bold text-gray-900">{responseRate}%</p>
                </div>
                <p className="text-xs text-green-600 mt-4">{outreachPending.count} taken nog open</p>
              </div>
            </div>
          </div>

          {/* Module Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ModuleCard title="Leads" value={leadCount.count} icon="👥" href="/leads" />
            <ModuleCard title="Social Publisher" value={postCount.count} icon="📱" href="/posts" />
            <ModuleCard title="Mailbox" value={emailCount.count} icon="📧" href="/inbox" />
            <ModuleCard title="Prospecting" value={outreachTotal.count} icon="🤖" href="/outreach" />
          </div>
        </section>

        {/* RECENT POSTS */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">RECENTE POSTS • {postCount.count} totaal</p>
            <Link href="/posts" className="text-xs text-gray-600 hover:text-gray-900">
              Full report →
            </Link>
          </div>

          {recentPosts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recentPosts.map((post) => (
                <RecentPost
                  key={post.id}
                  caption={post.caption || "(geen caption)"}
                  platforms={post.platforms?.join(", ") || "—"}
                  status={post.status || "draft"}
                  createdAt={post.createdAt}
                />
              ))}
            </div>
          ) : (
            <div className="p-6 bg-white border border-gray-100 rounded-2xl text-center">
              <p className="text-sm text-gray-500 mb-3">Nog geen posts aangemaakt.</p>
              <Link href="/posts/new" className="btn-primary text-sm">
                + New Post
              </Link>
            </div>
          )}
        </section>

        {/* LEADS TREND */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-6 bg-white border border-gray-100 rounded-2xl">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">NIEUWE LEADS • 7 DAGEN</p>
            {leadsPerDay.length > 0 ? (
              <div className="h-24 bg-gray-50 rounded-lg border border-gray-100 flex items-end justify-between p-4 gap-1">
                {leadsPerDay.map((d) => (
                  <div
                    key={d.day}
                    className="w-4 bg-green-400 rounded"
                    style={{ height: `${Math.max(8, (d.total / maxDay) * 100)}%` }}
                    title={`${d.day}: ${d.total}`}
                  ></div>
                ))}
              </div>
            ) : (
              <div className="h-24 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center">
                <p className="text-xs text-gray-400">Nog geen leads deze week</p>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-3">{leadsThisWeek.count} nieuwe leads deze week</p>
          </div>

          <div className="p-6 bg-white border border-gray-100 rounded-2xl">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">KEY METRICS</p>
            <div className="space-y-3">
              <MetricRow label="E-mails in mailbox" value={String(emailCount.count)} />
              <MetricRow label="Outreach-taken open" value={String(outreachPending.count)} />
              <MetricRow label="Posts in concept" value={String(draftCount.count)} />
            </div>
          </div>
        </section>
      </div>

      {/* Hero Panel - Right Sidebar */}
      <div className="col-span-1">
        <div className="lg:sticky lg:top-20 p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl overflow-hidden h-96">
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60"></div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width=%22100%22%20height=%22100%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Crect%20width=%22100%22%20height=%22100%22%20fill=%22%231a7f3f%22%20opacity=%220.1%22/%3E%3Ccircle%20cx=%2250%22%20cy=%2250%22%20r=%2230%22%20fill=%22none%22%20stroke=%22%231a7f3f%22%20stroke-width=%221%22%20opacity=%220.2%22/%3E%3C/svg%3E')] opacity-20"></div>

          <div className="relative h-full flex flex-col justify-between">
            <div>
              <div className="text-5xl mb-3">📊</div>
              <h3 className="text-lg font-bold text-white">Mission Control</h3>
            </div>

            <div className="space-y-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <p className="text-xs text-gray-300 uppercase tracking-wider mb-1">Actieve outreach-taken</p>
                <p className="text-2xl font-bold text-white">{outreachPending.count}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <p className="text-xs text-gray-300 uppercase tracking-wider mb-1">Ingeplande posts</p>
                <p className="text-sm text-gray-200">{scheduledCount.count}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Card */}
        <div className="mt-6 p-6 bg-white border border-gray-100 rounded-2xl">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Quick Stats</p>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Posts in concept</span>
              <span className="text-lg font-bold text-gray-900">{draftCount.count}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Ingeplande posts</span>
              <span className="text-lg font-bold text-gray-900">{scheduledCount.count}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Outreach response rate</span>
              <span className="text-lg font-bold text-green-600">{responseRate}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModuleCard({
  title,
  value,
  icon,
  href,
}: {
  title: string;
  value: number;
  icon: string;
  href: string;
}) {
  return (
    <Link href={href} className="p-6 bg-white border border-gray-100 rounded-2xl hover:shadow-md transition-all block">
      <p className="text-lg mb-3">{icon}</p>
      <p className="text-xs text-gray-500 mb-2 font-semibold uppercase">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
    </Link>
  );
}

function RecentPost({
  caption,
  platforms,
  status,
  createdAt,
}: {
  caption: string;
  platforms: string;
  status: string;
  createdAt: Date | null;
}) {
  const badgeClasses: Record<string, string> = {
    published: "bg-green-100 text-green-700",
    scheduled: "bg-blue-100 text-blue-700",
    draft: "bg-gray-100 text-gray-700",
    approved: "bg-orange-100 text-orange-700",
    failed: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-6 bg-white border border-gray-100 rounded-2xl border-l-4 border-l-brand-green">
      <p className={`text-xs font-bold ${badgeClasses[status] || badgeClasses.draft} px-2 py-1 rounded inline-block mb-3`}>
        {status.toUpperCase()}
      </p>
      <p className="font-semibold text-gray-900 mb-3 text-sm line-clamp-2">{caption}</p>
      <p className="text-xs text-gray-600">
        {platforms} • {createdAt ? new Date(createdAt).toLocaleDateString("nl-NL") : "—"}
      </p>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-sm font-bold text-gray-900">{value}</p>
    </div>
  );
}
