import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { Pill } from '@/components/ui/Pill'
import { LeadNotesForm } from '@/components/prospecting/LeadNotesForm'
import { ForgetLeadButton } from '@/components/prospecting/ForgetLeadButton'
import { getProspectLead } from '@/lib/queries/prospecting'
import { prospectLeadStatusMeta, prospectPriorityMeta, prospectRiskLevelMeta } from '@/lib/labels'
import { formatDateTime } from '@/lib/format'
import { nl } from '@/lib/nl'

interface RiskFactor {
  code: string
  labelNl: string
  evidence: string
  sourceUrl: string
  points: number
  axis: 'business' | 'engagement'
  category: string
}

function riskFactorsAndUnknowns(riskJson: unknown): { factors: RiskFactor[]; unknowns: string[] } {
  if (riskJson && typeof riskJson === 'object' && 'factors' in riskJson) {
    const value = riskJson as { factors?: unknown; unknowns?: unknown }
    return {
      factors: Array.isArray(value.factors) ? (value.factors as RiskFactor[]) : [],
      unknowns: Array.isArray(value.unknowns) ? (value.unknowns as string[]) : [],
    }
  }
  return { factors: [], unknowns: [] }
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ leadId: string }> }): Promise<Metadata> {
  const { leadId } = await params
  const lead = await getProspectLead(leadId)
  return { title: lead ? `Prospectie — ${lead.company ?? lead.name ?? 'Lead'}` : 'Prospectie — Lead' }
}

export default async function ProspectingLeadDetailPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params
  const lead = await getProspectLead(leadId)
  if (!lead) notFound()

  const statusMeta = prospectLeadStatusMeta[lead.status]
  const priorityMeta = lead.priority ? prospectPriorityMeta[lead.priority] : null

  return (
    <div className="space-y-8">
      <div>
        <Link href="/prospecting/leads" className="text-caption text-muted hover:text-foreground hover:underline">
          ← {nl.prospecting.leads.backToList}
        </Link>
        <div className="mt-3 flex items-center justify-between">
          <h1 className="display text-h1 text-foreground">{lead.company || lead.name || '—'}</h1>
          <ForgetLeadButton leadId={lead.id} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Pill tone={statusMeta.tone}>{statusMeta.label}</Pill>
          {priorityMeta && <Pill tone={priorityMeta.tone}>Prioriteit {priorityMeta.label}</Pill>}
          <span className="font-mono text-caption text-muted">Score {lead.totalScore ?? 0} (fit {lead.fitScore ?? 0} / pain {lead.painScore ?? 0})</span>
          {lead.businessRisk && (
            <Pill tone={prospectRiskLevelMeta[lead.businessRisk].tone}>
              Risico bedrijf: {prospectRiskLevelMeta[lead.businessRisk].label} ({lead.businessRiskScore})
            </Pill>
          )}
          {lead.engagementRisk && (
            <Pill tone={prospectRiskLevelMeta[lead.engagementRisk].tone}>
              Risico samenwerking: {prospectRiskLevelMeta[lead.engagementRisk].label} ({lead.engagementRiskScore})
            </Pill>
          )}
        </div>
      </div>

      <section className="card grid gap-4 sm:grid-cols-2">
        <div>
          <p className="label">{nl.prospecting.leads.city}</p>
          <p className="mt-1 text-body-sm text-foreground">{[lead.street, lead.postcode, lead.city].filter(Boolean).join(', ') || '—'}</p>
        </div>
        <div>
          <p className="label">{nl.prospecting.leads.sector}</p>
          <p className="mt-1 text-body-sm text-foreground">{lead.sector || '—'}</p>
        </div>
        <div>
          <p className="label">Website</p>
          <p className="mt-1 text-body-sm text-foreground">{lead.website || '—'}</p>
        </div>
        <div>
          <p className="label">Contact</p>
          <p className="mt-1 text-body-sm text-foreground">{lead.emailGeneral || lead.email || '—'} {lead.phoneE164 ? `· ${lead.phoneE164}` : ''}</p>
        </div>
        <div>
          <p className="label">KvK</p>
          <p className="mt-1 text-body-sm text-foreground">{lead.kvkNumber || '—'} {lead.legalName ? `· ${lead.legalName}` : ''}</p>
        </div>
        <div>
          <p className="label">{nl.prospecting.leads.lastSeen}</p>
          <p className="mt-1 text-body-sm text-foreground">{lead.lastSeenAt ? formatDateTime(lead.lastSeenAt) : '—'}</p>
        </div>
      </section>

      <section>
        <h2 className="display text-h2 text-foreground">{nl.prospecting.leads.tabEvidence}</h2>
        {lead.signals.length === 0 ? (
          <p className="mt-3 text-body-sm text-muted">Nog geen signalen.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {lead.signals.map((signal) => (
              <div key={signal.id} className="card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-body-sm text-foreground">{signal.labelNl || signal.code}</p>
                    <p className="mt-1 text-caption text-muted">{signal.evidence}</p>
                    {signal.sourceUrl && (
                      <a href={signal.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-caption text-flame hover:underline">
                        Bron →
                      </a>
                    )}
                  </div>
                  <span className="font-mono text-caption text-muted">+{signal.points}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="display text-h2 text-foreground">{nl.prospecting.leads.tabRisk}</h2>
        {!lead.riskAssessedAt ? (
          <p className="mt-3 text-body-sm text-muted">{nl.prospecting.risk.notAssessed}</p>
        ) : (
          (() => {
            const { factors, unknowns } = riskFactorsAndUnknowns(lead.riskJson)
            const businessFactors = factors.filter((f) => f.axis === 'business')
            const engagementFactors = factors.filter((f) => f.axis === 'engagement')
            return (
              <div className="mt-3 space-y-6">
                {lead.riskHeadlineNl && (
                  <div className="card">
                    <p className="text-body-sm text-foreground">{lead.riskHeadlineNl}</p>
                    <p className="mt-1 text-caption text-muted">
                      {nl.prospecting.risk.assessedAt} {formatDateTime(lead.riskAssessedAt)}
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="text-body-sm font-semibold text-foreground">{nl.prospecting.risk.businessTitle}</h3>
                  <p className="mt-1 text-caption text-muted">{nl.prospecting.risk.businessSubtitle}</p>
                  {businessFactors.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {businessFactors.map((f) => (
                        <div key={f.code} className="card">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-body-sm text-foreground">{f.labelNl}</p>
                              <p className="mt-1 text-caption text-muted">{f.evidence}</p>
                              {f.sourceUrl && (
                                <a href={f.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-caption text-flame hover:underline">
                                  Bron →
                                </a>
                              )}
                            </div>
                            <span className="font-mono text-caption text-muted">+{f.points}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-body-sm text-muted">{nl.prospecting.risk.noFactors}</p>
                  )}
                </div>

                <div>
                  <h3 className="text-body-sm font-semibold text-foreground">{nl.prospecting.risk.engagementTitle}</h3>
                  <p className="mt-1 text-caption text-muted">{nl.prospecting.risk.engagementSubtitle}</p>
                  {engagementFactors.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {engagementFactors.map((f) => (
                        <div key={f.code} className="card">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-body-sm text-foreground">{f.labelNl}</p>
                              <p className="mt-1 text-caption text-muted">{f.evidence}</p>
                              {f.sourceUrl && (
                                <a href={f.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-caption text-flame hover:underline">
                                  Bron →
                                </a>
                              )}
                            </div>
                            <span className="font-mono text-caption text-muted">+{f.points}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-body-sm text-muted">{nl.prospecting.risk.noFactors}</p>
                  )}
                </div>

                {unknowns.length > 0 && (
                  <div className="card">
                    <p className="label">{nl.prospecting.risk.unknownsTitle}</p>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-body-sm text-muted">
                      {unknowns.map((u, i) => (
                        <li key={i}>{u}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          })()
        )}
      </section>

      <section>
        <h2 className="display text-h2 text-foreground">{nl.prospecting.leads.tabOutreach}</h2>
        {!lead.pack ? (
          <p className="mt-3 text-body-sm text-muted">Nog geen outreach-pack gegenereerd.</p>
        ) : (
          <div className="mt-3 space-y-4">
            {[
              { label: 'E-mail 1', value: lead.pack.email1 },
              { label: 'E-mail 2', value: lead.pack.email2 },
              { label: 'E-mail 3', value: lead.pack.email3 },
              { label: 'DM-concept', value: lead.pack.dmDraft },
              { label: 'Belscript', value: lead.pack.callScript },
            ]
              .filter((item) => item.value)
              .map((item) => (
                <div key={item.label} className="card">
                  <p className="label">{item.label}</p>
                  <p className="mt-2 whitespace-pre-wrap text-body-sm text-foreground">{item.value}</p>
                </div>
              ))}
            {lead.pack.evidenceMd && (
              <div className="card">
                <p className="label">Bewijs-overzicht</p>
                <p className="mt-2 whitespace-pre-wrap text-body-sm text-foreground">{lead.pack.evidenceMd}</p>
              </div>
            )}
          </div>
        )}
      </section>

      <section>
        <h2 className="display text-h2 text-foreground">Notities</h2>
        <div className="mt-3">
          <LeadNotesForm leadId={lead.id} initialNotes={lead.notes} />
        </div>
      </section>
    </div>
  )
}
