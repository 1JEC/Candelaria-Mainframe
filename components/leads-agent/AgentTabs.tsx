"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { name: "Console", path: "/leads/agent/console" },
  { name: "Leads", path: "/leads/agent/leads" },
  { name: "Outbound", path: "/leads/agent/outbound" },
  { name: "Runs", path: "/leads/agent/runs" },
  { name: "Instellingen", path: "/leads/agent/instellingen" },
  { name: "Health", path: "/leads/agent/health" },
];

export function AgentTabs() {
  const pathname = usePathname();

  return (
    <div className="border-b border-gray-200 mb-6 overflow-x-auto">
      <nav className="flex gap-1 min-w-max">
        {TABS.map((tab) => {
          const isActive = pathname === tab.path;
          return (
            <Link
              key={tab.path}
              href={tab.path}
              className={`px-4 py-2.5 min-h-11 flex items-center text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? "text-brand-green border-brand-green"
                  : "text-gray-600 border-transparent hover:text-brand-green hover:border-brand-green"
              }`}
            >
              {tab.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
