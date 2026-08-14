import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/drizzle/schema";
import { desc, and, or, ilike, eq, gte, isNotNull } from "drizzle-orm";
import { toCsv, csvResponse } from "@/lib/csv";
import { auth } from "@/lib/auth";

// Mirrors the /leads page's own filter logic — previously this route
// ignored every query param and always exported the full table (a
// pre-existing gap; fixed here since Phase 7 ties export directly to
// "what you're currently looking at" in the list UI).
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const params = req.nextUrl.searchParams;
  const q = params.get("q")?.trim();
  const status = params.get("status") ?? undefined;
  const priority = params.get("priority") ?? undefined;
  const sector = params.get("sector") ?? undefined;
  const city = params.get("city") ?? undefined;
  const scoreMin = params.get("scoreMin") ? Number(params.get("scoreMin")) : undefined;
  const hasEmail = params.get("hasEmail") === "1";

  const conditions = [];
  if (q) conditions.push(or(ilike(leads.name, `%${q}%`), ilike(leads.email, `%${q}%`), ilike(leads.company, `%${q}%`)));
  if (status) conditions.push(eq(leads.status, status));
  if (priority) conditions.push(eq(leads.priority, priority));
  if (sector) conditions.push(eq(leads.sector, sector));
  if (city) conditions.push(eq(leads.city, city));
  if (scoreMin !== undefined && !Number.isNaN(scoreMin)) conditions.push(gte(leads.totalScore, scoreMin));
  if (hasEmail) conditions.push(isNotNull(leads.email));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db.select().from(leads).where(where).orderBy(desc(leads.totalScore), desc(leads.createdAt));

  const csv = toCsv(rows, [
    { key: "name", label: "Naam" },
    { key: "company", label: "Bedrijf" },
    { key: "email", label: "E-mail" },
    { key: "phoneE164", label: "Telefoon" },
    { key: "city", label: "Plaats" },
    { key: "sector", label: "Sector" },
    { key: "status", label: "Status" },
    { key: "totalScore", label: "Score" },
    { key: "priority", label: "Prioriteit" },
    { key: "recommendedOffer", label: "Aanbevolen aanbod" },
    { key: "source", label: "Bron" },
    { key: "createdAt", label: "Aangemaakt" },
  ]);

  return csvResponse("leads.csv", csv);
}
