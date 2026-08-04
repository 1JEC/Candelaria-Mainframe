import { createHash } from 'node:crypto'

/**
 * Daily-rotating visitor identifier: SHA-256(full IP + user-agent + UTC date
 * + salt). The full IP is used only in-memory here to derive the hash — it
 * is never itself persisted by the analytics collector (`pageviews` only
 * stores `ip_truncated`). Rotating daily means the same hash cannot be used
 * to track a visitor across days, while still linking same-day pageviews to
 * the lead they may submit.
 */
export function hashVisitor(
  ip: string,
  userAgent: string,
  utcDate: string,
  salt: string,
): string {
  return createHash('sha256').update(`${ip}|${userAgent}|${utcDate}|${salt}`).digest('hex')
}

/** `YYYY-MM-DD` in UTC, the rotation boundary for hashVisitor. */
export function utcDateString(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10)
}
