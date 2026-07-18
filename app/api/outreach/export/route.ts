import { db } from "@/lib/db";
import { outreachTasks } from "@/drizzle/schema";
import { desc } from "drizzle-orm";
import { toCsv, csvResponse } from "@/lib/csv";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const rows = await db.select().from(outreachTasks).orderBy(desc(outreachTasks.createdAt));

  const csv = toCsv(rows, [
    { key: "taskType", label: "Type" },
    { key: "status", label: "Status" },
    { key: "notes", label: "Notities" },
    { key: "createdAt", label: "Aangemaakt" },
    { key: "completedAt", label: "Afgerond op" },
  ]);

  return csvResponse("outreach-tasks.csv", csv);
}
