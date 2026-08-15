import type { Metadata } from 'next'

import { Pill } from '@/components/ui/Pill'
import { EmptyState } from '@/components/ui/EmptyState'
import { HaltSwitch } from '@/components/prospecting/HaltSwitch'
import { getConfig, DEFAULT_OUTBOUND_HALT } from '@/lib/leads-agent/config'
import { listMailboxes, listOutboxQueue, listReplies, listSendLog } from '@/lib/queries/prospecting'
import { formatDateTime } from '@/lib/format'
import { nl } from '@/lib/nl'

export const metadata: Metadata = { title: 'Prospectie — Outbound' }
export const dynamic = 'force-dynamic'

const MAILBOX_HEALTH_TONE: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  green: 'success',
  amber: 'warning',
  red: 'danger',
  unknown: 'neutral',
}

export default async function ProspectingOutboundPage() {
  const [halt, mailboxes, queue, replies, sendLog] = await Promise.all([
    getConfig<typeof DEFAULT_OUTBOUND_HALT>('outbound_halt'),
    listMailboxes(),
    listOutboxQueue(),
    listReplies(),
    listSendLog(),
  ])

  const outboundLive = process.env.OUTBOUND_ENABLED === 'true' && process.env.OUTBOUND_MODE === 'live'

  return (
    <div className="space-y-6">
      <div className="card flex items-center justify-between">
        <p className={`text-body-sm ${outboundLive ? 'text-flame' : 'text-muted'}`}>
          {outboundLive ? nl.prospecting.outbound.liveBanner : nl.prospecting.outbound.dryRunBanner}
        </p>
        <HaltSwitch halted={halt.halted} />
      </div>

      <div className="card">
        <p className="label">{nl.prospecting.outbound.mailboxes}</p>
        {mailboxes.length === 0 ? (
          <EmptyState className="mt-3" />
        ) : (
          <div className="mt-3 space-y-2">
            {mailboxes.map((m) => (
              <div key={m.id} className="flex items-center justify-between border-b border-border py-2 last:border-0">
                <div>
                  <p className="text-body-sm text-foreground">{m.address}</p>
                  <p className="text-caption text-muted">
                    {m.sentToday ?? 0}/{m.dailyCap ?? 20} vandaag verzonden
                    {m.lastError ? ` · ${m.lastError}` : ''}
                  </p>
                </div>
                <Pill tone={MAILBOX_HEALTH_TONE[m.health] ?? 'neutral'}>{m.health}</Pill>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <p className="label">{nl.prospecting.outbound.queue}</p>
        {queue.length === 0 ? (
          <EmptyState className="mt-3" />
        ) : (
          <div className="mt-3 space-y-2">
            {queue.map((item) => (
              <div key={item.id} className="flex items-center justify-between border-b border-border py-2 last:border-0 text-body-sm">
                <span className="text-foreground">
                  {item.leadCompany || '—'} · {item.channel}
                </span>
                <span className="text-caption text-muted">
                  {item.sentAt ? `Verzonden ${formatDateTime(item.sentAt)}` : `In wachtrij sinds ${formatDateTime(item.createdAt)}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <p className="label">{nl.prospecting.outbound.replies}</p>
        {replies.length === 0 ? (
          <EmptyState className="mt-3" />
        ) : (
          <div className="mt-3 space-y-3">
            {replies.map((r) => (
              <div key={r.id} className="border-b border-border pb-3 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="text-body-sm text-foreground">{r.leadCompany || '—'}</span>
                  {r.classification && <Pill tone={r.classification === 'positive' ? 'success' : r.classification === 'negative' || r.classification === 'optout' ? 'danger' : 'neutral'}>{r.classification}</Pill>}
                </div>
                <p className="mt-1 text-caption text-muted">{formatDateTime(r.receivedAt)}</p>
                {r.prepBrief && <p className="mt-2 text-body-sm text-foreground">{r.prepBrief}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <p className="label">{nl.prospecting.outbound.sendLog}</p>
        {sendLog.length === 0 ? (
          <EmptyState className="mt-3" />
        ) : (
          <div className="mt-3 space-y-2">
            {sendLog.map((row) => (
              <div key={row.id} className="flex items-center justify-between border-b border-border py-2 last:border-0 text-body-sm">
                <span className="text-foreground">{row.leadCompany || '—'}</span>
                <span className="text-caption text-muted">
                  {row.result}
                  {row.reason ? ` · ${row.reason}` : ''} · {formatDateTime(row.ts)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
