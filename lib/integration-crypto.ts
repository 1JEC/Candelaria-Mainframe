import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

/**
 * AES-256-GCM for third-party integration credentials (integrations.encrypted_credentials).
 * Distinct from lib/tokens.ts and lib/password-reset.ts, which only ever
 * hash (one-way, for comparison) — this is genuine encryption because the
 * plaintext API key/token must be recovered later to call the provider.
 *
 * Format: base64(iv) + ':' + base64(authTag) + ':' + base64(ciphertext).
 * A fresh random IV per encryption (GCM requires this — reusing an IV with
 * the same key breaks its confidentiality guarantee).
 */

function getKey(): Buffer {
  const raw = process.env.CREDENTIALS_KEY
  if (!raw) throw new Error('CREDENTIALS_KEY is not set — cannot encrypt or decrypt integration credentials.')
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) {
    throw new Error(`CREDENTIALS_KEY must decode to 32 bytes for AES-256 (got ${key.length}). Generate one with: openssl rand -base64 32`)
  }
  return key
}

export function encryptCredential(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`
}

export function decryptCredential(encoded: string): string {
  const [ivB64, authTagB64, ciphertextB64] = encoded.split(':')
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error('Malformed encrypted credential — expected "iv:authTag:ciphertext".')
  }
  const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'))
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, 'base64')), decipher.final()])
  return plaintext.toString('utf8')
}
