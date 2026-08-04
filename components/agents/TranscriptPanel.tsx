import Link from 'next/link'

import { RatingControl } from '@/components/agents/RatingControl'
import { Pill } from '@/components/ui/Pill'
import { formatDateTime, formatNumber, formatTime } from '@/lib/format'
import { channelLabel, outcomeMeta, sentimentMeta } from '@/lib/labels'
import { nl } from '@/lib/nl'
import type { getConversation } from '@/lib/queries/agents'

type Conversation = NonNullable<Awaited<ReturnType<typeof getConversation>>>

const ROLE_LABEL: Record<string, string> = {
  user: nl.agents.transcript.roleUser,
  assistant: nl.agents.transcript.roleAssistant,
  system: nl.agents.transcript.roleSystem,
}

export const TranscriptPanel = ({
  conversation,
  closeHref,
  canRate,
}: {
  conversation: Conversation
  closeHref: string
  canRate: boolean
}) => {
  const outcome = outcomeMeta[conversation.outcome]
  const sentiment = sentimentMeta[conversation.sentiment]

  return (
    <aside className="card sticky top-6 flex max-h-[calc(100vh-6rem)] flex-col">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="label">{nl.agents.transcript.title}</p>
          <h2 className="display mt-2 text-h2 text-foreground">
            {conversation.topic ?? '—'}
          </h2>
          <p className="mt-1 text-caption text-muted">
            {conversation.agentName} · {channelLabel(conversation.channel)} ·{' '}
            {formatDateTime(conversation.startedAt)}
          </p>
        </div>
        <Link
          href={closeHref}
          scroll={false}
          aria-label={nl.agents.transcript.close}
          className="rounded-full border border-border px-3 py-1.5 text-body-sm text-muted transition-colors duration-fast hover:text-foreground"
        >
          ✕
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Pill tone={outcome.tone}>{outcome.label}</Pill>
        <Pill tone={sentiment.tone}>{sentiment.label}</Pill>
        <Pill tone="neutral">
          {formatNumber(conversation.tokenInput + conversation.tokenOutput)}{' '}
          tokens
        </Pill>
      </div>

      <div className="-mr-2 mt-6 flex-1 space-y-4 overflow-y-auto pr-2">
        {conversation.transcript.length === 0 ? (
          <p className="text-body-sm text-muted">
            {nl.agents.transcript.empty}
          </p>
        ) : (
          conversation.transcript.map((m) => (
            <div
              key={m.id}
              className={m.role === 'user' ? '' : 'flex flex-col items-end'}
            >
              <div
                className={`max-w-[85%] rounded-lg px-4 py-3 ${
                  m.role === 'user'
                    ? 'bg-surface-raised'
                    : 'border border-flame-line bg-flame-soft'
                }`}
              >
                <p className="font-mono text-label uppercase tracking-label text-muted">
                  {ROLE_LABEL[m.role] ?? m.role} · {formatTime(m.createdAt)}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-body-sm text-foreground">
                  {m.content}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6">
        <RatingControl
          conversationId={conversation.id}
          rating={conversation.rating}
          canRate={canRate}
        />
      </div>
    </aside>
  )
}
