import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

import tokens from './brand-tokens.json'

const { color, font, radius, shadow, spacing, motion, motif, typeScale } = tokens

const fontSize = Object.fromEntries(
  Object.entries(typeScale).map(([name, t]) => [
    name,
    [
      t.size,
      {
        ...('lineHeight' in t ? { lineHeight: t.lineHeight } : {}),
        ...('tracking' in t ? { letterSpacing: t.tracking } : {}),
        ...('weight' in t ? { fontWeight: String(t.weight) } : {}),
      },
    ],
  ])
) as Config['theme'] & Record<string, unknown>

const config: Config = {
  content: ['./app/**/*.{ts,tsx,mdx}', './components/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: color.ink,
        cream: color.cream,
        paper: color.paper,
        flame: color.flame,
        moss: color.moss,
        gold: color.gold,

        background: color.semantic.background,
        surface: {
          DEFAULT: color.semantic.surface,
          raised: color.semantic.surfaceRaised,
        },
        border: color.semantic.border,
        foreground: color.semantic.textPrimary,
        muted: color.semantic.textMuted,
        primary: {
          DEFAULT: color.semantic.primary,
          foreground: color.semantic.primaryForeground,
        },
        success: color.semantic.success,
        warning: color.semantic.warning,
        danger: color.semantic.danger,
        info: color.semantic.info,
      },

      fontFamily: {
        serif: font.serif.stack,
        sans: font.sans.stack,
        mono: font.mono.stack,
      },

      fontSize,

      letterSpacing: {
        label: typeScale.label.tracking,
      },

      borderRadius: {
        sm: radius.sm,
        md: radius.md,
        lg: radius.lg,
        xl: radius.xl,
        full: radius.full,
      },

      boxShadow: {
        sm: shadow.sm,
        md: shadow.md,
        lg: shadow.lg,
        focus: shadow.focus,
        'glow-flame': shadow.glowFlame,
        'glow-gold': shadow.glowGold,
      },

      spacing: {
        sidebar: spacing.sidebarWidth,
        'sidebar-collapsed': spacing.sidebarCollapsed,
        topbar: spacing.topbarHeight,
      },

      maxWidth: {
        content: spacing.contentMaxWidth,
      },

      backgroundImage: {
        streaks: motif.streaks,
        'grid-pattern': motif.gridPattern.image,
      },

      backgroundSize: {
        grid: motif.gridPattern.size,
      },

      transitionDuration: {
        fast: motion.duration.fast,
        DEFAULT: motion.duration.base,
        slow: motion.duration.slow,
      },

      transitionTimingFunction: {
        snappy: motion.easing.snappy,
      },
    },
  },
  plugins: [animate],
}

export default config
