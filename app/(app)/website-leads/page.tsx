import Link from 'next/link'

import { LeadFilters } from '@/components/website-leads/LeadFilters'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pill } from '@/components/ui/Pill'
import type { LeadStatus } from '@/db/schema'
import { formatDateTime } from '@/lib/format'
import { leadStatusMeta } from '@/lib/labels'
import { nl } from '@/lib/nl'
import { isPeriod } from '@/lib/period'
import { listLeads } from '@/lib/queries/website-leads'
import { requireModule } from '@/lib/session'

export const dynamic = 'force-dynamic'

const STATUSES: LeadStatus[] = ['new', 'contacted', 'booked', 'won', 'lost']

export default async function WebsiteLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; period?: string }>
}) {
  await requireModule('website-leads')
  const sp = await searchParams

  const status = STATUSES.includes(sp.status as LeadStatus)
    ? (sp.status as LeadStatus)
    : undefined
  const period = isPeriod(sp.period) ? sp.period : undefined

  const rows = await listLeads({ status, period })

  return (
    <div className="space-y-6">
      <PageHeader
        title={nl.modules['website-leads'].title}
        subtitle={nl.modules['website-leads'].subtitle}
      />

      <LeadFilters />

      {rows.length === 0 ? (
        <EmptyState hint={nl.websiteLeads.empty} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[720px] border-collapse text-body-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                {[
                  nl.websiteLeads.colDate,
                  nl.websiteLeads.colName,
                  nl.websiteLeads.colEmail,
                  nl.websiteLeads.colCompany,
                  nl.websiteLeads.colStatus,
                  nl.websiteLeads.colCountry,
                  nl.websiteLeads.colSource,
                ].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="px-4 py-3 text-left font-mono text-label uppercase tracking-label text-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const meta = leadStatusMeta[row.status]
                return (
                  <tr
                    key={row.id}
                    className="border-b border-border last:border-0 transition-colors duration-fast hover:bg-surface"
                  >
                    <td className="px-4 py-3 font-mono text-caption text-muted">
                      {formatDateTime(row.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/website-leads/${row.id}`}
                        className="text-foreground underline-offset-4 transition-colors duration-fast hover:text-flame hover:underline"
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">{row.email}</td>
                    <td className="px-4 py-3 text-muted">
                      {row.company || nl.websiteLeads.noCompany}
                    </td>
                    <td className="px-4 py-3">
                      <Pill tone={meta.tone}>{meta.label}</Pill>
                    </td>
                    <td className="px-4 py-3 text-muted">{row.ipCountry || '—'}</td>
                    <td className="px-4 py-3 text-muted">
                      {row.utmSource || nl.websiteLeads.directSource}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
