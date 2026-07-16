"use client";

import { useState } from "react";

interface InsightCard {
  id: string;
  title: string;
  description: string;
  metric: string;
  trend: "up" | "down" | "stable";
  icon: string;
}

export default function PortalInsights({
  metrics,
}: {
  metrics: {
    logCount: number;
    leadCount: number;
    postCount: number;
    emailCount: number;
    agentCount: number;
  };
}) {
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month" | "all">("week");

  const insights: InsightCard[] = [
    {
      id: "leads",
      title: "Lead Quality",
      description: "Qualified leads ready for outreach",
      metric: `${metrics.leadCount} leads`,
      trend: "up",
      icon: "👥",
    },
    {
      id: "engagement",
      title: "Content Performance",
      description: "Published posts across all platforms",
      metric: `${metrics.postCount} posts`,
      trend: metrics.postCount > 10 ? "up" : "stable",
      icon: "📱",
    },
    {
      id: "communication",
      title: "Client Communication",
      description: "Emails processed and tracked",
      metric: `${metrics.emailCount} emails`,
      trend: metrics.emailCount > 5 ? "up" : "stable",
      icon: "📧",
    },
    {
      id: "automation",
      title: "Agent Activity",
      description: "AI agent executions and automations",
      metric: `${metrics.agentCount} runs`,
      trend: metrics.agentCount > 5 ? "up" : "stable",
      icon: "🤖",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-brand-black mb-2">Portal Insights</h2>
        <p className="text-gray-600">Key performance indicators and system health</p>
      </div>

      {/* Period selector */}
      <div className="flex gap-2">
        {(["week", "month", "all"] as const).map((period) => (
          <button
            key={period}
            onClick={() => setSelectedPeriod(period)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              selectedPeriod === period
                ? "bg-brand-green text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {period === "week" ? "This Week" : period === "month" ? "This Month" : "All Time"}
          </button>
        ))}
      </div>

      {/* Insights grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className="p-6 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="text-3xl">{insight.icon}</div>
              <div
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  insight.trend === "up"
                    ? "bg-green-50 text-green-700"
                    : insight.trend === "down"
                      ? "bg-red-50 text-red-700"
                      : "bg-gray-50 text-gray-700"
                }`}
              >
                {insight.trend === "up" ? "↑" : insight.trend === "down" ? "↓" : "→"} {insight.trend}
              </div>
            </div>
            <h3 className="font-semibold text-brand-black mb-1">{insight.title}</h3>
            <p className="text-sm text-gray-600 mb-3">{insight.description}</p>
            <div className="text-2xl font-bold text-brand-green">{insight.metric}</div>
          </div>
        ))}
      </div>

      {/* System Health */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-brand-black mb-4">System Health</h3>
        <div className="space-y-4">
          <HealthIndicator label="Portal Status" status="healthy" value="Operating normally" />
          <HealthIndicator label="Database" status="healthy" value="Connected and responsive" />
          <HealthIndicator label="Auth System" status="healthy" value="2FA enabled" />
          <HealthIndicator label="API Integrations" status="healthy" value="All services online" />
          <HealthIndicator label="Audit Logging" status="healthy" value={`${metrics.logCount} entries`} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-brand-green/10 to-brand-green/5 border border-brand-green/20 rounded-lg p-6">
        <h3 className="font-semibold text-brand-black mb-3">Recommended Actions</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>✓ Review lead intake processes to improve conversion rates</li>
          <li>✓ Schedule content review meeting for next week</li>
          <li>✓ Check email campaign performance metrics</li>
          <li>✓ Optimize high-performing social media content</li>
        </ul>
      </div>
    </div>
  );
}

function HealthIndicator({
  label,
  status,
  value,
}: {
  label: string;
  status: "healthy" | "warning" | "critical";
  value: string;
}) {
  const statusColors = {
    healthy: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
    warning: { bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-500" },
    critical: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  };

  const colors = statusColors[status];

  return (
    <div className={`p-4 ${colors.bg} rounded-lg`}>
      <div className="flex items-center gap-3">
        <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
        <div className="flex-1">
          <p className={`font-medium text-sm ${colors.text}`}>{label}</p>
          <p className="text-xs text-gray-600">{value}</p>
        </div>
      </div>
    </div>
  );
}
