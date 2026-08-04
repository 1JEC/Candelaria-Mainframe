/**
 * Resend is the only notification channel in this product.
 *
 * When `RESEND_API_KEY` is absent the send is skipped and logged instead of
 * throwing, so the portal stays fully usable before credentials exist. The
 * return value always says which of the two happened — callers must never
 * report "verstuurd" to a user on the back of a skipped send.
 */

type SendResult =
  | { ok: true; skipped: false; id: string }
  | { ok: true; skipped: true; reason: 'no_api_key' }
  | { ok: false; skipped: false; error: string }

type SendInput = {
  to: string | string[]
  subject: string
  /** Plain text; wrapped in a minimal branded HTML shell for the email body. */
  text: string
}

const FROM = process.env.RESEND_FROM ?? 'Candelaria Mainframe <onboarding@resend.dev>'

export async function sendEmail(input: SendInput): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    console.info(
      `[email] skipped (no RESEND_API_KEY) → ${String(input.to)} :: ${input.subject}`,
    )
    return { ok: true, skipped: true, reason: 'no_api_key' }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: Array.isArray(input.to) ? input.to : [input.to],
        subject: input.subject,
        text: input.text,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error('[email] resend rejected', res.status, body)
      return { ok: false, skipped: false, error: `${res.status} ${body}` }
    }

    const data = (await res.json()) as { id: string }
    return { ok: true, skipped: false, id: data.id }
  } catch (err) {
    console.error('[email] send failed', err)
    return { ok: false, skipped: false, error: String(err) }
  }
}

/** Address that receives internal notifications (new requests, escalations). */
export function agencyInbox(): string {
  return process.env.AGENCY_NOTIFY_EMAIL ?? 'j.candelaria171@gmail.com'
}
