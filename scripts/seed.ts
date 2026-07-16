import { db } from "@/lib/db";
import { users, settings as settingsTable } from "@/drizzle/schema";
import { hashPassword, generateTOTPSecret } from "@/lib/auth";

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Create test user (admin with 2FA capability)
    const testUserId = "test-admin-001";
    const testEmail = "j.candelaria171@gmail.com";
    const testPassword = "TempPassword123!"; // Change this in production

    // Hash password
    const passwordHash = hashPassword(testPassword);

    // Generate TOTP secret for 2FA
    const { secret: totpSecret } = await generateTOTPSecret(testEmail);

    // Insert user
    const insertedUser = await db
      .insert(users)
      .values({
        id: testUserId,
        email: testEmail,
        name: "Johan Candelaria",
        passwordHash,
        totpSecret, // Admin has 2FA enabled
        role: "admin",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    console.log("✅ User created:", insertedUser[0]?.email);

    // Create settings for user
    const settingsId = `settings-${testUserId}`;
    const insertedSettings = await db
      .insert(settingsTable)
      .values({
        id: settingsId,
        userId: testUserId,
        brand: {
          name: "Candelaria Agency",
          colors: {
            black: "#000000",
            green: "#1a7f3f",
            white: "#ffffff",
          },
        },
        autoPublishCategories: ["weekly_newsletter"],
        outreachApprovalRequired: true,
        emailAutoReplyCategories: ["acknowledgment"],
        suppressionListDomains: [],
        suppressionListEmails: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    console.log("✅ Settings created for user");

    // Summary
    console.log("\n📋 Seed Summary:");
    console.log(`  Email: ${testEmail}`);
    console.log(`  Password: ${testPassword} (CHANGE THIS!)`);
    console.log(`  Role: Admin (2FA enabled)`);
    console.log(`  TOTP Secret: ${totpSecret}`);
    console.log(`\n⚠️  IMPORTANT: Change the default password after first login!`);
    console.log(`💡 For 2FA testing, use: npm run db:studio`);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seed();
