import Link from 'next/link'
import { notFound } from 'next/navigation'

import { LeadStatusControl } from '@/components/website-leads/LeadStatusControl'
import { Pill } from '@/components/ui/Pill'
import { formatDateTime } from '@/lib/format'
import { leadStatusMeta } from '@/lib/labels'
import { nl } from '@/lib/nl'
import { getLead } from '@/lib/queries/website-leads'
import { requireModule } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function WebsiteLeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>
}) {
  await requireModule('website-leads')
  const { leadId } = await params
  const lead = await getLead(leadId)
  if (!lead) notFound()

  const meta = leadStatusMeta[lead.status]

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/website-leads"
          className="text-sm text-flame hover:underline"
        >
          ← {nl.websiteLeads.detail.back}
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="display text-h1 text-foreground">{lead.name}</h1>
          <p className="mt-2 text-body-sm text-muted">
            {nl.websiteLeads.detail.submitted} {formatDateTime(lead.createdAt)}
          </p>
        </div>
        <Pill tone={meta.tone} dot>
          {meta.label}
        </Pill>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card">
            <h2 className="label">{nl.websiteLeads.detail.contact}</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label={nl.websiteLeads.colEmail} value={lead.email} />
              <Field
                label={nl.websiteLeads.detail.phone}
                value={lead.phone || '—'}
              />
              <Field
                label={nl.websiteLeads.colCompany}
                value={lead.company || nl.websiteLeads.noCompany}
              />
              <Field
                label={nl.websiteLeads.detail.website}
                value={lead.websiteUrl || '—'}
              />
            </dl>
            {lead.message && (
              <div className="mt-4">
                <p className="label">{nl.websiteLeads.detail.message}</p>
                <p className="mt-2 whitespace-pre-wrap text-body-sm text-foreground">
                  {lead.message}
                </p>
              </div>
            )}
          </section>

          <section className="card">
            <h2 className="label">{nl.websiteLeads.detail.rawPayload}</h2>
            <pre className="mt-4 overflow-x-auto rounded-md border border-border bg-white/[0.03] p-4 font-mono text-caption text-foreground">
              {JSON.stringify(lead.payload, null, 2)}
            </pre>
          </section>

          <section className="card">
            <h2 className="label">{nl.websiteLeads.detail.journey.title}</h2>
            <p className="mt-2 text-caption text-muted">
              {nl.websiteLeads.detail.journey.subtitle}
            </p>
            {lead.journey.length === 0 ? (
              <p className="mt-4 text-body-sm text-muted">
                {nl.websiteLeads.detail.journey.empty}
              </p>
            ) : (
              <ol className="mt-4 space-y-3">
                {lead.journey.map((step) => (
                  <li
                    key={step.id}
                    className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    <span className="font-mono text-body-sm text-foreground">
                      {step.path}
                    </span>
                    <span className="text-caption text-muted">
                      {step.referrerDomain} · {formatDateTime(step.createdAt)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="card">
            <LeadStatusControl leadId={lead.id} status={lead.status} />
          </section>

          <section className="card">
            <h2 className="label">{nl.websiteLeads.detail.security}</h2>
            <dl className="mt-4 space-y-4">
              <Field
                label={nl.websiteLeads.detail.ipAddress}
                value={lead.ipAddress || '—'}
                mono
              />
              <Field
                label={nl.websiteLeads.detail.location}
                value={[lead.ipCity, lead.ipCountry].filter(Boolean).join(', ') || '—'}
              />
            </dl>
          </section>
        </div>
      </div>
    </div>
  )
}

const Field = ({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) => (
  <div>
    <dt className="label">{label}</dt>
    <dd className={`mt-1 text-body-sm text-foreground ${mono ? 'font-mono' : ''}`}>
      {value}
    </dd>
  </div>
)
