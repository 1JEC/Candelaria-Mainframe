import { db } from "@/lib/db";
import { users } from "@/drizzle/schema";

async function seed() {
  console.log("Seeding database...");

  try {
    // Insert test user (Fase 1: update with proper auth)
    const testUser = await db
      .insert(users)
      .values({
        id: "test-user-1",
        email: "j.candelaria171@gmail.com",
        name: "Johan Candelaria",
        role: "admin",
        isActive: true,
      })
      .returning();

    console.log("✅ Seed complete:", testUser);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seed();
