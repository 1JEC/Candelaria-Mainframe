import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { agentEvents } from "@/drizzle/schema";
import { and, asc, eq, gt } from "drizzle-orm";

/**
 * Polling endpoint (the spec's own documented SSE-fallback shape, used as
 * the primary mechanism here — see docs/DECISIONS.md Phase 0/6 on why a
 * long-held SSE connection is a risky bet on Netlify's standard functions).
 * The Console polls this every ~1.5s with `after` = the last event id seen.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (!guard.ok) return new Response("Unauthorized", { status: guard.status });

  const { id } = await params;
  const afterParam = req.nextUrl.searchParams.get("after");
  const after = afterParam ? Number(afterParam) : 0;

  const events = await db
    .select()
    .from(agentEvents)
    .where(and(eq(agentEvents.runId, id), gt(agentEvents.id, Number.isFinite(after) ? after : 0)))
    .orderBy(asc(agentEvents.id))
    .limit(200);

  return NextResponse.json({ events });
}
