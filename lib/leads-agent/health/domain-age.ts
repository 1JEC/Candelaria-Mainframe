interface RdapResponse {
  events?: { eventAction: string; eventDate: string }[];
}

// RDAP is the modern, free, no-key successor to WHOIS — but not every
// registry runs one, and there's no single universal endpoint. IANA's
// bootstrap registry is the standard way to find the right RDAP server
// per TLD; this uses it live rather than hardcoding endpoints for a few
// TLDs, so it works for any domain, not just .nl/.com.
const IANA_BOOTSTRAP = "https://data.iana.org/rdap/dns.json";

async function findRdapServer(tld: string): Promise<string | null> {
  const res = await fetch(IANA_BOOTSTRAP, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) return null;
  const json = (await res.json()) as { services: [string[], string[]][] };
  for (const [tlds, servers] of json.services) {
    if (tlds.includes(tld)) return servers[0];
  }
  return null;
}

export interface DomainAgeResult {
  registeredAt: string | null;
  ageDays: number | null;
  meetsMinimum: boolean; // §11 go-live checklist: "registered and >=2 weeks old"
  error: string | null;
}

const MIN_AGE_DAYS = 14;

export async function checkDomainAge(domain: string): Promise<DomainAgeResult> {
  const tld = domain.split(".").pop()?.toLowerCase();
  if (!tld) return { registeredAt: null, ageDays: null, meetsMinimum: false, error: "Ongeldig domein." };

  try {
    const rdapServer = await findRdapServer(tld);
    if (!rdapServer) {
      return { registeredAt: null, ageDays: null, meetsMinimum: false, error: `Geen RDAP-server bekend voor .${tld} — leeftijd kan niet automatisch worden gecontroleerd.` };
    }

    const url = `${rdapServer.replace(/\/$/, "")}/domain/${domain}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      return { registeredAt: null, ageDays: null, meetsMinimum: false, error: `RDAP-opzoeking mislukt (${res.status}) — domein bestaat mogelijk niet of registry blokkeert opzoekingen.` };
    }

    const json = (await res.json()) as RdapResponse;
    const registration = json.events?.find((e) => e.eventAction === "registration");
    if (!registration) {
      return { registeredAt: null, ageDays: null, meetsMinimum: false, error: "Registratiedatum niet gevonden in RDAP-respons." };
    }

    const registeredAt = new Date(registration.eventDate);
    const ageDays = Math.floor((Date.now() - registeredAt.getTime()) / (1000 * 60 * 60 * 24));
    return { registeredAt: registration.eventDate, ageDays, meetsMinimum: ageDays >= MIN_AGE_DAYS, error: null };
  } catch (err) {
    return { registeredAt: null, ageDays: null, meetsMinimum: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface RedirectCheckResult {
  finalUrl: string | null;
  redirected: boolean;
  error: string | null;
}

/** §10: "whether the redirect to the main site resolves." No MAIN_SITE_URL env var is defined in the spec's own env list — reports the actual redirect target for a human to eyeball rather than asserting pass/fail against an undefined expectation. */
export async function checkRedirect(domain: string): Promise<RedirectCheckResult> {
  try {
    const res = await fetch(`https://${domain}`, { redirect: "follow", signal: AbortSignal.timeout(10000) });
    return { finalUrl: res.url, redirected: res.url !== `https://${domain}/` && res.url !== `https://${domain}`, error: null };
  } catch (err) {
    return { finalUrl: null, redirected: false, error: err instanceof Error ? err.message : String(err) };
  }
}
