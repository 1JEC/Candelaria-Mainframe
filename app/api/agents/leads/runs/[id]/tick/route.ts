import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { runTick } from "@/lib/leads-agent/orchestration/tick";

/**
 * Session-authenticated tick endpoint the admin's own browser tab polls
 * while a run is active — the mechanism that replaces `after()` on this
 * host (see docs/DECISIONS.md Phase 0/6). Distinct from /api/agents/leads/
 * worker, which is WORKER_SECRET-gated for the sweeper/external callers.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (!guard.ok) return new Response("Unauthorized", { status: guard.status });

  const { id } = await params;
  try {
    const summary = await runTick(id);
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
