import crypto from "crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { leads } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { addSuppression } from "@/lib/leads-agent/suppression";
import { logAudit } from "@/lib/audit";

/**
 * §4 rule 10: "POST /leads/[id]/forget deletes the record and leaves only
 * a one-way hash in suppression." The hash is irreversible (SHA-256, no
 * salt reused elsewhere) so the suppression table can never be used to
 * reconstruct who was forgotten — its only job is preventing
 * re-discovery, which needs a comparable value, not a reversible one.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (!guard.ok) return new Response("Unauthorized", { status: guard.status });

  const { id } = await params;
  const [lead] = await db.select().from(leads).where(eq(leads.id, id));
  if (!lead) return NextResponse.json({ error: "Lead niet gevonden." }, { status: 404 });

  // Hash every identifier isSuppressed() actually compares against
  // (domain, email) — a hash of anything else would sit in the table
  // unused, since nothing would ever compute a matching hash to check.
  const identifiers = [lead.registrableDomain, lead.emailGeneral, lead.email].filter((v): v is string => Boolean(v));
  if (identifiers.length === 0) {
    // No domain or email on record — nothing a future discovery could
    // hash-match against. Still record the deletion for audit purposes.
    await logAudit({ userId: guard.session.user.id, action: "lead_forgotten", resourceType: "lead", resourceId: id, metadata: { note: "Geen domein/e-mail bekend — geen herkenbare hash kon worden opgeslagen." } });
    await db.delete(leads).where(eq(leads.id, id));
    return NextResponse.json({ ok: true, warning: "Geen domein of e-mail bekend bij deze lead — toekomstige herontdekking kan niet worden herkend." });
  }

  for (const identifier of identifiers) {
    const hash = crypto.createHash("sha256").update(identifier).digest("hex");
    await addSuppression("hash", hash, "forget", "Verzoek tot vergeten (recht op vergetelheid).");
  }

  await logAudit({ userId: guard.session.user.id, action: "lead_forgotten", resourceType: "lead", resourceId: id });
  await db.delete(leads).where(eq(leads.id, id));

  return NextResponse.json({ ok: true });
}
