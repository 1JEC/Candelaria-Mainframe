import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { runDnsChecks } from "@/lib/leads-agent/health/dns-check";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return new Response("Unauthorized", { status: guard.status });

  const domain = req.nextUrl.searchParams.get("domain") ?? process.env.OUTREACH_DOMAIN;
  if (!domain) return NextResponse.json({ error: "OUTREACH_DOMAIN is niet geconfigureerd." }, { status: 400 });

  const forceRefresh = req.nextUrl.searchParams.get("refresh") === "1";
  const checks = await runDnsChecks(domain, { forceRefresh, dkimSelector: process.env.DKIM_SELECTOR });
  return NextResponse.json({ domain, checks, checkedAt: new Date().toISOString() });
}
