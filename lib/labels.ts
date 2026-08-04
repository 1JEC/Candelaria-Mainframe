import type { Tone } from '@/components/ui/Pill'
import type {
  ConversationOutcome,
  ConversationSentiment,
  EscalationStatus,
  RequestPriority,
  RequestStatus,
} from '@/db/schema'
import { nl } from '@/lib/nl'

/**
 * One place that maps a database enum to its Dutch label and its semantic tone.
 * Components read from here so a status can never be styled two different ways
 * on two different pages.
 */

export const agentStatusMeta: Record<string, { label: string; tone: Tone }> = {
  active: { label: nl.agents.status.active, tone: 'success' },
  paused: { label: nl.agents.status.paused, tone: 'neutral' },
  error: { label: nl.agents.status.error, tone: 'danger' },
}

export const agentTypeLabel: Record<string, string> = {
  chat: nl.agents.type.chat,
  voice: nl.agents.type.voice,
  email: nl.agents.type.email,
  internal: nl.agents.type.internal,
}

export const outcomeMeta: Record<
  ConversationOutcome,
  { label: string; tone: Tone }
> = {
  resolved: { label: nl.agents.outcome.resolved, tone: 'success' },
  escalated: { label: nl.agents.outcome.escalated, tone: 'warning' },
  abandoned: { label: nl.agents.outcome.abandoned, tone: 'neutral' },
}

export const sentimentMeta: Record<
  ConversationSentiment,
  { label: string; tone: Tone }
> = {
  positive: { label: nl.agents.sentiment.positive, tone: 'success' },
  neutral: { label: nl.agents.sentiment.neutral, tone: 'neutral' },
  negative: { label: nl.agents.sentiment.negative, tone: 'danger' },
}

export const escalationStatusMeta: Record<
  EscalationStatus,
  { label: string; tone: Tone }
> = {
  open: { label: nl.agents.escalations.statusOpen, tone: 'danger' },
  in_progress: {
    label: nl.agents.escalations.statusInProgress,
    tone: 'warning',
  },
  done: { label: nl.agents.escalations.statusDone, tone: 'success' },
}

export const requestStatusMeta: Record<
  RequestStatus,
  { label: string; tone: Tone }
> = {
  nieuw: { label: nl.requests.status.nieuw, tone: 'accent' },
  in_behandeling: { label: nl.requests.status.in_behandeling, tone: 'warning' },
  afgerond: { label: nl.requests.status.afgerond, tone: 'success' },
  afgewezen: { label: nl.requests.status.afgewezen, tone: 'neutral' },
}

export const requestPriorityMeta: Record<
  RequestPriority,
  { label: string; tone: Tone }
> = {
  laag: { label: nl.requests.priority.laag, tone: 'neutral' },
  normaal: { label: nl.requests.priority.normaal, tone: 'neutral' },
  hoog: { label: nl.requests.priority.hoog, tone: 'warning' },
  urgent: { label: nl.requests.priority.urgent, tone: 'danger' },
}

/** Channels arrive as free text from ingest, so this falls back to the raw value. */
export function channelLabel(channel: string): string {
  const map: Record<string, string> = {
    web: 'Web',
    whatsapp: 'WhatsApp',
    email: 'E-mail',
    phone: 'Telefoon',
  }
  return map[channel] ?? channel
}
