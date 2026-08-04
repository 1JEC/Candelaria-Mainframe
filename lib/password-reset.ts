import crypto from 'crypto'

/** Reset links expire after this long. */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour

/**
 * The raw token goes in the email link; only its hash is stored in the
 * database, so a database read alone can never be used to reset a password.
 */
export function generateResetToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString('hex')
  return { token, tokenHash: hashResetToken(token) }
}

export function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}
