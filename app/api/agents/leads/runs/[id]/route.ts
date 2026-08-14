import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { getRun } from "@/lib/leads-agent/orchestration/run";
import { countTasksByStatus } from "@/lib/leads-agent/orchestration/task-queue";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (!guard.ok) return new Response("Unauthorized", { status: guard.status });

  const { id } = await params;
  const run = await getRun(id);
  if (!run) return NextResponse.json({ error: "Run niet gevonden." }, { status: 404 });

  const taskCounts = await countTasksByStatus(id);
  return NextResponse.json({ run, taskCounts });
}
