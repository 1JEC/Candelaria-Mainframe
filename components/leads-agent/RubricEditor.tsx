"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { recomputeWithRubric, type PreviewLeadInput } from "@/lib/leads-agent/scoring/rubric-preview";
import type { DEFAULT_RUBRIC } from "@/lib/leads-agent/config";

type Rubric = typeof DEFAULT_RUBRIC;

const FIT_FIELDS: { key: keyof Rubric["fit"]; label: string }[] = [
  { key: "icpSector", label: "Sector past bij ICP" },
  { key: "sizeMatch", label: "Bedrijfsgrootte / team-pagina" },
  { key: "inTargetArea", label: "Binnen doelgebied" },
  { key: "commercialIntent", label: "Commerciële intentie" },
  { key: "activeBusiness", label: "Actief bedrijf" },
  { key: "multiLocation", label: "Meerdere vestigingen" },
];
const PAIN_FIELDS: { key: keyof Rubric["pain"]; label: string }[] = [
  { key: "noWebsite", label: "Geen website" },
  { key: "noHttps", label: "Geen geldige HTTPS" },
  { key: "noMobileViewport", label: "Niet mobielvriendelijk" },
  { key: "slowOrLowPsi", label: "Trage website" },
  { key: "staleContent", label: "Verouderde content" },
  { key: "noContactForm", label: "Geen contactformulier" },
  { key: "brokenWebshop", label: "Kapotte webshop-checkout" },
  { key: "outdatedPlatform", label: "Verouderd platform" },
  { key: "seoBasicsBroken", label: "SEO-basis kapot (title/meta/h1, totaal)" },
  { key: "noAnalytics", label: "Geen analytics" },
  { key: "noChatOrBooking", label: "Geen chat/boeken" },
  { key: "noSchemaOrg", label: "Geen schema.org" },
];

export function RubricEditor({ initialRubric, topLeads }: { initialRubric: Rubric; topLeads: PreviewLeadInput[] }) {
  const [rubric, setRubric] = useState<Rubric>(initialRubric);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  const originalRanking = useMemo(() => recomputeWithRubric(topLeads, initialRubric), [topLeads, initialRubric]);
  const previewRanking = useMemo(() => recomputeWithRubric(topLeads, rubric), [topLeads, rubric]);
  const originalPositions = useMemo(() => new Map(originalRanking.map((r, i) => [r.leadId, i])), [originalRanking]);

  function updateFit(key: keyof Rubric["fit"], value: number) {
    setRubric((prev) => ({ ...prev, fit: { ...prev.fit, [key]: value } }));
    setSaved(false);
  }
  function updatePain(key: keyof Rubric["pain"], value: number) {
    setRubric((prev) => ({ ...prev, pain: { ...prev.pain, [key]: value } }));
    setSaved(false);
  }
  function updateThreshold(key: "minScore" | "priorityA" | "priorityB" | "priorityC" | "minFitToQualify", value: number) {
    setRubric((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/agents/leads/settings/rubric", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rubric),
      });
      setSaved(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-sm font-semibold text-brand-black mb-3">Fit-gewichten (max 40)</h3>
          <div className="space-y-2">
            {FIT_FIELDS.map((f) => (
              <div key={f.key} className="flex items-center justify-between gap-3">
                <label className="text-sm text-gray-700">{f.label}</label>
                <input
                  type="number"
                  min={0}
                  value={rubric.fit[f.key]}
                  onChange={(e) => updateFit(f.key, Number(e.target.value))}
                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-sm font-semibold text-brand-black mb-3">Pain-gewichten (max 60)</h3>
          <div className="space-y-2">
            {PAIN_FIELDS.map((f) => (
              <div key={f.key} className="flex items-center justify-between gap-3">
                <label className="text-sm text-gray-700">{f.label}</label>
                <input
                  type="number"
                  min={0}
                  value={rubric.pain[f.key]}
                  onChange={(e) => updatePain(f.key, Number(e.target.value))}
                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-sm font-semibold text-brand-black mb-3">Drempels</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(["minScore", "priorityA", "priorityB", "priorityC", "minFitToQualify"] as const).map((key) => (
            <div key={key}>
              <label className="block text-xs text-gray-500 mb-1">{key}</label>
              <input
                type="number"
                min={0}
                value={rubric[key]}
                onChange={(e) => updateThreshold(key, Number(e.target.value))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
            </div>
          ))}
        </div>
      </div>

      <button onClick={save} disabled={saving} className="btn-primary disabled:opacity-50">
        {saving ? "Opslaan..." : saved ? "Opgeslagen ✓" : "Opslaan (nieuwe versie)"}
      </button>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-sm font-semibold text-brand-black mb-3">
          Live voorbeeld — herberekening van de huidige top {topLeads.length} met deze gewichten
        </h3>
        {previewRanking.length === 0 ? (
          <p className="text-sm text-gray-500">Nog geen leads met signalen om te herberekenen.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                <th className="py-1.5 pr-2">#</th>
                <th className="py-1.5 pr-2">Bedrijf</th>
                <th className="py-1.5 pr-2">Fit</th>
                <th className="py-1.5 pr-2">Pain</th>
                <th className="py-1.5 pr-2">Totaal</th>
                <th className="py-1.5 pr-2">Prioriteit</th>
                <th className="py-1.5">Verschuiving</th>
              </tr>
            </thead>
            <tbody>
              {previewRanking.map((lead, newIndex) => {
                const oldIndex = originalPositions.get(lead.leadId) ?? newIndex;
                const shift = oldIndex - newIndex;
                return (
                  <tr key={lead.leadId} className="border-b border-gray-100 last:border-0">
                    <td className="py-1.5 pr-2 text-gray-400">{newIndex + 1}</td>
                    <td className="py-1.5 pr-2">{lead.company}</td>
                    <td className="py-1.5 pr-2">{lead.fitScore}</td>
                    <td className="py-1.5 pr-2">{lead.painScore}</td>
                    <td className="py-1.5 pr-2 font-semibold">{lead.totalScore}</td>
                    <td className="py-1.5 pr-2">{lead.priority ?? "—"}</td>
                    <td className="py-1.5">
                      {shift > 0 && <span className="text-green-600">↑{shift}</span>}
                      {shift < 0 && <span className="text-red-600">↓{Math.abs(shift)}</span>}
                      {shift === 0 && <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
