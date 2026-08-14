import { db } from "@/lib/db";
import { outbox, sendLog, replies, mailboxes, leads } from "@/drizzle/schema";
import { desc, eq } from "drizzle-orm";
import { getConfig, DEFAULT_OUTBOUND_HALT } from "@/lib/leads-agent/config";
import { HaltSwitch } from "@/components/leads-agent/HaltSwitch";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Leads Agent — Outbound" };
export const dynamic = "force-dynamic";

const CLASSIFICATION_STYLES: Record<string, string> = {
  positive: "bg-green-100 text-green-800",
  negative: "bg-red-100 text-red-800",
  optout: "bg-red-100 text-red-800",
  bounce: "bg-orange-100 text-orange-800",
  ooo: "bg-blue-100 text-blue-800",
  neutral: "bg-gray-100 text-gray-700",
};

export default async function LeadsAgentOutboundPage() {
  const outboundEnabled = process.env.OUTBOUND_ENABLED === "true" && process.env.OUTBOUND_MODE === "live";
  const haltState = await getConfig<typeof DEFAULT_OUTBOUND_HALT>("outbound_halt");

  const [outboxRows, sendLogRows, replyRows, mailboxRows] = await Promise.all([
    db
      .select({ id: outbox.id, leadId: outbox.leadId, channel: outbox.channel, payloadJson: outbox.payloadJson, createdAt: outbox.createdAt, company: leads.company })
      .from(outbox)
      .innerJoin(leads, eq(outbox.leadId, leads.id))
      .orderBy(desc(outbox.createdAt))
      .limit(25),
    db.select().from(sendLog).orderBy(desc(sendLog.ts)).limit(25),
    db
      .select({ id: replies.id, company: leads.company, classification: replies.classification, confidence: replies.confidence, bodyText: replies.bodyText, prepBrief: replies.prepBrief, receivedAt: replies.receivedAt })
      .from(replies)
      .innerJoin(leads, eq(replies.leadId, leads.id))
      .orderBy(desc(replies.receivedAt))
      .limit(25),
    db.select().from(mailboxes),
  ]);

  return (
    <div className="space-y-6">
      {!outboundEnabled && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 text-sm rounded-lg px-4 py-3 font-medium">
          Proefmodus — er wordt niets verstuurd.
        </div>
      )}
      {haltState.halted && (
        <div className="bg-red-50 border border-red-200 text-red-900 text-sm rounded-lg px-4 py-3 font-medium">
          Noodstop actief — alle verzending is handmatig gepauzeerd, ongeacht andere instellingen.
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <span>
            Status: <strong className={outboundEnabled ? "text-red-600" : "text-gray-700"}>{outboundEnabled ? "LIVE" : "Proefmodus"}</strong>
          </span>
          <span>Mailboxen: {mailboxRows.length}</span>
          <span>Wachtrij: {outboxRows.length}</span>
        </div>
        <HaltSwitch halted={haltState.halted} />
      </div>

      {mailboxRows.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-brand-black mb-3">Mailboxen</h2>
          <div className="space-y-2">
            {mailboxRows.map((mb) => (
              <div key={mb.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2 last:border-0">
                <span>{mb.address}</span>
                <span className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{mb.sentToday}/{mb.dailyCap} vandaag</span>
                  <span className={`px-2 py-0.5 rounded ${mb.health === "red" ? "bg-red-100 text-red-800" : mb.health === "green" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                    {mb.health}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-brand-black mb-3">Wachtrij (laatste 25)</h2>
        {outboxRows.length > 0 ? (
          <div className="space-y-2">
            {outboxRows.map((row) => (
              <div key={row.id} className="text-sm border-b border-gray-100 pb-2 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{row.company}</span>
                  <span className="text-xs text-gray-400">{row.createdAt ? new Date(row.createdAt).toLocaleString("nl-NL") : "—"}</span>
                </div>
                <p className="text-xs text-gray-500">
                  {row.channel} —{" "}
                  {(row.payloadJson as { gateFailure?: { reason: string } } | null)?.gateFailure?.reason ?? "vastgehouden in proefmodus"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Nog niets in de wachtrij.</p>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-brand-black mb-3">Reacties</h2>
        {replyRows.length > 0 ? (
          <div className="space-y-3">
            {replyRows.map((reply) => (
              <div key={reply.id} className="border-b border-gray-100 pb-3 last:border-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{reply.company}</span>
                  {reply.classification && (
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${CLASSIFICATION_STYLES[reply.classification] ?? "bg-gray-100 text-gray-700"}`}>
                      {reply.classification}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{reply.bodyText}</p>
                {reply.prepBrief && <p className="text-xs text-brand-green mt-1">Belvoorbereiding: {reply.prepBrief}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Nog geen reacties ontvangen.</p>
        )}
      </div>

      {sendLogRows.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-brand-black mb-3">Verzendlog (laatste 25)</h2>
          <div className="space-y-1">
            {sendLogRows.map((row) => (
              <div key={row.id} className="flex items-center justify-between text-xs text-gray-600">
                <span>{row.result}: {row.reason}</span>
                <span className="text-gray-400">{row.ts ? new Date(row.ts).toLocaleString("nl-NL") : "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
