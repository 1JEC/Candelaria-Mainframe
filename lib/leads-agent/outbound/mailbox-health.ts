import { db } from "@/lib/db";
import { mailboxes, sendLog } from "@/drizzle/schema";
import { desc, eq } from "drizzle-orm";

const BOUNCE_PAUSE_THRESHOLD = Number(process.env.BOUNCE_PAUSE_THRESHOLD ?? 0.03);
const SAMPLE_SIZE = 50;

/** §9: "Auto-pause a mailbox at >3% bounces over the last 50 sends." Setting health='red' is what send-gates.ts's gate 4 checks to block further sends from that mailbox. */
export async function checkAndPauseMailboxes(): Promise<{ mailboxId: string; bounceRate: number; paused: boolean }[]> {
  const allMailboxes = await db.select().from(mailboxes);
  const results = [];

  for (const mailbox of allMailboxes) {
    const recent = await db.select({ result: sendLog.result }).from(sendLog).where(eq(sendLog.mailboxId, mailbox.id)).orderBy(desc(sendLog.ts)).limit(SAMPLE_SIZE);

    if (recent.length === 0) continue;
    const bounces = recent.filter((r) => r.result === "bounce").length;
    const bounceRate = bounces / recent.length;
    const shouldPause = bounceRate > BOUNCE_PAUSE_THRESHOLD && mailbox.health !== "red";

    if (shouldPause) {
      await db
        .update(mailboxes)
        .set({ health: "red", lastError: `Automatisch gepauzeerd: ${(bounceRate * 100).toFixed(1)}% bounces over de laatste ${recent.length} verzendingen.` })
        .where(eq(mailboxes.id, mailbox.id));
    }

    results.push({ mailboxId: mailbox.id, bounceRate, paused: shouldPause });
  }

  return results;
}
