"use client";

import { Session } from "next-auth";
import { signOut } from "next-auth/react";
import { Suspense, useState } from "react";
import { usePathname } from "next/navigation";
import NavbarSearch from "@/components/dashboard/NavbarSearch";

interface NavbarProps {
  session: Session | null;
}

const ROUTE_LABELS: Record<string, { section: string; title: string }> = {
  "/dashboard": { section: "COMMAND", title: "Dashboard" },
  "/posts": { section: "COMMAND", title: "Social Publisher" },
  "/leads": { section: "COMMAND", title: "Leads" },
  "/inbox": { section: "COMMAND", title: "Mailbox" },
  "/outreach": { section: "COMMAND", title: "Prospecting" },
  "/audit-log": { section: "COMMAND", title: "Audit Log" },
  "/analytics": { section: "GROWTH", title: "Analytics" },
  "/skills": { section: "GROWTH", title: "Skills" },
  "/settings": { section: "INTELLIGENCE", title: "Settings" },
};

export function Navbar({ session }: NavbarProps) {
  const [showMenu, setShowMenu] = useState(false);
  const pathname = usePathname();

  const matchedRoute = Object.keys(ROUTE_LABELS).find((route) => pathname.startsWith(route));
  const breadcrumb = matchedRoute ? ROUTE_LABELS[matchedRoute] : { section: "MAINFRAME", title: "HQ" };

  return (
    <nav className="bg-white border-b border-gray-100 ml-56">
      <div className="px-8 h-16 flex items-center justify-between">
        {/* Breadcrumb/Title Area */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-gray-400 uppercase">{breadcrumb.section}</span>
          <span className="text-sm text-gray-400">›</span>
          <span className="text-sm font-semibold text-gray-900">{breadcrumb.title}</span>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-6">
          {/* Search */}
          <Suspense fallback={<div className="hidden lg:block w-64" />}>
            <NavbarSearch />
          </Suspense>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition"
            >
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                {session?.user?.email?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-gray-600 hidden sm:inline">{session?.user?.email?.split("@")[0]}</span>
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
