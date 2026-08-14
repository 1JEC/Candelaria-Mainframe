import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { createRun, RunConflictError } from "@/lib/leads-agent/orchestration/run";
import { checkRateLimit } from "@/lib/rate-limit";
import { DEFAULT_ICP } from "@/lib/leads-agent/config";

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return new Response("Unauthorized", { status: guard.status });

  // §13: 6 run starts/hour/user
  const rate = await checkRateLimit({ userId: guard.session.user.id, action: "lead_run_started", limit: 6, windowMs: 60 * 60 * 1000 });
  if (!rate.allowed) {
    return NextResponse.json({ error: "Te veel runs gestart. Probeer het over een uur opnieuw." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const city = typeof body?.city === "string" ? body.city.trim() : "";
  const sectors: string[] = Array.isArray(body?.sectors) ? body.sectors.filter((s: unknown) => typeof s === "string") : [];
  const limit = Number.isFinite(body?.limit) ? Math.max(1, Math.min(100, Number(body.limit))) : 25;

  if (!city) return NextResponse.json({ error: "Plaats is verplicht." }, { status: 400 });
  if (sectors.length === 0) return NextResponse.json({ error: "Kies minstens één sector." }, { status: 400 });
  const invalidSector = sectors.find((s) => !DEFAULT_ICP.sectors.includes(s));
  if (invalidSector) return NextResponse.json({ error: `Onbekende sector: ${invalidSector}.` }, { status: 400 });

  try {
    const { runId } = await createRun({ city, sectors, limit, startedBy: guard.session.user.id });
    return NextResponse.json({ runId });
  } catch (err) {
    if (err instanceof RunConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
