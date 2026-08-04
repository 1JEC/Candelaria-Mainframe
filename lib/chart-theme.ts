import tokens from '@/brand-tokens.json'

/**
 * Recharts takes colours as props, not classes, so it cannot use Tailwind.
 * It reads them straight from `brand-tokens.json` instead — the same single
 * source of truth the Tailwind theme is generated from. No literal hex value
 * is written anywhere in a chart component.
 */
export const chartTheme = {
  grid: tokens.color.ink.line,
  axis: tokens.color.ink.mute,
  tooltipBg: tokens.color.semantic.surfaceRaised,
  tooltipBorder: tokens.color.semantic.border,
  text: tokens.color.semantic.textPrimary,
  muted: tokens.color.semantic.textMuted,

  /** Outcome and sentiment series reuse the semantic palette. */
  series: {
    resolved: tokens.color.moss.DEFAULT,
    escalated: tokens.color.gold.DEFAULT,
    abandoned: tokens.color.ink.mute,
    positive: tokens.color.moss.DEFAULT,
    neutral: tokens.color.ink.mute,
    negative: tokens.color.flame.DEFAULT,
    primary: tokens.color.flame.DEFAULT,
    secondary: tokens.color.gold.DEFAULT,
  },

  font: {
    mono: tokens.font.mono.family,
    sans: tokens.font.sans.family,
  },
} as const
