import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

const PREFIX = 'cmf_'

/**
 * Ingest tokens are stored as SHA-256 hashes. The plaintext is returned once
 * at creation and is never recoverable afterwards.
 *
 * A plain hash (no salt/bcrypt) is correct here: the token is 256 bits of
 * randomness, so there is no dictionary to attack, and lookup must be a single
 * indexed query on every ingest request.
 */
export function generateIngestToken(): { token: string; hash: string } {
  const token = PREFIX + randomBytes(32).toString('base64url')
  return { token, hash: hashIngestToken(token) }
}

export function hashIngestToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Constant-time comparison for two hex digests of equal length. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/** Extracts the token from an `Authorization: Bearer <token>` header. */
export function bearerFrom(header: string | null): string | null {
  if (!header) return null
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match ? match[1].trim() : null
}
