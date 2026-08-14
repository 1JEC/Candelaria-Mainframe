import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { getConfig, saveConfig, DEFAULT_OUTBOUND_HALT } from "@/lib/leads-agent/config";

/** §9: global kill switch, reachable from every Outbound screen. Checked by send-gates.ts's gate 1 in addition to OUTBOUND_ENABLED/MODE, so it works instantly without a redeploy. */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return new Response("Unauthorized", { status: guard.status });

  const body = await req.json().catch(() => ({}));
  const halted = body?.halted !== false; // POST with no body = halt; { halted: false } = resume

  await saveConfig("outbound_halt", { halted }, guard.session.user.id);
  return NextResponse.json({ halted });
}

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return new Response("Unauthorized", { status: guard.status });

  const state = await getConfig<typeof DEFAULT_OUTBOUND_HALT>("outbound_halt");
  return NextResponse.json(state);
}
