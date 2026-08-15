import type { Metadata } from 'next'

import { runDoctorChecks } from '@/lib/leads-agent/doctor'
import { DEFAULT_ICP } from '@/lib/leads-agent/config'
import { getActiveRun, getRecentRuns } from '@/lib/queries/prospecting'
import { ConsoleRunForm } from '@/components/prospecting/ConsoleRunForm'
import { formatDateTime } from '@/lib/format'
import { nl } from '@/lib/nl'

export const metadata: Metadata = { title: 'Prospectie — Console' }
export const dynamic = 'force-dynamic'

const STATUS_TONE: Record<string, string> = {
  green: 'text-moss',
  amber: 'text-gold',
  red: 'text-flame',
}

export default async function ProspectingConsolePage() {
  const [report, activeRun, recentRuns] = await Promise.all([runDoctorChecks(), getActiveRun(), getRecentRuns()])

  return (
    <div className="space-y-6">
      <ConsoleRunForm
        sectors={DEFAULT_ICP.sectors}
        cities={DEFAULT_ICP.cities}
        initialRunId={activeRun?.id ?? null}
        initialStatus={activeRun?.status ?? null}
      />

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="display text-h2 text-foreground">Systeemstatus</h2>
          <span className={`font-mono text-label uppercase tracking-label ${STATUS_TONE[report.overall]}`}>
            {report.overall === 'green' ? 'OK' : report.overall === 'amber' ? 'Let op' : 'Probleem'}
          </span>
        </div>
        <div className="space-y-2">
          {report.checks.map((check) => (
            <div key={check.name} className="flex items-start gap-3 border-b border-border py-2 last:border-0">
              <span
                className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                  check.status === 'green' ? 'bg-moss' : check.status === 'amber' ? 'bg-gold' : 'bg-flame'
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-body-sm text-foreground">{check.name}</p>
                <p className="text-caption text-muted">{check.detail}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-caption text-muted">Laatst gecontroleerd: {formatDateTime(new Date(report.checkedAt))}</p>
      </div>

      {recentRuns.length > 0 && (
        <div className="card">
          <h2 className="display text-h2 text-foreground">{nl.prospecting.console.recentRuns}</h2>
          <div className="mt-4 space-y-2">
            {recentRuns.map((run) => (
              <div key={run.id} className="flex items-center justify-between border-b border-border py-2 last:border-0">
                <span className="text-body-sm text-foreground">{run.label}</span>
                <span className="text-caption text-muted">
                  {run.status} — {formatDateTime(run.startedAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
