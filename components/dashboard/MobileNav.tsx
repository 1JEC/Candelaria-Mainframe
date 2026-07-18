"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navSections } from "@/lib/navigation";

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      {/* Sticky mobile topbar */}
      <div
        className="md:hidden sticky top-0 z-40 bg-white border-b border-gray-200 flex items-center justify-between px-4 h-14"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Candelaria Agency" width={28} height={28} className="h-7 w-7 object-contain" priority />
          <span className="text-sm font-bold text-gray-900">Candelaria Mainframe</span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex items-center justify-center h-11 w-11 -mr-2 text-gray-700"
        >
          <span className="text-2xl leading-none">☰</span>
        </button>
      </div>

      {/* Drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-white shadow-xl overflow-y-auto"
            style={{
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Image src="/logo.png" alt="Candelaria Agency" width={32} height={32} className="h-8 w-8 object-contain" />
                <div>
                  <p className="text-sm font-bold text-gray-900">Candelaria</p>
                  <p className="text-xs text-gray-500">Mainframe</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Sluit menu"
                className="flex items-center justify-center h-11 w-11 text-gray-400 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>

            <nav className="px-3 py-6 space-y-8">
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
                          className={`flex items-center gap-3 px-3 py-2.5 min-h-11 rounded text-sm transition-colors ${
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
          </div>
        </div>
      )}
    </>
  );
}
