import { NextRequest, NextResponse } from "next/server";
import { runTick } from "@/lib/leads-agent/orchestration/tick";

/**
 * §13: internal worker route — WORKER_SECRET-gated, rejects browser
 * origins. For the sweeper and any future external scheduler; the admin's
 * own browser tab uses the session-authenticated /runs/[id]/tick instead.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-worker-secret");
  if (!process.env.WORKER_SECRET || secret !== process.env.WORKER_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  // A browser fetch always carries an Origin header; a trusted server-to-server call shouldn't.
  if (req.headers.get("origin")) {
    return new Response("Forbidden", { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const runId = typeof body?.runId === "string" ? body.runId : null;
  if (!runId) return NextResponse.json({ error: "runId is verplicht." }, { status: 400 });

  const summary = await runTick(runId);
  return NextResponse.json(summary);
}
