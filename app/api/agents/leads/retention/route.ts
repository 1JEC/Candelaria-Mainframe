import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { runRetentionJob, previewRetentionJob } from "@/lib/leads-agent/retention";
import { logAudit } from "@/lib/audit";

/** GET previews counts without deleting; POST actually runs the purge. Both admin-only — this is a destructive action. */
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return new Response("Unauthorized", { status: guard.status });
  return NextResponse.json(await previewRetentionJob());
}

export async function POST(_req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return new Response("Unauthorized", { status: guard.status });

  const result = await runRetentionJob();
  await logAudit({ userId: guard.session.user.id, action: "lead_retention_run", metadata: result });
  return NextResponse.json(result);
}
