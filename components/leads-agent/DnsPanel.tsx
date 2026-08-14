"use client";

import { useState } from "react";

interface DnsCheckResult {
  name: string;
  status: "green" | "amber" | "red";
  detail: string;
}

const STATUS_DOT: Record<string, string> = { green: "bg-green-500", amber: "bg-yellow-500", red: "bg-red-500" };

export function DnsPanel({ domain, initialChecks, checkedAt }: { domain: string; initialChecks: DnsCheckResult[]; checkedAt: string }) {
  const [checks, setChecks] = useState(initialChecks);
  const [lastChecked, setLastChecked] = useState(checkedAt);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/leads/health/dns?domain=${encodeURIComponent(domain)}&refresh=1`);
      const data = await res.json();
      if (res.ok) {
        setChecks(data.checks);
        setLastChecked(data.checkedAt);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-brand-black">DNS — {domain}</h2>
        <button onClick={refresh} disabled={loading} className="btn-secondary text-xs py-1 px-3 disabled:opacity-50">
          {loading ? "Bezig..." : "Vernieuwen"}
        </button>
      </div>
      <div className="space-y-2">
        {checks.map((check) => (
          <div key={check.name} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
            <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[check.status]}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{check.name}</p>
              <p className="text-sm text-gray-600 break-all">{check.detail}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-3">Laatst gecontroleerd: {new Date(lastChecked).toLocaleString("nl-NL")} (cache 1 uur)</p>
    </div>
  );
}
