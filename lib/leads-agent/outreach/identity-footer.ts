// §4 rule 7: every generated message must carry sender identity (name, KvK,
// address, email), a working opt-out line, a source line, and a privacy
// link. Deliberately deterministic — never left to the model, so it can
// never be omitted or misstated (see Phase 5's outreach-pack.ts, which
// explicitly forbids the AI from writing any of this itself).

const COMPANY_NAME = "Candelaria Agency";
const CONTACT_EMAIL = "candelaria.agency@pm.me"; // the one outreach entry point per the business context — not a secret

export interface IdentityFooter {
  text: string;
  missingConfig: string[];
}

/**
 * OUTREACH_DOMAIN / PRIVACY_URL / COMPANY_KVK / COMPANY_ADDRESS are real
 * business values only Johan can supply (§15) — not generatable secrets.
 * Missing ones render as an impossible-to-miss placeholder rather than
 * silently omitting the field, so a pack can never look send-ready when
 * it isn't.
 */
export function buildIdentityFooter(sourceUrl: string): IdentityFooter {
  const kvk = process.env.COMPANY_KVK;
  const address = process.env.COMPANY_ADDRESS;
  const privacyUrl = process.env.PRIVACY_URL;

  const missingConfig: string[] = [];
  if (!kvk) missingConfig.push("COMPANY_KVK");
  if (!address) missingConfig.push("COMPANY_ADDRESS");
  if (!privacyUrl) missingConfig.push("PRIVACY_URL");

  const kvkLine = kvk ?? "[KVK-NUMMER ONTBREEKT — VUL COMPANY_KVK IN]";
  const addressLine = address ?? "[ADRES ONTBREEKT — VUL COMPANY_ADDRESS IN]";
  const privacyLine = privacyUrl ?? "[PRIVACYVERKLARING ONTBREEKT — VUL PRIVACY_URL IN]";

  const text = `—
${COMPANY_NAME}
KvK ${kvkLine}
${addressLine}
${CONTACT_EMAIL}

Deze e-mail is gestuurd omdat je bedrijfsgegevens publiek vindbaar waren via: ${sourceUrl}
Geen interesse? Antwoord met "afmelden" en je ontvangt nooit meer bericht van ons.
Privacyverklaring: ${privacyLine}`;

  return { text, missingConfig };
}
