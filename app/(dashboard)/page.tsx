import { db } from "@/lib/db";
import { posts } from "@/drizzle/schema";
import { count } from "drizzle-orm";

export default async function DashboardPage() {
  // Get counts
  const [postCount] = await Promise.all([db.select({ count: count() }).from(posts)]);

  const totalReach = 628400;
  const engagement = "5.2%";
  const newFollowers = "3.940";

  return (
    <div className="grid grid-cols-3 gap-8">
      {/* Main Content - 2 columns */}
      <div className="col-span-2 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Social</h1>
          <p className="text-gray-600 text-sm">
            5 accounts publishing on schedule across 4 platforms. <span className="font-semibold">The agent ships it.</span> You approve the queue.
          </p>
        </div>

        {/* BROADCAST - LAST 7 DAYS */}
        <section className="space-y-6">
        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">BROADCAST • LAST 7 DAYS</p>

          {/* Large Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-6 bg-white border border-gray-100 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">TOTAL REACH</p>
                  <p className="text-4xl font-bold text-gray-900">{(totalReach / 1000).toFixed(0)}k</p>
                </div>
                <div className="text-2xl">📊</div>
              </div>
              <p className="text-xs text-gray-600">Across 12 posts • +14% wk/wk</p>
            </div>

            <div className="p-6 bg-white border border-gray-100 rounded-2xl">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">ENGAGEMENT</p>
                <p className="text-3xl font-bold text-gray-900">{engagement}</p>
                <p className="text-xs text-green-600">↑ 1.8% avg wk/wk</p>
              </div>
              <p className="text-xs text-gray-600 mt-4">The content-machine drafted 9 of 12 posts this week. Avg engagement held at 5.2%, well above the 3.1% category line.</p>
            </div>

            <div className="p-6 bg-white border border-gray-100 rounded-2xl">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">NET NEW FOLLOWERS</p>
                <p className="text-3xl font-bold text-gray-900">{newFollowers}</p>
                <p className="text-xs text-green-600">↑ +1.3% vs prior 7d</p>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Cards */}
        <div className="grid grid-cols-4 gap-4">
          <PlatformCard platform="Instagram" followers="236K" engagement="4.8% ER" icon="📸" />
          <PlatformCard platform="LinkedIn" followers="54K" engagement="3.2% ER" icon="💼" />
          <PlatformCard platform="YouTube" followers="312K" engagement="6.7% ER" icon="▶️" />
          <div className="p-6 bg-white border border-gray-100 rounded-2xl">
            <p className="text-xs text-gray-500 mb-3">Now publishing</p>
            <p className="text-sm text-gray-700">POV: your gym bottle holds 2 litres — <span className="text-gray-400">@forgewaters</span></p>
          </div>
        </div>
      </section>

      {/* RECENT POSTS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">RECENT POSTS • {postCount[0]?.count || 0} published • 4 scheduled</p>
          <button className="text-xs text-gray-600 hover:text-gray-900">Full report →</button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <RecentPost
            title="The 3am restock run that broke our DMs"
            engagement="184K views • 12.4K likes"
            platform="@forgewaters • Instagram • posted 2d ago"
            badge="TOP POST • 70"
            badgeColor="orange"
          />
          <div className="p-6 bg-white border border-gray-100 rounded-2xl flex flex-col justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-4">
                <span className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs mr-2">All</span>
                <span className="inline-block bg-green-100 text-green-700 px-2 py-1 rounded text-xs mr-2">Published</span>
                <span className="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">Scheduled</span>
              </p>
            </div>
            <input
              type="text"
              placeholder="Filter posts, captions, channel..."
              className="px-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* ENGAGEMENT TREND */}
      <section className="grid grid-cols-2 gap-4">
        <div className="p-6 bg-white border border-gray-100 rounded-2xl">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">ENGAGEMENT TREND • 12 WEEKS</p>
          <div className="h-24 bg-gray-50 rounded-lg border border-gray-100 flex items-end justify-between p-4">
            <div className="h-1/3 w-2 bg-gray-300 rounded"></div>
            <div className="h-1/2 w-2 bg-gray-300 rounded"></div>
            <div className="h-2/3 w-2 bg-gray-300 rounded"></div>
            <div className="h-3/4 w-2 bg-gray-300 rounded"></div>
            <div className="h-5/6 w-2 bg-gray-300 rounded"></div>
            <div className="h-full w-2 bg-green-400 rounded"></div>
          </div>
          <p className="text-xs text-gray-500 mt-3">5.2% avg • +0.8pp wk/wk ↑</p>
        </div>

        <div className="p-6 bg-white border border-gray-100 rounded-2xl">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">KEY METRICS</p>
          <div className="space-y-3">
            <MetricRow label="Impressions" value="184K" change="+12.4K" />
            <MetricRow label="Clicks" value="342" change="+8.9%" />
            <MetricRow label="Shares" value="67" change="+3.2%" />
          </div>
        </div>
      </section>
      </div>

      {/* Hero Panel - Right Sidebar */}
      <div className="col-span-1">
        <div className="sticky top-20 p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl overflow-hidden h-96">
          {/* Hero Image Placeholder with gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60"></div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width=%22100%22%20height=%22100%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Crect%20width=%22100%22%20height=%22100%22%20fill=%22%231a7f3f%22%20opacity=%220.1%22/%3E%3Ccircle%20cx=%2250%22%20cy=%2250%22%20r=%2230%22%20fill=%22none%22%20stroke=%22%231a7f3f%22%20stroke-width=%221%22%20opacity=%220.2%22/%3E%3C/svg%3E')] opacity-20"></div>

          <div className="relative h-full flex flex-col justify-between">
            {/* Top section with icon */}
            <div>
              <div className="text-5xl mb-3">📊</div>
              <h3 className="text-lg font-bold text-white">Mission Control</h3>
            </div>

            {/* Bottom section with stats */}
            <div className="space-y-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <p className="text-xs text-gray-300 uppercase tracking-wider mb-1">Active Campaigns</p>
                <p className="text-2xl font-bold text-white">5</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <p className="text-xs text-gray-300 uppercase tracking-wider mb-1">Next Review</p>
                <p className="text-sm text-gray-200">In 4 hours</p>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Card */}
        <div className="mt-6 p-6 bg-white border border-gray-100 rounded-2xl">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Quick Stats</p>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Pending Approvals</span>
              <span className="text-lg font-bold text-gray-900">2</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Scheduled Posts</span>
              <span className="text-lg font-bold text-gray-900">4</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Response Rate</span>
              <span className="text-lg font-bold text-green-600">94%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlatformCard({
  platform,
  followers,
  engagement,
  icon,
}: {
  platform: string;
  followers: string;
  engagement: string;
  icon: string;
}) {
  return (
    <div className="p-6 bg-white border border-gray-100 rounded-2xl">
      <p className="text-lg mb-3">{icon}</p>
      <p className="text-xs text-gray-500 mb-2 font-semibold uppercase">{platform}</p>
      <p className="text-2xl font-bold text-gray-900 mb-1">{followers}</p>
      <p className="text-xs text-green-600">{engagement}</p>
    </div>
  );
}

function RecentPost({
  title,
  engagement,
  platform,
  badge,
  badgeColor,
}: {
  title: string;
  engagement: string;
  platform: string;
  badge: string;
  badgeColor: "orange" | "green" | "blue";
}) {
  const badgeClasses = {
    orange: "bg-orange-100 text-orange-700",
    green: "bg-green-100 text-green-700",
    blue: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="p-6 bg-white border border-gray-100 rounded-2xl border-l-4 border-l-orange-400">
      <p className={`text-xs font-bold ${badgeClasses[badgeColor]} px-2 py-1 rounded inline-block mb-3`}>{badge}</p>
      <p className="font-semibold text-gray-900 mb-3 text-sm">{title}</p>
      <p className="text-sm font-medium text-gray-900 mb-2">{engagement}</p>
      <p className="text-xs text-gray-600">{platform}</p>
    </div>
  );
}

function MetricRow({ label, value, change }: { label: string; value: string; change: string }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-gray-600">{label}</p>
      <div className="text-right">
        <p className="text-sm font-bold text-gray-900">{value}</p>
        <p className="text-xs text-green-600">{change}</p>
      </div>
    </div>
  );
}
