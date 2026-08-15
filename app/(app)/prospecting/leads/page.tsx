import Link from 'next/link'
import type { Metadata } from 'next'

import { EmptyState } from '@/components/ui/EmptyState'
import { Pill } from '@/components/ui/Pill'
import { LeadFilters } from '@/components/prospecting/LeadFilters'
import { DEFAULT_ICP } from '@/lib/leads-agent/config'
import { listProspectLeads, countProspectLeads } from '@/lib/queries/prospecting'
import { prospectLeadStatusMeta, prospectPriorityMeta } from '@/lib/labels'
import { formatDateTime } from '@/lib/format'
import { nl } from '@/lib/nl'
import type { ProspectPriority } from '@/db/schema'

export const metadata: Metadata = { title: 'Prospectie — Leads' }
export const dynamic = 'force-dynamic'

export default async function ProspectingLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ priority?: string; sector?: string; minScore?: string; hasEmail?: string }>
}) {
  const sp = await searchParams
  const priority = (['A', 'B', 'C'] as ProspectPriority[]).includes(sp.priority as ProspectPriority)
    ? (sp.priority as ProspectPriority)
    : undefined
  const minScore = sp.minScore ? Number(sp.minScore) : undefined

  const [rows, totalCount] = await Promise.all([
    listProspectLeads({ priority, sector: sp.sector || undefined, minScore, hasEmail: sp.hasEmail === '1' }),
    countProspectLeads(),
  ])

  return (
    <div className="space-y-6">
      <LeadFilters sectors={DEFAULT_ICP.sectors} />

      {rows.length === 0 ? (
        <EmptyState hint={totalCount === 0 ? nl.prospecting.leads.empty : nl.prospecting.leads.noResults} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[900px] border-collapse text-body-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                {[
                  nl.prospecting.leads.priority,
                  nl.prospecting.leads.score,
                  nl.prospecting.leads.company,
                  nl.prospecting.leads.city,
                  nl.prospecting.leads.sector,
                  nl.prospecting.leads.painPoint,
                  nl.prospecting.leads.channel,
                  nl.prospecting.leads.status,
                  nl.prospecting.leads.lastSeen,
                ].map((h) => (
                  <th key={h} scope="col" className="px-4 py-3 text-left font-mono text-label uppercase tracking-label text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const statusMeta = prospectLeadStatusMeta[row.status]
                const priorityMeta = row.priority ? prospectPriorityMeta[row.priority] : null
                return (
                  <tr key={row.id} className="border-b border-border last:border-0 transition-colors duration-fast hover:bg-surface">
                    <td className="px-4 py-3">{priorityMeta ? <Pill tone={priorityMeta.tone}>{priorityMeta.label}</Pill> : '—'}</td>
                    <td className="px-4 py-3 font-mono text-foreground">{row.totalScore ?? 0}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/prospecting/leads/${row.id}`}
                        className="text-foreground underline-offset-4 transition-colors duration-fast hover:text-flame hover:underline"
                      >
                        {row.company || row.name || '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">{row.city || '—'}</td>
                    <td className="px-4 py-3 text-muted">{row.sector || '—'}</td>
                    <td className="px-4 py-3 text-muted">{row.recommendedOffer || '—'}</td>
                    <td className="px-4 py-3 text-muted">{row.recommendedChannel || '—'}</td>
                    <td className="px-4 py-3">
                      <Pill tone={statusMeta.tone}>{statusMeta.label}</Pill>
                    </td>
                    <td className="px-4 py-3 text-muted">{row.lastSeenAt ? formatDateTime(row.lastSeenAt) : '—'}</td>
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
