"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navSections = [
  {
    section: "COMMAND",
    items: [
      { name: "Dashboard", path: "/dashboard", icon: "📊" },
      { name: "Tasks", path: "/posts", icon: "✓" },
      { name: "Calendar", path: "/leads", icon: "📅" },
      { name: "Routines", path: "/inbox", icon: "🔄" },
      { name: "Agents", path: "/outreach", icon: "🤖" },
      { name: "Chats", path: "/audit-log", icon: "💬" },
      { name: "Sessions", path: "/settings", icon: "👤" },
      { name: "Skills", path: "/", icon: "⭐" },
    ],
  },
  {
    section: "GROWTH",
    items: [
      { name: "Revenue", path: "/", icon: "💰" },
      { name: "Analytics", path: "/", icon: "📈" },
      { name: "Competitors", path: "/", icon: "🎯" },
      { name: "Social", path: "/posts", icon: "📱" },
      { name: "Integrations", path: "/", icon: "🔗" },
      { name: "Research", path: "/", icon: "🔍" },
    ],
  },
  {
    section: "INTELLIGENCE",
    items: [
      { name: "Braindump", path: "/", icon: "🧠" },
      { name: "Mind", path: "/", icon: "💡" },
      { name: "Activity", path: "/", icon: "📊" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-200 min-h-screen fixed left-0 top-0 overflow-y-auto">
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
        <div className="flex items-center gap-2 mb-3">
          <div className="text-2xl font-bold text-gray-900">∞</div>
          <div>
            <p className="text-sm font-bold text-gray-900">187N</p>
            <p className="text-xs text-gray-500">Mission Control</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-xs font-semibold text-green-600">ONLINE</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-8">
        {navSections.map((section, idx) => (
          <div key={idx} className="space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3">{section.section}</p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.path || (item.path !== "/" && pathname.includes(item.path));
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
                      isActive
                        ? "bg-gray-100 text-gray-900 font-medium"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
