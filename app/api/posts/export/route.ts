import { db } from "@/lib/db";
import { posts } from "@/drizzle/schema";
import { desc } from "drizzle-orm";
import { toCsv, csvResponse } from "@/lib/csv";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const rows = await db.select().from(posts).orderBy(desc(posts.createdAt));

  const csv = toCsv(
    rows.map((r) => ({ ...r, platforms: r.platforms?.join("; ") })),
    [
      { key: "platforms", label: "Platforms" },
      { key: "contentType", label: "Type" },
      { key: "status", label: "Status" },
      { key: "scheduledFor", label: "Ingepland voor" },
      { key: "publishedAt", label: "Gepubliceerd op" },
      { key: "createdAt", label: "Aangemaakt" },
    ]
  );

  return csvResponse("posts.csv", csv);
}
