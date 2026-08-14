import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { saveConfig } from "@/lib/leads-agent/config";

/** §11: "Every save versioned, audit-logged" — saveConfig() already does both (Phase 1). */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return new Response("Unauthorized", { status: guard.status });

  const rubric = await req.json().catch(() => null);
  if (!rubric || typeof rubric !== "object") return NextResponse.json({ error: "Ongeldige rubric." }, { status: 400 });

  const version = await saveConfig("rubric", rubric, guard.session.user.id);
  return NextResponse.json({ version });
}
