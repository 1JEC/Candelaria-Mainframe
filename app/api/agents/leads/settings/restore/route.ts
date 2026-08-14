import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { restoreConfigVersion, type ConfigKey } from "@/lib/leads-agent/config";

const VALID_KEYS: ConfigKey[] = ["icp", "rubric", "thresholds", "crawl", "sources", "outbound_halt", "golive_checklist"];

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return new Response("Unauthorized", { status: guard.status });

  const body = await req.json().catch(() => null);
  const key = body?.key as ConfigKey;
  const version = Number(body?.version);
  if (!VALID_KEYS.includes(key) || !Number.isInteger(version)) {
    return NextResponse.json({ error: "Ongeldige sleutel of versie." }, { status: 400 });
  }

  try {
    const newVersion = await restoreConfigVersion(key, version, guard.session.user.id);
    return NextResponse.json({ version: newVersion });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
