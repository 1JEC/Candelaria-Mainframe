import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { getConfig, saveConfig, DEFAULT_GOLIVE_CHECKLIST, GOLIVE_CHECKLIST_ITEMS } from "@/lib/leads-agent/config";

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return new Response("Unauthorized", { status: guard.status });

  const body = await req.json().catch(() => null);
  const key = body?.key;
  const checked = Boolean(body?.checked);
  const validKey = GOLIVE_CHECKLIST_ITEMS.some((i) => i.key === key);
  if (!validKey) return NextResponse.json({ error: "Onbekend checklist-item." }, { status: 400 });

  const current = await getConfig<typeof DEFAULT_GOLIVE_CHECKLIST>("golive_checklist");
  const nextItems = { ...current.items, [key]: checked };
  await saveConfig("golive_checklist", { items: nextItems }, guard.session.user.id);

  return NextResponse.json({ items: nextItems });
}
