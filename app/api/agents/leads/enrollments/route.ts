import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { createEnrollments, EnrollmentLimitError } from "@/lib/leads-agent/outbound/enroll";

/** §9: deliberate enrollment only — Johan selects leads and confirms; capped at MAX_ENROLL_PER_ACTION (10), never auto-enrolled from a run. */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return new Response("Unauthorized", { status: guard.status });

  const body = await req.json().catch(() => null);
  const leadIds: string[] = Array.isArray(body?.leadIds) ? body.leadIds.filter((id: unknown) => typeof id === "string") : [];

  try {
    const outcome = await createEnrollments(leadIds, guard.session.user.id);
    return NextResponse.json(outcome);
  } catch (err) {
    if (err instanceof EnrollmentLimitError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
