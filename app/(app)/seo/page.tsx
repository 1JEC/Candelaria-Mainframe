import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pill } from '@/components/ui/Pill'
import { WebsiteUrlForm } from '@/components/seo/WebsiteUrlForm'
import { RunAuditButton } from '@/components/seo/RunAuditButton'
import { getOrgWebsite, getLatestSeoAudit } from '@/lib/queries/seo'
import { formatDateTime } from '@/lib/format'
import { nl } from '@/lib/nl'
import { requireModule } from '@/lib/session'

export const dynamic = 'force-dynamic'

function Check({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2 last:border-0">
      <div>
        <p className="text-body-sm text-foreground">{label}</p>
        {detail && <p className="text-caption text-muted">{detail}</p>}
      </div>
      <Pill tone={ok ? 'success' : 'danger'}>{ok ? 'OK' : 'Aandacht'}</Pill>
    </div>
  )
}

export default async function SeoPage() {
  const user = await requireModule('seo')
  const [websiteUrl, latestAudit] = await Promise.all([getOrgWebsite(user.orgId), getLatestSeoAudit(user.orgId)])

  return (
    <>
      <PageHeader title={nl.modules.seo.title} subtitle={nl.modules.seo.subtitle} />

      <div className="mt-8 space-y-6">
        <div className="card">
          <WebsiteUrlForm initialUrl={websiteUrl} />
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <p className="label">Technische audit</p>
            <RunAuditButton hasWebsite={Boolean(websiteUrl)} />
          </div>

          {!latestAudit ? (
            <EmptyState className="mt-4" hint={websiteUrl ? 'Nog geen audit uitgevoerd — klik op "Audit uitvoeren".' : 'Stel eerst een website-URL in.'} />
          ) : (
            <div className="mt-4 space-y-1">
              <p className="mb-2 text-caption text-muted">Laatste audit: {formatDateTime(latestAudit.createdAt)}</p>
              <Check label="HTTPS geldig" ok={latestAudit.raw.httpsValid} />
              <Check label="Mobielvriendelijk (viewport)" ok={latestAudit.raw.mobileViewport} />
              <Check label="Title-tag aanwezig" ok={latestAudit.raw.titlePresent} detail={latestAudit.raw.titlePresent ? `${latestAudit.raw.titleLength} tekens` : undefined} />
              <Check label="Meta description aanwezig" ok={latestAudit.raw.metaDescriptionPresent} detail={latestAudit.raw.metaDescriptionPresent ? `${latestAudit.raw.metaDescriptionLength} tekens` : undefined} />
              <Check label="H1 aanwezig" ok={latestAudit.raw.h1Present} detail={`${latestAudit.raw.h1Count} gevonden`} />
              <Check label="HTML lang-attribuut" ok={latestAudit.raw.htmlLangPresent} />
              <Check label="Analytics gedetecteerd" ok={latestAudit.raw.analyticsDetected.length > 0} detail={latestAudit.raw.analyticsDetected.join(', ') || undefined} />
              <Check label="Schema.org structured data" ok={latestAudit.raw.schemaOrgTypes.length > 0} detail={latestAudit.raw.schemaOrgTypes.join(', ') || undefined} />
              <Check label="Contactformulier" ok={latestAudit.raw.hasContactForm} />
              <Check label="Afbeeldingen met alt-tekst" ok={latestAudit.raw.imagesWithoutAlt === 0} detail={`${latestAudit.raw.imagesWithoutAlt} van ${latestAudit.raw.imageCount} zonder alt-tekst`} />
              <Check label="Geen kapotte links" ok={latestAudit.raw.brokenLinksSample.length === 0} detail={latestAudit.raw.brokenLinksSample.length > 0 ? `${latestAudit.raw.brokenLinksSample.length} kapotte link(s) gevonden` : undefined} />
              {latestAudit.raw.platform && (
                <p className="mt-3 text-caption text-muted">
                  Platform: {latestAudit.raw.platform}
                  {latestAudit.raw.outdatedMarker ? ` — mogelijk verouderd: ${latestAudit.raw.outdatedMarker}` : ''}
                </p>
              )}
              {latestAudit.raw.loadTimeMs !== null && <p className="text-caption text-muted">Laadtijd: {latestAudit.raw.loadTimeMs}ms</p>}
              {latestAudit.raw.psi && (
                <p className="text-caption text-muted">
                  PageSpeed: prestaties {latestAudit.raw.psi.performanceScore ?? '—'}, SEO {latestAudit.raw.psi.seoScore ?? '—'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
