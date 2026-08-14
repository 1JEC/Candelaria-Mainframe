import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { leads, leadPacks } from "@/drizzle/schema";
import { desc, eq } from "drizzle-orm";
import { toOutreachCsv, toOutreachJson, toInstantlyCsv, type PackExportRow } from "@/lib/leads-agent/outreach/exports";
import { logAudit } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * §8 exports — generated on demand (this route), never auto-uploaded
 * anywhere: "uploaded by nobody but Johan." §13: 20 exports/hour/user,
 * reusing the same limiter as every other rate-limited route in this repo.
 */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return new Response("Unauthorized", { status: guard.status });

  const rate = await checkRateLimit({ userId: guard.session.user.id, action: "lead_pack_export", limit: 20, windowMs: 60 * 60 * 1000 });
  if (!rate.allowed) return new Response("Te veel exports. Probeer het over een uur opnieuw.", { status: 429 });

  const format = req.nextUrl.searchParams.get("format") ?? "csv";
  const runId = req.nextUrl.searchParams.get("runId");

  const query = db
    .select({
      leadId: leads.id,
      company: leads.company,
      email: leads.emailGeneral,
      phone: leads.phoneE164,
      city: leads.city,
      sector: leads.sector,
      totalScore: leads.totalScore,
      priority: leads.priority,
      email1: leadPacks.email1,
      email2: leadPacks.email2,
      email3: leadPacks.email3,
      dmDraft: leadPacks.dmDraft,
    })
    .from(leadPacks)
    .innerJoin(leads, eq(leadPacks.leadId, leads.id))
    .orderBy(desc(leadPacks.generatedAt));

  const rows = (runId ? await query.where(eq(leadPacks.runId, runId)) : await query) as PackExportRow[];

  await logAudit({ userId: guard.session.user.id, action: "lead_packs_exported", metadata: { format, runId, count: rows.length } });

  if (format === "json") {
    return new Response(toOutreachJson(rows), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="outreach-packs.json"` },
    });
  }
  if (format === "instantly") {
    return new Response(toInstantlyCsv(rows), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="outreach-packs-instantly.csv"` },
    });
  }
  return new Response(toOutreachCsv(rows), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="outreach-packs.csv"` },
  });
}
