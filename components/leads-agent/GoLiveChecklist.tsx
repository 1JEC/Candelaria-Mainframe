"use client";

import { useState } from "react";

interface ChecklistItem {
  key: string;
  label: string;
}

export function GoLiveChecklist({ items, initialChecked }: { items: readonly ChecklistItem[]; initialChecked: Record<string, boolean> }) {
  const [checked, setChecked] = useState(initialChecked);
  const [loading, setLoading] = useState<string | null>(null);

  const allChecked = items.every((item) => checked[item.key]);

  async function toggle(key: string) {
    setLoading(key);
    const next = !checked[key];
    try {
      const res = await fetch("/api/agents/leads/health/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, checked: next }),
      });
      if (res.ok) {
        const data = await res.json();
        setChecked(data.items);
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-brand-black">Go-live checklist</h2>
        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${allChecked ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
          {allChecked ? "OUTBOUND_ENABLED kan aan" : "OUTBOUND_ENABLED vergrendeld"}
        </span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <label key={item.key} className="flex items-start gap-3 py-1.5 min-h-11 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(checked[item.key])}
              onChange={() => toggle(item.key)}
              disabled={loading === item.key}
              className="w-4 h-4 mt-0.5"
            />
            <span className={`text-sm ${checked[item.key] ? "text-gray-500 line-through" : "text-gray-800"}`}>{item.label}</span>
          </label>
        ))}
      </div>
      {!allChecked && (
        <p className="text-xs text-gray-500 mt-3">
          Alle punten moeten aangevinkt zijn voordat <code>OUTBOUND_ENABLED=true</code> verantwoord is.
        </p>
      )}
    </div>
  );
}
