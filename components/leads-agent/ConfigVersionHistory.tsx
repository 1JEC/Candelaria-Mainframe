"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface VersionRow {
  version: number;
  isActive: boolean | null;
  createdAt: string | Date | null;
}

export function ConfigVersionHistory({ configKey, versions }: { configKey: string; versions: VersionRow[] }) {
  const [restoring, setRestoring] = useState<number | null>(null);
  const router = useRouter();

  async function restore(version: number) {
    setRestoring(version);
    try {
      await fetch("/api/agents/leads/settings/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: configKey, version }),
      });
      router.refresh();
    } finally {
      setRestoring(null);
    }
  }

  if (versions.length <= 1) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h2 className="text-sm font-semibold text-brand-black mb-3">Versiegeschiedenis — {configKey}</h2>
      <div className="space-y-1.5">
        {versions.map((v) => (
          <div key={v.version} className="flex items-center justify-between text-sm">
            <span className={v.isActive ? "font-semibold text-gray-900" : "text-gray-500"}>
              v{v.version} {v.isActive && "(actief)"} — {v.createdAt ? new Date(v.createdAt).toLocaleString("nl-NL") : "—"}
            </span>
            {!v.isActive && (
              <button onClick={() => restore(v.version)} disabled={restoring === v.version} className="text-xs text-brand-green hover:underline disabled:opacity-50">
                {restoring === v.version ? "Bezig..." : "Herstel vorige versie"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
