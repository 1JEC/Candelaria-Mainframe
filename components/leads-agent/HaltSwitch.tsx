"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function HaltSwitch({ halted }: { halted: boolean }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggle() {
    setLoading(true);
    try {
      await fetch("/api/agents/leads/outbound/halt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ halted: !halted }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`px-4 py-2 min-h-11 rounded-lg text-sm font-semibold disabled:opacity-50 ${
        halted ? "bg-gray-200 text-gray-700 hover:bg-gray-300" : "bg-red-600 text-white hover:bg-red-700"
      }`}
    >
      {loading ? "Bezig..." : halted ? "Noodstop opheffen" : "Alles stoppen"}
    </button>
  );
}
