"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  name: string;
  href: string;
  icon: string;
  section: string;
}

const navItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: "📊", section: "COMMAND" },
  { name: "Posts", href: "/posts", icon: "📱", section: "COMMAND" },
  { name: "Leads", href: "/leads", icon: "👥", section: "COMMAND" },
  { name: "Inbox", href: "/inbox", icon: "💬", section: "COMMAND" },
  { name: "Outreach", href: "/outreach", icon: "📧", section: "GROWTH" },
  { name: "Analytics", href: "/analytics", icon: "📈", section: "GROWTH" },
  { name: "Audit Log", href: "/audit-log", icon: "📋", section: "GROWTH" },
  { name: "Settings", href: "/settings", icon: "⚙️", section: "INTELLIGENCE" },
];

export default function Sidebar() {
  const pathname = usePathname();

  const sections = ["COMMAND", "GROWTH", "INTELLIGENCE"];

  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-100 overflow-y-auto">
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-100">
        <div className="text-2xl font-bold text-brand-black">𝕯</div>
        <p className="text-xs text-gray-500 mt-1">Mission Control</p>
        <div className="flex items-center gap-2 mt-3">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span className="text-xs font-medium text-green-600">ONLINE</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-6 space-y-8">
        {sections.map((section) => {
          const sectionItems = navItems.filter((item) => item.section === section);
          return (
            <div key={section}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">{section}</p>
              <div className="space-y-2">
                {sectionItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all ${
                        isActive
                          ? "bg-gray-100 text-brand-black font-medium"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
