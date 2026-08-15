import crypto from "crypto";
import { db } from "@/db";
import { prospectPageCache } from "@/db/schema";
import { eq } from "drizzle-orm";

const DOH_ENDPOINT = "https://dns.google/resolve";
const CACHE_HOURS = 1; // §10: "Cache 1 hour, refresh button."

interface DoHAnswer {
  name: string;
  type: number;
  data: string;
}
interface DoHResponse {
  Status: number;
  Answer?: DoHAnswer[];
}

function cacheKey(domain: string, type: string): string {
  return crypto.createHash("sha256").update(`dns:${domain}:${type}`).digest("hex");
}

async function queryDoH(domain: string, type: "MX" | "TXT" | "CNAME" | "A", forceRefresh = false): Promise<string[]> {
  const hash = cacheKey(domain, type);

  if (!forceRefresh) {
    const [cached] = await db.select().from(prospectPageCache).where(eq(prospectPageCache.urlHash, hash));
    if (cached?.body && cached.fetchedAt) {
      const ageHours = (Date.now() - cached.fetchedAt.getTime()) / (1000 * 60 * 60);
      if (ageHours < CACHE_HOURS) return JSON.parse(cached.body) as string[];
    }
  }

  const url = `${DOH_ENDPOINT}?name=${encodeURIComponent(domain)}&type=${type}`;
  const res = await fetch(url, { headers: { Accept: "application/dns-json" }, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`DoH-query mislukt (${res.status}) voor ${domain} ${type}`);
  const json = (await res.json()) as DoHResponse;
  const records = (json.Answer ?? []).map((a) => a.data);

  await db
    .insert(prospectPageCache)
    .values({ urlHash: hash, url, status: res.status, body: JSON.stringify(records) })
    .onConflictDoUpdate({ target: prospectPageCache.urlHash, set: { status: res.status, body: JSON.stringify(records), fetchedAt: new Date() } });

  return records;
}

export type CheckStatus = "green" | "amber" | "red";
export interface DnsCheckResult {
  name: string;
  status: CheckStatus;
  detail: string;
}

async function checkMx(domain: string, forceRefresh: boolean): Promise<DnsCheckResult> {
  try {
    const records = await queryDoH(domain, "MX", forceRefresh);
    return records.length > 0
      ? { name: "MX", status: "green", detail: records.join(", ") }
      : { name: "MX", status: "red", detail: "Geen MX-records gevonden — geen e-mail kan worden ontvangen op dit domein." };
  } catch (err) {
    return { name: "MX", status: "red", detail: err instanceof Error ? err.message : String(err) };
  }
}

// SPF lookup-counting: each of these mechanisms costs one DNS lookup against
// the RFC 7208 limit of 10. This is a real count of the mechanisms in the
// record, not a full recursive resolution of nested includes — a close
// approximation, not a certified SPF validator.
const SPF_LOOKUP_MECHANISMS = /\b(include:|a(?::|\/|\s|$)|mx(?::|\/|\s|$)|ptr\b|exists:|redirect=)/g;

async function checkSpf(domain: string, forceRefresh: boolean): Promise<DnsCheckResult> {
  try {
    const records = await queryDoH(domain, "TXT", forceRefresh);
    const spfRecords = records.filter((r) => r.replace(/^"|"$/g, "").startsWith("v=spf1"));

    if (spfRecords.length === 0) return { name: "SPF", status: "red", detail: "Geen SPF-record gevonden." };
    if (spfRecords.length > 1) return { name: "SPF", status: "red", detail: `${spfRecords.length} SPF-records gevonden — moet er precies één zijn.` };

    const record = spfRecords[0].replace(/^"|"$/g, "");
    if (!record.trim().endsWith("-all")) {
      return { name: "SPF", status: "amber", detail: `SPF-record eindigt niet op "-all": ${record}` };
    }

    const lookupCount = (record.match(SPF_LOOKUP_MECHANISMS) ?? []).length;
    if (lookupCount > 10) {
      return { name: "SPF", status: "red", detail: `SPF-record heeft naar schatting ${lookupCount} DNS-lookups (limiet 10).` };
    }

    return { name: "SPF", status: "green", detail: `${record} (±${lookupCount} lookups)` };
  } catch (err) {
    return { name: "SPF", status: "red", detail: err instanceof Error ? err.message : String(err) };
  }
}

async function checkDkim(domain: string, selector: string, forceRefresh: boolean): Promise<DnsCheckResult> {
  try {
    const records = await queryDoH(`${selector}._domainkey.${domain}`, "TXT", forceRefresh);
    return records.length > 0
      ? { name: "DKIM", status: "green", detail: `Selector "${selector}" resolvet.` }
      : { name: "DKIM", status: "amber", detail: `Selector "${selector}" resolvet niet — controleer de juiste selector bij je mailprovider.` };
  } catch (err) {
    return { name: "DKIM", status: "amber", detail: err instanceof Error ? err.message : String(err) };
  }
}

async function checkDmarc(domain: string, forceRefresh: boolean): Promise<DnsCheckResult> {
  try {
    const records = await queryDoH(`_dmarc.${domain}`, "TXT", forceRefresh);
    const dmarcRecord = records.find((r) => r.replace(/^"|"$/g, "").startsWith("v=DMARC1"));
    if (!dmarcRecord) return { name: "DMARC", status: "red", detail: "Geen DMARC-record gevonden." };

    const policyMatch = dmarcRecord.match(/p=(none|quarantine|reject)/);
    const policy = policyMatch?.[1] ?? "onbekend";
    const status: CheckStatus = policy === "reject" || policy === "quarantine" ? "green" : "amber";
    return { name: "DMARC", status, detail: `Policy: p=${policy}` };
  } catch (err) {
    return { name: "DMARC", status: "red", detail: err instanceof Error ? err.message : String(err) };
  }
}

/** §10: MX, SPF (single record, ends -all, <=10 lookups), DKIM selector resolves, DMARC with policy shown. */
export async function runDnsChecks(domain: string, opts: { dkimSelector?: string; forceRefresh?: boolean } = {}): Promise<DnsCheckResult[]> {
  const forceRefresh = opts.forceRefresh ?? false;
  const dkimSelector = opts.dkimSelector ?? "default";

  return Promise.all([checkMx(domain, forceRefresh), checkSpf(domain, forceRefresh), checkDkim(domain, dkimSelector, forceRefresh), checkDmarc(domain, forceRefresh)]);
}
