"use client";

import { useState } from "react";

interface RetentionCounts {
  leadsPurged: number;
  eventsPurged: number;
  placesContentPurged: number;
}

export function RetentionPanel({ preview }: { preview: RetentionCounts }) {
  const [result, setResult] = useState<RetentionCounts | null>(null);
  const [running, setRunning] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function run() {
    setRunning(true);
    try {
      const res = await fetch("/api/agents/leads/retention", { method: "POST" });
      if (res.ok) setResult(await res.json());
    } finally {
      setRunning(false);
      setConfirming(false);
    }
  }

  const counts = result ?? preview;
  const nothingToDo = counts.leadsPurged === 0 && counts.eventsPurged === 0 && counts.placesContentPurged === 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h2 className="text-sm font-semibold text-brand-black mb-3">Retentie</h2>
      <ul className="text-sm text-gray-700 space-y-1 mb-3">
        <li>{counts.leadsPurged} onbenaderde lead(s) ouder dan de bewaartermijn</li>
        <li>{counts.eventsPurged} event(s) ouder dan 30 dagen</li>
        <li>{counts.placesContentPurged} Places-cache-item(s) ouder dan 30 dagen</li>
      </ul>
      {result && <p className="text-xs text-green-700 mb-2">Uitgevoerd.</p>}
      {!confirming ? (
        <button onClick={() => setConfirming(true)} disabled={nothingToDo} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-50">
          Nu uitvoeren
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">Weet je het zeker? Dit verwijdert data permanent.</span>
          <button onClick={run} disabled={running} className="text-xs py-1.5 px-3 bg-red-600 text-white rounded disabled:opacity-50">
            {running ? "Bezig..." : "Bevestigen"}
          </button>
          <button onClick={() => setConfirming(false)} className="text-xs text-gray-500 hover:underline">
            Annuleren
          </button>
        </div>
      )}
    </div>
  );
}
