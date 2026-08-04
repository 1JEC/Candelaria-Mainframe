/**
 * IP address handling for the owned-analytics feature.
 *
 * `pageviews.ip_truncated` must NEVER contain a full IP — masking the last
 * octet (IPv4) or the interface identifier (IPv6) is what lets this run
 * under legitimate interest without a consent banner. `leads.ip_address`
 * intentionally uses the full, un-truncated address instead (see
 * DECISIONS.md privacy section: legitimate interest for fraud/security on an
 * active form submission).
 */

/** First entry of a (possibly multi-hop) X-Forwarded-For header. */
export function firstForwardedIp(header: string | null): string | null {
  if (!header) return null
  const first = header.split(',')[0]?.trim()
  return first || null
}

/** Best-effort client IP from standard proxy headers, in priority order. */
export function clientIp(req: Request): string | null {
  return (
    firstForwardedIp(req.headers.get('x-forwarded-for')) ??
    req.headers.get('x-real-ip')
  )
}

const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/

/**
 * `84.86.123.45` -> `84.86.123.xxx`. IPv6 keeps only the first 3 groups and
 * collapses the rest: `2001:db8:85a3:...` -> `2001:db8:85a3::`. Anything
 * unrecognised returns null rather than risking a full address leaking
 * through unmasked.
 */
export function truncateIp(ip: string | null | undefined): string | null {
  if (!ip) return null
  const trimmed = ip.trim()

  const v4 = IPV4_RE.exec(trimmed)
  if (v4) return `${v4[1]}.${v4[2]}.${v4[3]}.xxx`

  if (trimmed.includes(':')) {
    const groups = trimmed.split(':').filter((g) => g.length > 0)
    if (groups.length === 0) return null
    return `${groups.slice(0, 3).join(':')}::`
  }

  return null
}
