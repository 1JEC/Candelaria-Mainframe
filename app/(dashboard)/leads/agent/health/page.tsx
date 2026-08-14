import { runDnsChecks } from "@/lib/leads-agent/health/dns-check";
import { checkDomainAge, checkRedirect } from "@/lib/leads-agent/health/domain-age";
import { checkThresholds } from "@/lib/leads-agent/health/thresholds";
import { get30DayStats } from "@/lib/leads-agent/health/chart-data";
import { getConfig, DEFAULT_GOLIVE_CHECKLIST, GOLIVE_CHECKLIST_ITEMS } from "@/lib/leads-agent/config";
import { DnsPanel } from "@/components/leads-agent/DnsPanel";
import { GoLiveChecklist } from "@/components/leads-agent/GoLiveChecklist";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Leads Agent — Health" };
export const dynamic = "force-dynamic";

const STATUS_DOT: Record<string, string> = { green: "bg-green-500", amber: "bg-yellow-500", red: "bg-red-500" };

export default async function LeadsAgentHealthPage() {
  const domain = process.env.OUTREACH_DOMAIN;
  const checklist = await getConfig<typeof DEFAULT_GOLIVE_CHECKLIST>("golive_checklist");
  const [thresholds, chartStats] = await Promise.all([checkThresholds(), get30DayStats()]);

  let dnsChecks = null;
  let domainAge = null;
  let redirectCheck = null;
  if (domain) {
    [dnsChecks, domainAge, redirectCheck] = await Promise.all([runDnsChecks(domain, { dkimSelector: process.env.DKIM_SELECTOR }), checkDomainAge(domain), checkRedirect(domain)]);
  }

  const maxSent = Math.max(1, ...chartStats.map((d) => d.sent));

  return (
    <div className="space-y-6">
      {domain ? (
        <>
          <DnsPanel domain={domain} initialChecks={dnsChecks!} checkedAt={new Date().toISOString()} />

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-brand-black mb-3">Domein</h2>
            <div className="space-y-2 text-sm">
              {domainAge!.error ? (
                <p className="text-gray-500">{domainAge!.error}</p>
              ) : (
                <p>
                  Geregistreerd: {domainAge!.registeredAt ? new Date(domainAge!.registeredAt).toLocaleDateString("nl-NL") : "onbekend"} (
                  {domainAge!.ageDays} dagen oud) — {domainAge!.meetsMinimum ? "voldoet aan minimum van 14 dagen" : "nog geen 14 dagen oud"}
                </p>
              )}
              {redirectCheck!.error ? (
                <p className="text-gray-500">{redirectCheck!.error}</p>
              ) : (
                <p>Redirect: {redirectCheck!.finalUrl ?? "geen"}</p>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
          <p className="text-gray-600">
            <code>OUTREACH_DOMAIN</code> is niet geconfigureerd — DNS-checks en domeinleeftijd kunnen pas na configuratie worden getoond.
          </p>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-brand-black mb-3">Drempelwaarden</h2>
        <div className="space-y-2">
          {thresholds.map((w) => (
            <div key={w.code} className="flex items-start gap-3 py-1.5">
              <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[w.status]}`} />
              <p className="text-sm text-gray-700">{w.message}</p>
            </div>
          ))}
        </div>
      </div>

      <GoLiveChecklist items={GOLIVE_CHECKLIST_ITEMS} initialChecked={checklist.items} />

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-brand-black mb-3">Laatste 30 dagen</h2>
        {chartStats.length > 0 ? (
          <div className="space-y-2">
            {chartStats.map((day) => (
              <div key={day.date} className="flex items-center gap-3 text-xs">
                <span className="w-20 text-gray-500 flex-shrink-0">{day.date}</span>
                <div className="flex-1 bg-gray-100 rounded h-4 relative overflow-hidden">
                  <div className="bg-brand-green h-4 rounded" style={{ width: `${(day.sent / maxSent) * 100}%` }} />
                </div>
                <span className="w-32 text-gray-600 flex-shrink-0">
                  {day.sent} verzonden, {day.bounced} bounces, {day.replied} reacties
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Nog geen verzendactiviteit in de laatste 30 dagen.</p>
        )}
      </div>
    </div>
  );
}
