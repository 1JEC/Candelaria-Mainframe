import { db } from "@/db";
import { prospectSendLog, prospectReplies } from "@/db/schema";
import { gte, sql } from "drizzle-orm";

export interface DayStats {
  date: string; // YYYY-MM-DD
  sent: number;
  bounced: number;
  replied: number;
}

/** §10: "30-day chart: sends, bounces, prospectReplies." Real data, zero rows when there's been no activity — never fabricated to fill the chart. */
export async function get30DayStats(): Promise<DayStats[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [sendRows, replyRows] = await Promise.all([
    db
      .select({
        date: sql<string>`to_char(${prospectSendLog.ts}, 'YYYY-MM-DD')`,
        sent: sql<number>`count(*) filter (where ${prospectSendLog.result} = 'sent')::int`,
        bounced: sql<number>`count(*) filter (where ${prospectSendLog.result} = 'bounce')::int`,
      })
      .from(prospectSendLog)
      .where(gte(prospectSendLog.ts, since))
      .groupBy(sql`to_char(${prospectSendLog.ts}, 'YYYY-MM-DD')`),
    db
      .select({ date: sql<string>`to_char(${prospectReplies.receivedAt}, 'YYYY-MM-DD')`, replied: sql<number>`count(*)::int` })
      .from(prospectReplies)
      .where(gte(prospectReplies.receivedAt, since))
      .groupBy(sql`to_char(${prospectReplies.receivedAt}, 'YYYY-MM-DD')`),
  ]);

  const byDate = new Map<string, DayStats>();
  for (const row of sendRows) byDate.set(row.date, { date: row.date, sent: row.sent, bounced: row.bounced, replied: 0 });
  for (const row of replyRows) {
    const existing = byDate.get(row.date);
    if (existing) existing.replied = row.replied;
    else byDate.set(row.date, { date: row.date, sent: 0, bounced: 0, replied: row.replied });
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}
