import { db } from "@/lib/db";
import { leadAgentConfig } from "@/drizzle/schema";
import { and, desc, eq } from "drizzle-orm";
import { logAudit } from "@/lib/audit";

export type ConfigKey = "icp" | "rubric" | "thresholds" | "crawl" | "sources" | "outbound_halt" | "golive_checklist";

export const DEFAULT_ICP = {
  sectors: [
    "aannemer", "installateur", "tandarts", "kliniek", "praktijk", "advocaat",
    "notaris", "accountant", "makelaar", "hovenier", "autobedrijf", "salon",
    "fysio", "catering", "interieur", "speciaalzaak",
  ],
  sizeMin: 2,
  sizeMax: 50,
  cities: ["Den Haag", "Rijswijk", "Delft", "Zoetermeer", "Voorburg", "Leidschendam", "Rotterdam", "Westland"],
  disqualifySectors: ["webbureau", "marketingbureau", "franchise"],
};

// §7 scoring rubric — fit (0-40) + pain (0-60), evidence-bound.
export const DEFAULT_RUBRIC = {
  fit: {
    icpSector: 12,
    sizeMatch: 8,
    inTargetArea: 6,
    commercialIntent: 6,
    activeBusiness: 5,
    multiLocation: 3,
  },
  pain: {
    noWebsite: 60,
    noHttps: 12,
    noMobileViewport: 12,
    slowOrLowPsi: 10,
    staleContent: 10,
    noContactForm: 8,
    brokenWebshop: 8,
    outdatedPlatform: 7,
    seoBasicsBroken: 9,
    noAnalytics: 6,
    noChatOrBooking: 5,
    noSchemaOrg: 4,
  },
  minScore: 45,
  priorityA: 70,
  priorityB: 55,
  priorityC: 45,
  minFitToQualify: 18,
};

export const DEFAULT_THRESHOLDS = {
  retentionDays: 180,
  minScore: 45,
  auditStaleDays: 30,
  placesRefreshDays: 30,
};

export const DEFAULT_CRAWL = {
  crawlDelayMs: 1500,
  maxPagesPerDomain: 8,
  maxConcurrency: 5,
  timeoutMs: 15000,
  maxResponseBytes: 2 * 1024 * 1024,
  userAgent: "CandelariaLeadBot/1.0 (+https://candelaria-agency.netlify.app; candelaria.agency@pm.me)",
};

export const DEFAULT_SOURCES = {
  osmOverpass: { enabled: true },
  googlePlaces: { enabled: false }, // enables itself once GOOGLE_PLACES_API_KEY is set
  kvk: { enabled: false },
  csvSeed: { enabled: true },
  siteExpansion: { enabled: true },
};

// §9: DB-backed kill switch, checked by send-gates.ts's gate 1 alongside
// OUTBOUND_ENABLED/OUTBOUND_MODE. An env var can't be flipped without a
// redeploy — "reachable from every Outbound screen" needs something an
// API call can toggle instantly during a real incident.
export const DEFAULT_OUTBOUND_HALT = { halted: false };

// §11 go-live checklist — every box before OUTBOUND_ENABLED=true. Most
// items can't be verified programmatically (they're real-world steps:
// registering mailboxes, running mail-tester, agreeing a reply routine),
// so this is Johan's own tickable record, persisted like any other config.
export const GOLIVE_CHECKLIST_ITEMS = [
  { key: "domain_registered", label: "Outreach-domein geregistreerd, ≥2 weken oud, 301 naar hoofdsite" },
  { key: "privacy_live", label: "Privacyverklaring live en gelinkt" },
  { key: "mailboxes_ready", label: "2-3 mailboxen met echte naam en handtekening" },
  { key: "dns_verified", label: "MX/SPF/DKIM/DMARC geverifieerd, mail-tester 10/10" },
  { key: "postmaster_configured", label: "Google Postmaster Tools geconfigureerd" },
  { key: "sequencer_warmup", label: "Sequencer verbonden, warmup ≥14 dagen actief" },
  { key: "tracking_disabled", label: "Open tracking en link-wrapping uitgeschakeld" },
  { key: "reply_routine_agreed", label: "Reactieroutine afgesproken" },
  { key: "suppression_imported", label: "Onderdrukkingslijst geïmporteerd (klanten, partners, concurrenten, eerder benaderden)" },
  { key: "test_sequence_landed", label: "Testreeks kwam aan in hoofdinbox bij Gmail, Outlook en een zakelijk domein" },
  { key: "send_caps_set", label: "Eerste batch max. 5/dag, plafond 25/mailbox/dag voor altijd" },
] as const;
export const DEFAULT_GOLIVE_CHECKLIST = { items: Object.fromEntries(GOLIVE_CHECKLIST_ITEMS.map((i) => [i.key, false])) as Record<string, boolean> };

const DEFAULTS: Record<ConfigKey, unknown> = {
  icp: DEFAULT_ICP,
  rubric: DEFAULT_RUBRIC,
  thresholds: DEFAULT_THRESHOLDS,
  crawl: DEFAULT_CRAWL,
  sources: DEFAULT_SOURCES,
  outbound_halt: DEFAULT_OUTBOUND_HALT,
  golive_checklist: DEFAULT_GOLIVE_CHECKLIST,
};

export async function getConfig<T = unknown>(key: ConfigKey): Promise<T> {
  const [row] = await db
    .select()
    .from(leadAgentConfig)
    .where(and(eq(leadAgentConfig.key, key), eq(leadAgentConfig.isActive, true)))
    .orderBy(desc(leadAgentConfig.version))
    .limit(1);
  if (!row) return DEFAULTS[key] as T;
  return row.valueJson as T;
}

export async function saveConfig(key: ConfigKey, value: unknown, userId: string): Promise<number> {
  const [latest] = await db
    .select({ version: leadAgentConfig.version })
    .from(leadAgentConfig)
    .where(eq(leadAgentConfig.key, key))
    .orderBy(desc(leadAgentConfig.version))
    .limit(1);
  const nextVersion = (latest?.version ?? 0) + 1;

  await db
    .update(leadAgentConfig)
    .set({ isActive: false })
    .where(and(eq(leadAgentConfig.key, key), eq(leadAgentConfig.isActive, true)));

  await db.insert(leadAgentConfig).values({
    id: crypto.randomUUID(),
    key,
    version: nextVersion,
    valueJson: value,
    isActive: true,
    updatedBy: userId,
  });

  await logAudit({
    userId,
    action: "lead_config_updated",
    resourceType: "lead_agent_config",
    resourceId: key,
    after: { version: nextVersion, value },
  });

  return nextVersion;
}

export async function restoreConfigVersion(key: ConfigKey, version: number, userId: string): Promise<number> {
  const [row] = await db
    .select()
    .from(leadAgentConfig)
    .where(and(eq(leadAgentConfig.key, key), eq(leadAgentConfig.version, version)));
  if (!row) throw new Error(`No version ${version} for config key ${key}`);
  return saveConfig(key, row.valueJson, userId);
}
