import type { Tone } from '@/components/ui/Pill'
import type {
  ConversationOutcome,
  ConversationSentiment,
  DeviceType,
  EscalationStatus,
  LeadStatus,
  ProspectLeadStatus,
  ProspectPriority,
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

export const leadStatusMeta: Record<LeadStatus, { label: string; tone: Tone }> = {
  new: { label: nl.websiteLeads.status.new, tone: 'accent' },
  contacted: { label: nl.websiteLeads.status.contacted, tone: 'warning' },
  booked: { label: nl.websiteLeads.status.booked, tone: 'brand' },
  won: { label: nl.websiteLeads.status.won, tone: 'success' },
  lost: { label: nl.websiteLeads.status.lost, tone: 'neutral' },
}

export const deviceTypeLabel: Record<DeviceType, string> = {
  mobile: nl.analytics.deviceType.mobile,
  tablet: nl.analytics.deviceType.tablet,
  desktop: nl.analytics.deviceType.desktop,
}

export const prospectLeadStatusMeta: Record<ProspectLeadStatus, { label: string; tone: Tone }> = {
  new: { label: nl.prospecting.status.new, tone: 'neutral' },
  contacted: { label: nl.prospecting.status.contacted, tone: 'warning' },
  qualified: { label: nl.prospecting.status.qualified, tone: 'accent' },
  packed: { label: nl.prospecting.status.packed, tone: 'brand' },
  replied: { label: nl.prospecting.status.replied, tone: 'success' },
  won: { label: nl.prospecting.status.won, tone: 'success' },
  lost: { label: nl.prospecting.status.lost, tone: 'neutral' },
  suppressed: { label: nl.prospecting.status.suppressed, tone: 'danger' },
}

export const prospectPriorityMeta: Record<ProspectPriority, { label: string; tone: Tone }> = {
  A: { label: 'A', tone: 'danger' },
  B: { label: 'B', tone: 'warning' },
  C: { label: 'C', tone: 'neutral' },
}

export const prospectRiskLevelMeta: Record<'laag' | 'verhoogd' | 'hoog', { label: string; tone: Tone }> = {
  laag: { label: nl.prospecting.risk.levelLow, tone: 'success' },
  verhoogd: { label: nl.prospecting.risk.levelElevated, tone: 'warning' },
  hoog: { label: nl.prospecting.risk.levelHigh, tone: 'danger' },
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
