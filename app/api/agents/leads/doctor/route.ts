import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { runDoctorChecks } from "@/lib/leads-agent/doctor";

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return new Response("Unauthorized", { status: guard.status });

  const report = await runDoctorChecks();
  return NextResponse.json(report);
}
