import { db } from "@/lib/db";
import { leads } from "@/drizzle/schema";
import { desc } from "drizzle-orm";
import { toCsv, csvResponse } from "@/lib/csv";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const rows = await db.select().from(leads).orderBy(desc(leads.createdAt));

  const csv = toCsv(rows, [
    { key: "name", label: "Naam" },
    { key: "company", label: "Bedrijf" },
    { key: "email", label: "E-mail" },
    { key: "status", label: "Status" },
    { key: "score", label: "Score" },
    { key: "source", label: "Bron" },
    { key: "createdAt", label: "Aangemaakt" },
  ]);

  return csvResponse("leads.csv", csv);
}
