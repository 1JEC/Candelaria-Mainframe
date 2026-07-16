"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const modules = [
  {
    name: "Dashboard",
    path: "/dashboard",
    icon: "📊",
    status: "active",
  },
  {
    name: "Social Publisher",
    path: "/dashboard/posts",
    icon: "📱",
    status: "fase-3",
  },
  {
    name: "Website Intake",
    path: "/dashboard/leads",
    icon: "📋",
    status: "fase-2",
  },
  {
    name: "Mailbox",
    path: "/dashboard/inbox",
    icon: "📧",
    status: "fase-4",
  },
  {
    name: "Lead Engine",
    path: "/dashboard/outreach",
    icon: "🎯",
    status: "fase-5",
  },
  {
    name: "Audit Log",
    path: "/dashboard/audit-log",
    icon: "📋",
    status: "fase-6",
  },
  {
    name: "Settings",
    path: "/dashboard/settings",
    icon: "⚙️",
    status: "active",
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 bg-gray-50 border-r border-gray-200 min-h-screen">
      <nav className="flex-1 p-4 space-y-2">
        {modules.map((module) => {
          const isActive =
            pathname === module.path ||
            (module.path === "/dashboard" && pathname === "/dashboard");

          return (
            <div key={module.path}>
              <Link
                href={module.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  isActive
                    ? "bg-brand-green text-brand-white font-semibold"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span className="text-lg">{module.icon}</span>
                <span className="flex-1">{module.name}</span>
                {module.status !== "active" && (
                  <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                    {module.status}
                  </span>
                )}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 text-xs text-gray-500">
        <p>Mainframe HQ</p>
        <p>Fase 1: Fundament ✓</p>
      </div>
    </aside>
  );
}
