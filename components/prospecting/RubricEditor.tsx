'use client'

import { useMemo, useState, useTransition } from 'react'

import { saveConfigAction } from '@/app/(app)/prospecting/actions'
import { recomputeWithRubric, type PreviewLeadInput } from '@/lib/leads-agent/scoring/rubric-preview'
import type { DEFAULT_RUBRIC } from '@/lib/leads-agent/config'
import { nl } from '@/lib/nl'

type Rubric = typeof DEFAULT_RUBRIC

const FIT_FIELDS: { key: keyof Rubric['fit']; label: string }[] = [
  { key: 'icpSector', label: 'ICP-sector' },
  { key: 'sizeMatch', label: 'Bedrijfsgrootte' },
  { key: 'inTargetArea', label: 'Doelgebied' },
  { key: 'commercialIntent', label: 'Commerciële intentie' },
  { key: 'activeBusiness', label: 'Actief bedrijf' },
  { key: 'multiLocation', label: 'Meerdere locaties' },
]

const PAIN_FIELDS: { key: keyof Rubric['pain']; label: string }[] = [
  { key: 'noWebsite', label: 'Geen website' },
  { key: 'noHttps', label: 'Geen HTTPS' },
  { key: 'noMobileViewport', label: 'Niet mobielvriendelijk' },
  { key: 'slowOrLowPsi', label: 'Traag / lage PSI-score' },
  { key: 'staleContent', label: 'Verouderde content' },
  { key: 'noContactForm', label: 'Geen contactformulier' },
  { key: 'brokenWebshop', label: 'Kapotte webshop' },
  { key: 'outdatedPlatform', label: 'Verouderd platform' },
  { key: 'seoBasicsBroken', label: 'SEO-basis ontbreekt' },
  { key: 'noAnalytics', label: 'Geen analytics' },
  { key: 'noChatOrBooking', label: 'Geen chat/booking' },
  { key: 'noSchemaOrg', label: 'Geen schema.org' },
]

export function RubricEditor({ initialRubric, topLeads }: { initialRubric: Rubric; topLeads: PreviewLeadInput[] }) {
  const [rubric, setRubric] = useState(initialRubric)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [, startTransition] = useTransition()

  const originalRanking = useMemo(() => recomputeWithRubric(topLeads, initialRubric), [topLeads, initialRubric])
  const previewRanking = useMemo(() => recomputeWithRubric(topLeads, rubric), [topLeads, rubric])
  const originalRank = useMemo(() => new Map(originalRanking.map((r, i) => [r.leadId, i])), [originalRanking])

  function setFit(key: keyof Rubric['fit'], value: number) {
    setRubric((r) => ({ ...r, fit: { ...r.fit, [key]: value } }))
    setSaved(false)
  }
  function setPain(key: keyof Rubric['pain'], value: number) {
    setRubric((r) => ({ ...r, pain: { ...r.pain, [key]: value } }))
    setSaved(false)
  }
  function setThreshold(key: 'minScore' | 'priorityA' | 'priorityB' | 'priorityC' | 'minFitToQualify', value: number) {
    setRubric((r) => ({ ...r, [key]: value }))
    setSaved(false)
  }

  function save() {
    setSaving(true)
    startTransition(async () => {
      try {
        await saveConfigAction('rubric', rubric)
        setSaved(true)
      } finally {
        setSaving(false)
      }
    })
  }

  return (
    <div className="card space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <p className="label">Fit-gewichten (max 40)</p>
          <div className="mt-3 space-y-2">
            {FIT_FIELDS.map((f) => (
              <div key={f.key} className="flex items-center justify-between gap-3">
                <span className="text-body-sm text-foreground">{f.label}</span>
                <input
                  type="number"
                  min={0}
                  max={40}
                  value={rubric.fit[f.key]}
                  onChange={(e) => setFit(f.key, Number(e.target.value))}
                  className="field w-20 py-1.5 text-right"
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="label">Pain-gewichten (max 60)</p>
          <div className="mt-3 space-y-2">
            {PAIN_FIELDS.map((f) => (
              <div key={f.key} className="flex items-center justify-between gap-3">
                <span className="text-body-sm text-foreground">{f.label}</span>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={rubric.pain[f.key]}
                  onChange={(e) => setPain(f.key, Number(e.target.value))}
                  className="field w-20 py-1.5 text-right"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <p className="label">Drempelwaarden</p>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {(
            [
              ['minScore', 'Min. score'],
              ['minFitToQualify', 'Min. fit'],
              ['priorityA', 'Prioriteit A'],
              ['priorityB', 'Prioriteit B'],
              ['priorityC', 'Prioriteit C'],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <span className="text-caption text-muted">{label}</span>
              <input
                type="number"
                min={0}
                max={100}
                value={rubric[key]}
                onChange={(e) => setThreshold(key, Number(e.target.value))}
                className="field mt-1 py-1.5"
              />
            </div>
          ))}
        </div>
      </div>

      {topLeads.length > 0 && (
        <div>
          <p className="label">Live herberekening — huidige top {topLeads.length}</p>
          <div className="mt-3 overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[500px] border-collapse text-body-sm">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="px-3 py-2 text-left font-mono text-label uppercase tracking-label text-muted">Bedrijf</th>
                  <th className="px-3 py-2 text-left font-mono text-label uppercase tracking-label text-muted">Score</th>
                  <th className="px-3 py-2 text-left font-mono text-label uppercase tracking-label text-muted">Prioriteit</th>
                  <th className="px-3 py-2 text-left font-mono text-label uppercase tracking-label text-muted">Verschuiving</th>
                </tr>
              </thead>
              <tbody>
                {previewRanking.map((row, i) => {
                  const before = originalRank.get(row.leadId) ?? i
                  const shift = before - i
                  return (
                    <tr key={row.leadId} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-foreground">{row.company}</td>
                      <td className="px-3 py-2 font-mono text-foreground">{row.totalScore}</td>
                      <td className="px-3 py-2 text-muted">{row.priority ?? '—'}</td>
                      <td className="px-3 py-2 font-mono text-caption">
                        {shift > 0 ? <span className="text-moss">↑{shift}</span> : shift < 0 ? <span className="text-flame">↓{Math.abs(shift)}</span> : <span className="text-muted">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={saving} className="btn-primary disabled:opacity-50">
          {saving ? nl.common.loading : nl.common.save}
        </button>
        {saved && <span className="text-caption text-moss">Opgeslagen.</span>}
      </div>
    </div>
  )
}
