import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { requestCancel } from "@/lib/leads-agent/orchestration/run";
import { logAudit } from "@/lib/audit";

/** Cooperative cancel — flags the run, the current task still finishes, no orphaned chain. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (!guard.ok) return new Response("Unauthorized", { status: guard.status });

  const { id } = await params;
  await requestCancel(id);
  await logAudit({ userId: guard.session.user.id, action: "lead_run_cancelled", resourceType: "lead_run", resourceId: id });
  return NextResponse.json({ ok: true });
}
