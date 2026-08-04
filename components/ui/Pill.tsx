import type { ReactNode } from 'react'

/**
 * Semantic tones only — components never pick a raw colour. Adding a tone here
 * is the single place a new status colour may be introduced.
 */
export type Tone =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'accent'
  | 'brand'

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'border-border bg-surface-raised text-muted',
  success: 'border-moss/35 bg-moss-soft text-moss',
  warning: 'border-gold-line bg-gold-soft text-gold',
  danger: 'border-flame-line bg-flame-soft text-flame',
  accent: 'border-flame-line bg-flame-soft text-flame',
  brand: 'border-gold-line bg-gold-soft text-gold-light',
}

const DOT_CLASS: Record<Tone, string> = {
  neutral: 'bg-muted',
  success: 'bg-moss',
  warning: 'bg-gold',
  danger: 'bg-flame',
  accent: 'bg-flame',
  brand: 'bg-gold',
}

export const Pill = ({
  tone = 'neutral',
  dot = false,
  children,
}: {
  tone?: Tone
  dot?: boolean
  children: ReactNode
}) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-label uppercase tracking-label ${TONE_CLASS[tone]}`}
  >
    {dot && (
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${DOT_CLASS[tone]}`}
      />
    )}
    {children}
  </span>
)

export const StatusDot = ({ tone }: { tone: Tone }) => (
  <span aria-hidden className={`h-2 w-2 rounded-full ${DOT_CLASS[tone]}`} />
)
