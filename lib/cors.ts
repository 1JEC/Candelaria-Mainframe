/**
 * Shared CORS handling for the two public marketing-site-facing endpoints
 * (`/api/intake/leads`, `/api/collect`). `ALLOWED_ORIGIN` is a single origin
 * (the Candelaria website) — not a wildcard, since `/api/intake/leads`
 * accepts a bearer-style secret header and a wildcard would let any site
 * read error responses that might leak validation details.
 */

function allowedOrigin(): string {
  return process.env.ALLOWED_ORIGIN ?? 'https://candelaria-agency.netlify.app'
}

export function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': allowedOrigin(),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-intake-token',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

/** Reusable `OPTIONS` handler for routes that only need the CORS preflight. */
export function corsPreflight(): Response {
  return new Response(null, { status: 204, headers: corsHeaders() })
}
