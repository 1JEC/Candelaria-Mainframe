"use client";

import { useEffect, useRef, useState } from "react";

interface AgentEvent {
  id: number;
  runId: string;
  code: string;
  level: string;
  messageNl: string;
  ts: string;
}

const POLL_INTERVAL_MS = 1500;
const MAX_FEED_LINES = 500;

const LEVEL_STYLES: Record<string, string> = {
  info: "text-gray-700",
  warn: "text-yellow-700",
  error: "text-red-700",
};

export function RunConsole({ sectors, cities }: { sectors: string[]; cities: string[] }) {
  const [city, setCity] = useState(cities[0] ?? "");
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [limit, setLimit] = useState(25);
  const [runId, setRunId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const cursorRef = useRef(0);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [events]);

  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    };
  }, []);

  function toggleSector(sector: string) {
    setSelectedSectors((prev) => (prev.includes(sector) ? prev.filter((s) => s !== sector) : [...prev, sector]));
  }

  async function startRun() {
    setError(null);
    setStarting(true);
    try {
      const res = await fetch("/api/agents/leads/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, sectors: selectedSectors, limit }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Kon run niet starten.");
        setStarting(false);
        return;
      }
      setRunId(data.runId);
      setStatus("running");
      setEvents([]);
      cursorRef.current = 0;
      poll(data.runId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onbekende fout.");
    } finally {
      setStarting(false);
    }
  }

  async function poll(currentRunId: string) {
    try {
      const tickRes = await fetch(`/api/agents/leads/runs/${currentRunId}/tick`, { method: "POST" });
      const tickData = await tickRes.json();
      if (tickRes.ok) {
        setStatus(tickData.status);
      }

      const eventsRes = await fetch(`/api/agents/leads/runs/${currentRunId}/events?after=${cursorRef.current}`);
      const eventsData = await eventsRes.json();
      if (eventsRes.ok && eventsData.events.length > 0) {
        cursorRef.current = eventsData.events[eventsData.events.length - 1].id;
        setEvents((prev) => [...prev, ...eventsData.events].slice(-MAX_FEED_LINES));
      }

      const statusRes = await fetch(`/api/agents/leads/runs/${currentRunId}`);
      const statusData = await statusRes.json();
      if (statusRes.ok) {
        setTaskCounts(statusData.taskCounts ?? {});
        setStatus(statusData.run?.status ?? tickData.status);
      }

      const finalStatus = statusData.run?.status ?? tickData.status;
      if (finalStatus === "running") {
        pollTimeoutRef.current = setTimeout(() => poll(currentRunId), POLL_INTERVAL_MS);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verbinding verloren — opnieuw proberen...");
      pollTimeoutRef.current = setTimeout(() => poll(currentRunId), POLL_INTERVAL_MS * 2);
    }
  }

  async function cancelRun() {
    if (!runId) return;
    await fetch(`/api/agents/leads/runs/${runId}/cancel`, { method: "POST" });
  }

  const isRunning = status === "running";
  const pending = taskCounts["pending"] ?? 0;
  const claimed = taskCounts["claimed"] ?? 0;
  const done = taskCounts["done"] ?? 0;
  const failed = taskCounts["failed"] ?? 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      <h2 className="text-lg font-semibold text-brand-black">Run starten</h2>

      {!isRunning && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plaats</label>
              <select value={city} onChange={(e) => setCity(e.target.value)} className="input-field">
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Maximum aantal per sector</label>
              <input
                type="number"
                min={1}
                max={100}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="input-field"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sectoren</label>
            <div className="flex flex-wrap gap-2">
              {sectors.map((sector) => (
                <button
                  key={sector}
                  type="button"
                  onClick={() => toggleSector(sector)}
                  className={`px-3 py-1.5 min-h-11 rounded-full text-sm border transition-colors ${
                    selectedSectors.includes(sector)
                      ? "bg-brand-green text-white border-brand-green"
                      : "bg-white text-gray-700 border-gray-300 hover:border-brand-green"
                  }`}
                >
                  {sector}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button onClick={startRun} disabled={starting || !city || selectedSectors.length === 0} className="btn-primary disabled:opacity-50">
            {starting ? "Starten..." : "Start"}
          </button>
        </div>
      )}

      {runId && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className={`px-2 py-1 rounded font-semibold ${isRunning ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-700"}`}>
              {status ?? "wachten"}
            </span>
            <span>Wachtend: {pending}</span>
            <span>Bezig: {claimed}</span>
            <span>Klaar: {done}</span>
            {failed > 0 && <span className="text-red-600">Mislukt: {failed}</span>}
            {isRunning && (
              <button onClick={cancelRun} className="btn-secondary text-xs py-1 px-3 ml-auto">
                Stop
              </button>
            )}
          </div>

          <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto font-mono text-xs space-y-1">
            {events.length === 0 && <p className="text-gray-500">Wachten op events...</p>}
            {events.map((event) => (
              <div key={event.id} className={LEVEL_STYLES[event.level] ?? "text-gray-300"}>
                <span className="text-gray-500">{new Date(event.ts).toLocaleTimeString("nl-NL")}</span>{" "}
                <span className="text-gray-400">[{event.code}]</span> <span className={event.level === "info" ? "text-gray-100" : ""}>{event.messageNl}</span>
              </div>
            ))}
            <div ref={feedEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}
