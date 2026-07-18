"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navSections = [
  {
    section: "COMMAND",
    items: [
      { name: "Dashboard", path: "/dashboard", icon: "📊" },
      { name: "Social Publisher", path: "/posts", icon: "📱" },
      { name: "Leads", path: "/leads", icon: "👥" },
      { name: "Mailbox", path: "/inbox", icon: "📧" },
      { name: "Prospecting", path: "/outreach", icon: "🤖" },
      { name: "Audit Log", path: "/audit-log", icon: "📋" },
    ],
  },
  {
    section: "GROWTH",
    items: [
      { name: "Analytics", path: "/analytics", icon: "📈" },
      { name: "Skills", path: "/skills", icon: "⭐" },
    ],
  },
  {
    section: "INTELLIGENCE",
    items: [{ name: "Settings", path: "/settings", icon: "👤" }],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-200 min-h-screen fixed left-0 top-0 overflow-y-auto">
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
        <Link href="/dashboard" className="flex items-center gap-2 mb-3">
          <Image src="/logo.png" alt="Candelaria" width={32} height={32} className="h-8 w-8 object-contain" priority />
          <div>
            <p className="text-sm font-bold text-gray-900">Candelaria</p>
            <p className="text-xs text-gray-500">Mainframe</p>
          </div>
        </Link>
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
