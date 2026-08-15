import type { Metadata } from 'next'

import { Pill } from '@/components/ui/Pill'
import { GoLiveChecklist } from '@/components/prospecting/GoLiveChecklist'
import { runDnsChecks } from '@/lib/leads-agent/health/dns-check'
import { checkDomainAge } from '@/lib/leads-agent/health/domain-age'
import { checkThresholds } from '@/lib/leads-agent/health/thresholds'
import { get30DayStats } from '@/lib/leads-agent/health/chart-data'
import { GOLIVE_CHECKLIST_ITEMS, DEFAULT_GOLIVE_CHECKLIST, getConfig } from '@/lib/leads-agent/config'
import { nl } from '@/lib/nl'

export const metadata: Metadata = { title: 'Prospectie — Health' }
export const dynamic = 'force-dynamic'

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger'> = { green: 'success', amber: 'warning', red: 'danger' }

export default async function ProspectingHealthPage() {
  const outreachDomain = process.env.OUTREACH_DOMAIN

  const [dnsChecks, domainAge, thresholds, chart, checklistConfig] = await Promise.all([
    outreachDomain ? runDnsChecks(outreachDomain) : Promise.resolve(null),
    outreachDomain ? checkDomainAge(outreachDomain).catch(() => null) : Promise.resolve(null),
    checkThresholds(),
    get30DayStats(),
    getConfig<typeof DEFAULT_GOLIVE_CHECKLIST>('golive_checklist'),
  ])

  return (
    <div className="space-y-6">
      <div className="card">
        <p className="label">{nl.prospecting.health.dnsTitle}</p>
        {!outreachDomain ? (
          <p className="mt-3 text-body-sm text-muted">OUTREACH_DOMAIN niet ingesteld — DNS-controle uitgeschakeld.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {domainAge && domainAge.ageDays !== null && (
              <p className="text-body-sm text-foreground">
                Domeinleeftijd: {domainAge.ageDays} dagen {!domainAge.meetsMinimum ? '(onder de 14-dagen-minimum)' : ''}
              </p>
            )}
            {dnsChecks?.map((check) => (
              <div key={check.name} className="flex items-start justify-between gap-4 border-b border-border py-2 last:border-0">
                <div>
                  <p className="text-body-sm text-foreground">{check.name}</p>
                  <p className="text-caption text-muted">{check.detail}</p>
                </div>
                <Pill tone={STATUS_TONE[check.status]}>{check.status}</Pill>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <p className="label">{nl.prospecting.health.thresholdsTitle}</p>
        <div className="mt-3 space-y-2">
          {thresholds.map((warning) => (
            <div key={warning.code} className="flex items-start justify-between gap-4 border-b border-border py-2 last:border-0">
              <p className="text-body-sm text-foreground">{warning.message}</p>
              <Pill tone={STATUS_TONE[warning.status]}>{warning.status}</Pill>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <p className="label">{nl.prospecting.health.chartTitle}</p>
        {chart.length === 0 ? (
          <p className="mt-3 text-body-sm text-muted">Nog geen verzendactiviteit.</p>
        ) : (
          <div className="mt-3 space-y-1">
            {chart.map((day) => (
              <div key={day.date} className="flex items-center justify-between text-caption text-muted">
                <span>{day.date}</span>
                <span className="font-mono text-foreground">
                  {day.sent} verzonden · {day.bounced} bounces · {day.replied} reacties
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <GoLiveChecklist items={GOLIVE_CHECKLIST_ITEMS} initialChecked={checklistConfig.items} />
    </div>
  )
}
