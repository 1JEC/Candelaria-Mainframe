import { db } from "@/lib/db";
import { suppression, leadRuns } from "@/drizzle/schema";
import { sql } from "drizzle-orm";
import { checkAiBudget } from "@/lib/agents/anthropic-client";

export type CheckStatus = "green" | "amber" | "red";
export interface DoctorCheck {
  name: string;
  status: CheckStatus;
  detail: string;
}
export interface DoctorReport {
  overall: CheckStatus;
  checks: DoctorCheck[];
  checkedAt: string;
}

const REQUIRED_ENV = ["DATABASE_URL"];
const OPTIONAL_ENV = [
  "ANTHROPIC_API_KEY",
  "GOOGLE_PLACES_API_KEY",
  "KVK_API_KEY",
  "PAGESPEED_API_KEY",
  "RESEND_API_KEY",
  "WORKER_SECRET",
  "CRON_SECRET",
];

export async function runDoctorChecks(): Promise<DoctorReport> {
  const checks: DoctorCheck[] = [];

  try {
    await db.execute(sql`select 1`);
    checks.push({ name: "database", status: "green", detail: "Verbinding met Postgres OK." });
  } catch (err) {
    checks.push({
      name: "database",
      status: "red",
      detail: `Databaseverbinding mislukt: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  for (const key of REQUIRED_ENV) {
    checks.push({
      name: `env:${key}`,
      status: process.env[key] ? "green" : "red",
      detail: process.env[key] ? "Ingesteld." : "Ontbreekt — vereist.",
    });
  }
  for (const key of OPTIONAL_ENV) {
    checks.push({
      name: `env:${key}`,
      status: process.env[key] ? "green" : "amber",
      detail: process.env[key] ? "Ingesteld." : "Ontbreekt — bijbehorende functie schakelt zichzelf uit.",
    });
  }

  try {
    const budget = await checkAiBudget();
    checks.push({
      name: "ai_budget",
      status: budget.ok ? "green" : "amber",
      detail: `€${budget.spentEur.toFixed(2)} besteed van €${budget.capEur.toFixed(2)} vandaag.`,
    });
  } catch (err) {
    checks.push({
      name: "ai_budget",
      status: "red",
      detail: `Kon AI-budget niet ophalen: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  try {
    const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(suppression);
    checks.push({
      name: "suppression_list",
      status: "green",
      detail: `${row?.count ?? 0} vermeldingen op de onderdrukkingslijst.`,
    });
  } catch (err) {
    checks.push({
      name: "suppression_list",
      status: "red",
      detail: `Suppressietabel niet bereikbaar: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  try {
    const staleSince = new Date(Date.now() - 3 * 60 * 1000);
    const stale = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(leadRuns)
      .where(sql`${leadRuns.status} = 'running' and ${leadRuns.heartbeatAt} < ${staleSince}`);
    const count = stale[0]?.count ?? 0;
    checks.push({
      name: "stale_runs",
      status: count > 0 ? "amber" : "green",
      detail: count > 0 ? `${count} run(s) met verouderde heartbeat.` : "Geen vastgelopen runs.",
    });
  } catch (err) {
    checks.push({
      name: "stale_runs",
      status: "red",
      detail: `Kon runs niet controleren: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  const outboundEnabled = process.env.OUTBOUND_ENABLED === "true";
  checks.push({
    name: "outbound",
    status: outboundEnabled ? "amber" : "green",
    detail: outboundEnabled
      ? "OUTBOUND_ENABLED=true — live modus actief."
      : "OUTBOUND_ENABLED=false — proefmodus, er wordt niets verstuurd.",
  });

  const overall: CheckStatus = checks.some((c) => c.status === "red")
    ? "red"
    : checks.some((c) => c.status === "amber")
      ? "amber"
      : "green";

  return { overall, checks, checkedAt: new Date().toISOString() };
}
