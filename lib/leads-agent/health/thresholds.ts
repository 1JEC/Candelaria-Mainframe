import { db } from "@/db";
import { prospectSendLog, prospectReplies, prospectMailboxes } from "@/db/schema";
import { eq, gte, sql } from "drizzle-orm";
import { checkSendWindow } from "@/lib/leads-agent/outbound/send-window";

export interface ThresholdWarning {
  code: string;
  status: "green" | "amber" | "red";
  message: string;
}

/** §10: plain-language warnings, computed from real send/reply history. */
export async function checkThresholds(): Promise<ThresholdWarning[]> {
  const warnings: ThresholdWarning[] = [];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [sendStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      bounces: sql<number>`count(*) filter (where ${prospectSendLog.result} = 'bounce')::int`,
    })
    .from(prospectSendLog)
    .where(gte(prospectSendLog.ts, thirtyDaysAgo));

  const totalSends = sendStats?.total ?? 0;
  const bounces = sendStats?.bounces ?? 0;
  const bounceRate = totalSends > 0 ? bounces / totalSends : 0;

  warnings.push({
    code: "bounce_rate",
    status: bounceRate > 0.03 ? "red" : "green",
    message:
      totalSends === 0
        ? "Nog geen verzendingen om een bounce-percentage te berekenen."
        : `Bounce-percentage (30 dagen): ${(bounceRate * 100).toFixed(1)}% ${bounceRate > 0.03 ? "— boven de 3% drempel." : "— binnen norm."}`,
  });

  const [spamComplaint] = await db.select({ count: sql<number>`count(*)::int` }).from(prospectSendLog).where(eq(prospectSendLog.result, "spam_complaint"));
  warnings.push({
    code: "spam_complaint",
    status: (spamComplaint?.count ?? 0) > 0 ? "red" : "green",
    message: (spamComplaint?.count ?? 0) > 0 ? `${spamComplaint!.count} spamklacht(en) geregistreerd.` : "Geen spamklachten.",
  });

  if (totalSends >= 100) {
    const [replyStats] = await db.select({ count: sql<number>`count(*)::int` }).from(prospectReplies).where(gte(prospectReplies.receivedAt, thirtyDaysAgo));
    const replyRate = (replyStats?.count ?? 0) / totalSends;
    warnings.push({
      code: "reply_rate",
      status: replyRate < 0.01 ? "amber" : "green",
      message: `Reactiepercentage (30 dagen): ${(replyRate * 100).toFixed(1)}% na ${totalSends} verzendingen ${replyRate < 0.01 ? "— onder de 1% na 100+ verzendingen, controleer targeting/inhoud." : ""}`,
    });
  }

  const windowCheck = checkSendWindow();
  warnings.push({
    code: "send_window",
    status: windowCheck.ok ? "green" : "amber",
    message: windowCheck.ok ? "Binnen verzendvenster." : (windowCheck.reason ?? "Buiten verzendvenster."),
  });

  const redMailboxes = await db.select({ address: prospectMailboxes.address, lastError: prospectMailboxes.lastError }).from(prospectMailboxes).where(eq(prospectMailboxes.health, "red"));
  if (redMailboxes.length > 0) {
    warnings.push({
      code: "mailbox_health",
      status: "red",
      message: `${redMailboxes.length} mailbox(en) gepauzeerd: ${redMailboxes.map((m) => m.address).join(", ")}.`,
    });
  }

  return warnings;
}
