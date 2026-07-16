"use client";

import { Session } from "next-auth";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

interface NavbarProps {
  session: Session | null;
}

export function Navbar({ session }: NavbarProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <nav className="bg-brand-black text-brand-white border-b-4 border-brand-green">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-green rounded-full flex items-center justify-center font-bold">
            M
          </div>
          <span className="font-bold">Mainframe HQ</span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-6">
          <span className="text-sm">{session?.user?.email}</span>
          <button
            onClick={() => signOut({ redirectTo: "/login" })}
            className="btn-secondary text-xs py-1 px-3"
          >
            Uitloggen
          </button>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-brand-green rounded"
          >
            ☰
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {showMenu && (
        <div className="md:hidden bg-brand-green/10 p-4 border-t border-brand-green space-y-3">
          <div className="text-sm text-gray-300">{session?.user?.email}</div>
          <button
            onClick={() => signOut({ redirectTo: "/login" })}
            className="w-full btn-secondary text-sm py-2"
          >
            Uitloggen
          </button>
        </div>
      )}
    </nav>
  );
}
