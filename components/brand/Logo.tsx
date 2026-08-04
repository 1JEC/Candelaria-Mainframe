import Image from 'next/image'
import tokens from '@/brand-tokens.json'
import { nl } from '@/lib/nl'

const intrinsic = tokens.logo.intrinsic['logo.png']

export const Monogram = ({
  size = 28,
  priority = false,
}: {
  size?: number
  priority?: boolean
}) => (
  <Image
    src={tokens.logo.monogram}
    alt={`${nl.brand.name} ${nl.brand.product}`}
    width={intrinsic.w}
    height={intrinsic.h}
    priority={priority}
    style={{ height: size, width: 'auto' }}
  />
)

/* No wordmark asset exists — the marketing site renders it as live Newsreader
   text next to the monogram, so the portal does the same. */
export const Wordmark = ({
  size = 28,
  showProduct = true,
}: {
  size?: number
  showProduct?: boolean
}) => (
  <span className="flex items-center gap-2.5">
    <Monogram size={size} priority />
    <span className="flex items-baseline gap-2">
      <span className="display text-h2 tracking-[-0.02em] text-foreground">
        {nl.brand.name}
      </span>
      {showProduct && (
        <span className="label text-gold">{nl.brand.product}</span>
      )}
    </span>
  </span>
)
