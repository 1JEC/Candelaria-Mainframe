import { db } from "@/lib/db";
import { leadAgentConfig } from "@/drizzle/schema";
import { and, desc, eq } from "drizzle-orm";
import { logAudit } from "@/lib/audit";

export type ConfigKey = "icp" | "rubric" | "thresholds" | "crawl" | "sources";

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

const DEFAULTS: Record<ConfigKey, unknown> = {
  icp: DEFAULT_ICP,
  rubric: DEFAULT_RUBRIC,
  thresholds: DEFAULT_THRESHOLDS,
  crawl: DEFAULT_CRAWL,
  sources: DEFAULT_SOURCES,
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
