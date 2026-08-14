import { db } from "@/lib/db";
import { sendLog, replies } from "@/drizzle/schema";
import { gte, sql } from "drizzle-orm";

export interface DayStats {
  date: string; // YYYY-MM-DD
  sent: number;
  bounced: number;
  replied: number;
}

/** §10: "30-day chart: sends, bounces, replies." Real data, zero rows when there's been no activity — never fabricated to fill the chart. */
export async function get30DayStats(): Promise<DayStats[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [sendRows, replyRows] = await Promise.all([
    db
      .select({
        date: sql<string>`to_char(${sendLog.ts}, 'YYYY-MM-DD')`,
        sent: sql<number>`count(*) filter (where ${sendLog.result} = 'sent')::int`,
        bounced: sql<number>`count(*) filter (where ${sendLog.result} = 'bounce')::int`,
      })
      .from(sendLog)
      .where(gte(sendLog.ts, since))
      .groupBy(sql`to_char(${sendLog.ts}, 'YYYY-MM-DD')`),
    db
      .select({ date: sql<string>`to_char(${replies.receivedAt}, 'YYYY-MM-DD')`, replied: sql<number>`count(*)::int` })
      .from(replies)
      .where(gte(replies.receivedAt, since))
      .groupBy(sql`to_char(${replies.receivedAt}, 'YYYY-MM-DD')`),
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
