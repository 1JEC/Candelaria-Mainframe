import type { Metadata } from 'next'

import { getConfig, listConfigVersions } from '@/lib/leads-agent/config'
import type { DEFAULT_ICP, DEFAULT_RUBRIC, DEFAULT_THRESHOLDS } from '@/lib/leads-agent/config'
import { previewRetentionJob } from '@/lib/leads-agent/retention'
import { getTopLeadsWithSignals } from '@/lib/queries/prospecting'
import { RubricEditor } from '@/components/prospecting/RubricEditor'
import { RetentionPanel } from '@/components/prospecting/RetentionPanel'
import { ConfigVersionHistory } from '@/components/prospecting/ConfigVersionHistory'

export const metadata: Metadata = { title: 'Prospectie — Instellingen' }
export const dynamic = 'force-dynamic'

export default async function ProspectingSettingsPage() {
  const [icp, rubric, thresholds, retentionPreview, rubricVersions, topLeads] = await Promise.all([
    getConfig<typeof DEFAULT_ICP>('icp'),
    getConfig<typeof DEFAULT_RUBRIC>('rubric'),
    getConfig<typeof DEFAULT_THRESHOLDS>('thresholds'),
    previewRetentionJob(),
    listConfigVersions('rubric'),
    getTopLeadsWithSignals(20),
  ])

  return (
    <div className="space-y-6">
      <div className="card">
        <p className="label">ICP</p>
        <p className="mt-2 text-caption text-muted">Bewerken via de config-laag volgt in een volgende iteratie — huidige waarden hieronder.</p>
        <dl className="mt-4 grid grid-cols-1 gap-4 text-body-sm sm:grid-cols-2">
          <div>
            <dt className="text-caption text-muted">Sectoren</dt>
            <dd className="mt-1 text-foreground">{icp.sectors.join(', ')}</dd>
          </div>
          <div>
            <dt className="text-caption text-muted">Bedrijfsgrootte</dt>
            <dd className="mt-1 text-foreground">{icp.sizeMin}–{icp.sizeMax} medewerkers</dd>
          </div>
          <div>
            <dt className="text-caption text-muted">Doelsteden</dt>
            <dd className="mt-1 text-foreground">{icp.cities.join(', ')}</dd>
          </div>
          <div>
            <dt className="text-caption text-muted">Uitgesloten</dt>
            <dd className="mt-1 text-foreground">{icp.disqualifySectors.join(', ')}</dd>
          </div>
        </dl>
      </div>

      <RubricEditor initialRubric={rubric} topLeads={topLeads} />

      <ConfigVersionHistory
        configKey="rubric"
        versions={rubricVersions.map((v) => ({ version: v.version, isActive: v.isActive, createdAt: v.createdAt }))}
      />

      <div className="card">
        <p className="label">Retentie & crawl</p>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-body-sm sm:grid-cols-3">
          <div>
            <dt className="text-caption text-muted">Bewaartermijn</dt>
            <dd className="mt-1 text-foreground">{thresholds.retentionDays} dagen</dd>
          </div>
          <div>
            <dt className="text-caption text-muted">Audit-verval</dt>
            <dd className="mt-1 text-foreground">{thresholds.auditStaleDays} dagen</dd>
          </div>
          <div>
            <dt className="text-caption text-muted">Places-verversing</dt>
            <dd className="mt-1 text-foreground">{thresholds.placesRefreshDays} dagen</dd>
          </div>
        </dl>
      </div>

      <RetentionPanel preview={retentionPreview} />
    </div>
  )
}
