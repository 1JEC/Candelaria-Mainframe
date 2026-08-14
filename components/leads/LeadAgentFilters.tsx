"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const ALL_FILTER_KEYS = ["q", "status", "priority", "sector", "city", "scoreMin", "hasEmail"];

export default function LeadAgentFilters(props: { sectors: string[]; cities: string[] }) {
  return (
    <Suspense fallback={<div className="mb-4 h-10" />}>
      <LeadAgentFiltersInner {...props} />
    </Suspense>
  );
}

function LeadAgentFiltersInner({ sectors, cities }: { sectors: string[]; cities: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function clearAll() {
    router.push(pathname);
  }

  const active = ALL_FILTER_KEYS.map((key) => ({ key, value: searchParams.get(key) })).filter((f) => f.value);

  return (
    <div className="mb-4 space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <select
          defaultValue={searchParams.get("priority") || ""}
          onChange={(e) => updateParam("priority", e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
        >
          <option value="">Alle prioriteiten</option>
          <option value="A">Prioriteit A</option>
          <option value="B">Prioriteit B</option>
          <option value="C">Prioriteit C</option>
        </select>

        <select
          defaultValue={searchParams.get("sector") || ""}
          onChange={(e) => updateParam("sector", e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
        >
          <option value="">Alle sectoren</option>
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          defaultValue={searchParams.get("city") || ""}
          onChange={(e) => updateParam("city", e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
        >
          <option value="">Alle plaatsen</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <input
          type="number"
          min={0}
          max={100}
          placeholder="Min. score"
          defaultValue={searchParams.get("scoreMin") || ""}
          onBlur={(e) => updateParam("scoreMin", e.target.value)}
          className="w-28 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
        />

        <label className="flex items-center gap-2 text-sm text-gray-700 min-h-11">
          <input
            type="checkbox"
            defaultChecked={searchParams.get("hasEmail") === "1"}
            onChange={(e) => updateParam("hasEmail", e.target.checked ? "1" : "")}
            className="w-4 h-4"
          />
          Alleen met e-mail
        </label>
      </div>

      {active.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {active.map((f) => (
            <button
              key={f.key}
              onClick={() => updateParam(f.key, "")}
              className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs text-gray-700"
            >
              {f.key}: {f.value} <span className="text-gray-500">×</span>
            </button>
          ))}
          <button onClick={clearAll} className="text-xs text-brand-green hover:underline">
            Wis alles
          </button>
        </div>
      )}
    </div>
  );
}
