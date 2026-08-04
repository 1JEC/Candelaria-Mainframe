import { DailyVisitorsChart } from '@/components/analytics/DailyVisitorsChart'
import { LiveVisitors } from '@/components/analytics/LiveVisitors'
import { PeriodSelector } from '@/components/analytics/PeriodSelector'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { formatNumber, formatPercent } from '@/lib/format'
import { deviceTypeLabel } from '@/lib/labels'
import { nl } from '@/lib/nl'
import { isPeriod, type Period } from '@/lib/period'
import {
  getBrowserBreakdown,
  getCityBreakdown,
  getCountryBreakdown,
  getDailyVisitors,
  getDeviceBreakdown,
  getKpis,
  getLiveVisitorCount,
  getOsBreakdown,
  getReferrerBreakdown,
  getTopPages,
  getUtmBreakdown,
} from '@/lib/queries/analytics'
import { requireModule } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  await requireModule('analytics')
  const sp = await searchParams
  const period: Period = isPeriod(sp.period) ? sp.period : '30d'

  const [
    kpis,
    daily,
    countries,
    cities,
    referrers,
    utm,
    devices,
    browsers,
    os,
    topPages,
    live,
  ] = await Promise.all([
    getKpis(period),
    getDailyVisitors(period),
    getCountryBreakdown(period),
    getCityBreakdown(period),
    getReferrerBreakdown(period),
    getUtmBreakdown(period),
    getDeviceBreakdown(period),
    getBrowserBreakdown(period),
    getOsBreakdown(period),
    getTopPages(period),
    getLiveVisitorCount(),
  ])

  const hasData = kpis.pageviews > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title={nl.modules.analytics.title}
          subtitle={nl.modules.analytics.subtitle}
        />
        <PeriodSelector current={period} />
      </div>

      {!hasData ? (
        <EmptyState hint={nl.analytics.empty} />
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-6">
            <KpiCard label={nl.analytics.kpi.pageviews} value={formatNumber(kpis.pageviews)} />
            <KpiCard label={nl.analytics.kpi.visitors} value={formatNumber(kpis.visitors)} />
            <KpiCard label={nl.analytics.kpi.sessions} value={formatNumber(kpis.sessions)} />
            <KpiCard
              label={nl.analytics.kpi.pagesPerSession}
              value={kpis.pagesPerSession.toFixed(1)}
            />
            <KpiCard
              label={nl.analytics.kpi.bounceRate}
              value={formatPercent(kpis.bounceRate)}
            />
            <KpiCard
              label={nl.analytics.kpi.conversionRate}
              value={formatPercent(kpis.conversionRate)}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="card lg:col-span-2">
              <h2 className="label">{nl.analytics.dailyVisitors}</h2>
              <div className="mt-4">
                <DailyVisitorsChart data={daily} />
              </div>
            </div>
            <LiveVisitors initial={live} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card">
              <h2 className="label">{nl.analytics.location.title}</h2>
              <p className="mt-1 text-caption text-muted">{nl.analytics.location.byCountry}</p>
              <BreakdownTable
                rows={countries.map((c) => ({
                  label: c.country || '—',
                  n: c.n,
                }))}
                total={kpis.pageviews}
              />
            </div>

            <div className="card">
              <p className="label">{nl.analytics.location.byCity}</p>
              <BreakdownTable
                rows={cities.map((c) => ({
                  label: [c.city, c.country].filter(Boolean).join(', ') || '—',
                  n: c.n,
                }))}
                total={kpis.pageviews}
              />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card">
              <h2 className="label">{nl.analytics.sources.title}</h2>
              <p className="mt-1 text-caption text-muted">{nl.analytics.sources.referrers}</p>
              <BreakdownTable
                rows={referrers.map((r) => ({ label: r.referrerDomain || '—', n: r.n }))}
                total={kpis.pageviews}
              />
            </div>

            <div className="card">
              <p className="label">{nl.analytics.sources.utm}</p>
              {utm.length === 0 ? (
                <p className="mt-4 text-body-sm text-muted">{nl.common.empty}</p>
              ) : (
                <BreakdownTable
                  rows={utm.map((u) => ({
                    label: [u.utmSource, u.utmMedium, u.utmCampaign].filter(Boolean).join(' / '),
                    n: u.n,
                  }))}
                  total={kpis.pageviews}
                />
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="card">
              <h2 className="label">{nl.analytics.tech.device}</h2>
              <BreakdownTable
                rows={devices.map((d) => ({
                  label: d.deviceType ? deviceTypeLabel[d.deviceType] : '—',
                  n: d.n,
                }))}
                total={kpis.pageviews}
              />
            </div>
            <div className="card">
              <h2 className="label">{nl.analytics.tech.browser}</h2>
              <BreakdownTable
                rows={browsers.map((b) => ({ label: b.browser || '—', n: b.n }))}
                total={kpis.pageviews}
              />
            </div>
            <div className="card">
              <h2 className="label">{nl.analytics.tech.os}</h2>
              <BreakdownTable
                rows={os.map((o) => ({ label: o.os || '—', n: o.n }))}
                total={kpis.pageviews}
              />
            </div>
          </div>

          <div className="card">
            <h2 className="label">{nl.analytics.topPages.title}</h2>
            <div className="mt-4 overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[480px] border-collapse text-body-sm">
                <thead>
                  <tr className="border-b border-border bg-surface">
                    <th className="px-4 py-3 text-left font-mono text-label uppercase tracking-label text-muted">
                      {nl.analytics.topPages.colPath}
                    </th>
                    <th className="px-4 py-3 text-right font-mono text-label uppercase tracking-label text-muted">
                      {nl.analytics.topPages.colViews}
                    </th>
                    <th className="px-4 py-3 text-right font-mono text-label uppercase tracking-label text-muted">
                      {nl.analytics.topPages.colVisitors}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topPages.map((p) => (
                    <tr key={p.path} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-mono text-foreground">{p.path}</td>
                      <td className="px-4 py-3 text-right text-muted">{formatNumber(p.views)}</td>
                      <td className="px-4 py-3 text-right text-muted">{formatNumber(p.visitors)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="card">
        <h2 className="label">{nl.analytics.export.button}</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href={`/api/analytics/export?type=pageviews&period=${period}`}
            className="btn-ghost"
          >
            {nl.analytics.export.pageviews}
          </a>
          <a href={`/api/analytics/export?type=leads&period=${period}`} className="btn-ghost">
            {nl.analytics.export.leads}
          </a>
        </div>
      </div>
    </div>
  )
}

const KpiCard = ({ label, value }: { label: string; value: string }) => (
  <div className="card">
    <p className="label">{label}</p>
    <p className="display mt-4 text-kpi text-foreground">{value}</p>
  </div>
)

const BreakdownTable = ({
  rows,
  total,
}: {
  rows: { label: string; n: number }[]
  total: number
}) => {
  if (rows.length === 0) {
    return <p className="mt-4 text-body-sm text-muted">{nl.common.empty}</p>
  }
  const max = Math.max(...rows.map((r) => r.n), 1)

  return (
    <ul className="mt-4 space-y-3">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-center justify-between gap-3 text-body-sm">
            <span className="text-foreground">{row.label}</span>
            <span className="font-mono text-caption text-muted">
              {formatNumber(row.n)} · {total > 0 ? formatPercent(row.n / total) : '—'}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
            <div
              className="h-full rounded-full bg-flame"
              style={{ width: `${(row.n / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
