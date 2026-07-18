import { db } from "@/lib/db";
import {
  users,
  settings as settingsTable,
  leads,
  leadEvents,
  outreachTasks,
  posts,
  postVersions,
  postInsightsDaily,
  emails,
  auditLog,
  agentRuns,
} from "@/drizzle/schema";
import { hashPassword, generateTOTPSecret } from "@/lib/auth";

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

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
    await db
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

    // ============ LEADS (Nederlandse MKB) ============
    const leadSeeds = [
      {
        id: "lead-001",
        email: "info@bakkerijvandijk.nl",
        name: "Peter van Dijk",
        company: "Bakkerij Van Dijk",
        website: "https://bakkerijvandijk.nl",
        phone: "0612345678",
        source: "website",
        status: "qualified",
        score: 78,
        daysOld: 12,
      },
      {
        id: "lead-002",
        email: "praktijk@fysiodebruin.nl",
        name: "Sanne de Bruin",
        company: "Fysiotherapie De Bruin",
        website: "https://fysiodebruin.nl",
        phone: "0623456789",
        source: "referral",
        status: "contacted",
        score: 55,
        daysOld: 8,
      },
      {
        id: "lead-003",
        email: "contact@installatiejansen.nl",
        name: "Mark Jansen",
        company: "Installatiebedrijf Jansen",
        website: "https://installatiejansen.nl",
        phone: "0634567890",
        source: "website",
        status: "new",
        score: 20,
        daysOld: 1,
      },
      {
        id: "lead-004",
        email: "info@tandartsgroenveld.nl",
        name: "Dr. Lotte Groenveld",
        company: "Tandartspraktijk Groenveld",
        website: "https://tandartsgroenveld.nl",
        phone: "0645678901",
        source: "google_places",
        status: "won",
        score: 92,
        daysOld: 30,
      },
      {
        id: "lead-005",
        email: "verkoop@autobedrijfdevries.nl",
        name: "Henk de Vries",
        company: "Autobedrijf De Vries",
        website: "https://autobedrijfdevries.nl",
        phone: "0656789012",
        source: "website",
        status: "lost",
        score: 15,
        daysOld: 20,
      },
      {
        id: "lead-006",
        email: "hallo@kapsalonmooi.nl",
        name: "Femke Mooi",
        company: "Kapsalon Mooi",
        website: "https://kapsalonmooi.nl",
        phone: "0667890123",
        source: "website",
        status: "new",
        score: 10,
        daysOld: 0,
      },
    ];

    for (const lead of leadSeeds) {
      await db.insert(leads).values({
        id: lead.id,
        email: lead.email,
        name: lead.name,
        company: lead.company,
        website: lead.website,
        phone: lead.phone,
        source: lead.source,
        status: lead.status,
        score: lead.score,
        createdAt: daysAgo(lead.daysOld),
        updatedAt: daysAgo(Math.max(0, lead.daysOld - 1)),
      });

      await db.insert(leadEvents).values({
        id: crypto.randomUUID(),
        leadId: lead.id,
        type: "email_received",
        description: `Nieuwe ${lead.source === "website" ? "website" : lead.source}-aanvraag van ${lead.name}`,
        createdAt: daysAgo(lead.daysOld),
      });
    }
    console.log(`✅ ${leadSeeds.length} leads geseed`);

    // ============ OUTREACH TASKS ============
    const outreachSeeds = [
      { leadId: "lead-002", taskType: "follow_up_call", status: "pending", notes: "Terugbellen over intake-tarieven" },
      { leadId: "lead-003", taskType: "send_intro_email", status: "pending", notes: "Introductiemail met portfolio versturen" },
      { leadId: "lead-004", taskType: "send_proposal", status: "completed", notes: "Voorstel verzonden en geaccepteerd" },
      { leadId: "lead-005", taskType: "follow_up_call", status: "completed", notes: "Geen interesse, gearchiveerd" },
    ];
    for (const task of outreachSeeds) {
      await db.insert(outreachTasks).values({
        id: crypto.randomUUID(),
        leadId: task.leadId,
        taskType: task.taskType,
        status: task.status,
        notes: task.notes,
        completedAt: task.status === "completed" ? daysAgo(2) : null,
        createdAt: daysAgo(5),
      });
    }
    console.log(`✅ ${outreachSeeds.length} outreach-taken geseed`);

    // ============ SOCIAL POSTS ============
    const postSeeds = [
      {
        id: "post-001",
        platforms: ["Instagram", "Facebook"],
        status: "published",
        contentType: "image",
        caption: "Verse stokbroden net uit de oven bij Bakkerij Van Dijk! 🥖 #vers #lokaal",
        daysOld: 6,
      },
      {
        id: "post-002",
        platforms: ["LinkedIn"],
        status: "published",
        contentType: "text",
        caption: "5 tips om rugklachten te voorkomen op kantoor — door Fysiotherapie De Bruin.",
        daysOld: 4,
      },
      {
        id: "post-003",
        platforms: ["Instagram"],
        status: "scheduled",
        contentType: "carousel",
        caption: "Onze nieuwe voorjaarscollectie is binnen! Kom langs bij Kapsalon Mooi.",
        daysOld: -2,
      },
      {
        id: "post-004",
        platforms: ["Facebook", "X"],
        status: "draft",
        contentType: "text",
        caption: "Concept: aankondiging verlengde openingstijden in de zomer.",
        daysOld: 0,
      },
    ];

    for (const post of postSeeds) {
      await db.insert(posts).values({
        id: post.id,
        userId: testUserId,
        platforms: post.platforms,
        status: post.status,
        contentType: post.contentType,
        publishedAt: post.status === "published" ? daysAgo(post.daysOld) : null,
        scheduledFor: post.status === "scheduled" ? daysAgo(post.daysOld) : null,
        createdAt: daysAgo(Math.max(post.daysOld, 0) + 1),
        updatedAt: daysAgo(Math.max(post.daysOld, 0)),
      });

      await db.insert(postVersions).values({
        id: crypto.randomUUID(),
        postId: post.id,
        version: 1,
        caption: post.caption,
        createdAt: daysAgo(Math.max(post.daysOld, 0) + 1),
      });

      if (post.status === "published") {
        await db.insert(postInsightsDaily).values({
          id: crypto.randomUUID(),
          postId: post.id,
          platform: post.platforms[0],
          date: daysAgo(post.daysOld),
          impressions: 1200 + Math.floor(Math.random() * 800),
          reach: 900 + Math.floor(Math.random() * 500),
          likes: 40 + Math.floor(Math.random() * 60),
          comments: 2 + Math.floor(Math.random() * 8),
          shares: 1 + Math.floor(Math.random() * 5),
        });
      }
    }
    console.log(`✅ ${postSeeds.length} posts geseed`);

    // ============ EMAILS (MAILBOX) ============
    const emailSeeds = [
      {
        from: "info@bakkerijvandijk.nl",
        to: testEmail,
        subject: "Vraag over onderhoudspakket",
        isInbound: true,
        category: "sales_inquiry",
        priority: 1,
        daysOld: 1,
      },
      {
        from: "praktijk@fysiodebruin.nl",
        to: testEmail,
        subject: "Factuur juni ontvangen, bedankt!",
        isInbound: true,
        category: "acknowledgment",
        priority: 3,
        daysOld: 3,
      },
      {
        from: testEmail,
        to: "contact@installatiejansen.nl",
        subject: "Welkom bij Candelaria Agency",
        isInbound: false,
        category: null,
        priority: null,
        daysOld: 1,
      },
      {
        from: "info@tandartsgroenveld.nl",
        to: testEmail,
        subject: "Kunnen we de social kalender bespreken?",
        isInbound: true,
        category: "support",
        priority: 2,
        daysOld: 5,
      },
      {
        from: "verkoop@autobedrijfdevries.nl",
        to: testEmail,
        subject: "Afmelden nieuwsbrief",
        isInbound: true,
        category: "opt_out",
        priority: 3,
        daysOld: 10,
      },
    ];

    for (const email of emailSeeds) {
      await db.insert(emails).values({
        id: crypto.randomUUID(),
        from: email.from,
        to: email.to,
        subject: email.subject,
        bodyPlain: email.subject,
        isInbound: email.isInbound,
        isSent: !email.isInbound,
        folder: "inbox",
        flags: email.daysOld > 5 ? ["read"] : [],
        aiTriageCategory: email.category,
        aiTriagePriority: email.priority,
        receivedAt: email.isInbound ? daysAgo(email.daysOld) : null,
        createdAt: daysAgo(email.daysOld),
      });
    }
    console.log(`✅ ${emailSeeds.length} e-mails geseed`);

    // ============ AGENT RUNS ============
    const agentRunSeeds = [
      { agentType: "prospector", module: "prospecting", summary: "Nieuwe leads gezocht via Google Places", daysOld: 2 },
      { agentType: "email-triage", module: "mailbox", summary: "Inkomende e-mails getrieerd op prioriteit", daysOld: 1 },
      { agentType: "content-generator", module: "social", summary: "Conceptcaption gegenereerd voor Kapsalon Mooi", daysOld: 2 },
    ];
    for (const run of agentRunSeeds) {
      await db.insert(agentRuns).values({
        id: crypto.randomUUID(),
        agentType: run.agentType,
        module: run.module,
        outputSummary: run.summary,
        success: true,
        startedAt: daysAgo(run.daysOld),
        completedAt: daysAgo(run.daysOld),
        duration: 4000 + Math.floor(Math.random() * 6000),
        createdAt: daysAgo(run.daysOld),
      });
    }
    console.log(`✅ ${agentRunSeeds.length} agent runs geseed`);

    // ============ AUDIT LOG (historisch) ============
    const auditSeeds = [
      { action: "user_login", resourceType: "user", daysOld: 3 },
      { action: "lead_created", resourceType: "lead", resourceId: "lead-004", daysOld: 30 },
      { action: "post_created", resourceType: "post", resourceId: "post-001", daysOld: 6 },
      { action: "post_status_updated", resourceType: "post", resourceId: "post-001", daysOld: 6 },
      { action: "outreach_task_completed", resourceType: "outreach_task", daysOld: 2 },
    ];
    for (const entry of auditSeeds) {
      await db.insert(auditLog).values({
        id: crypto.randomUUID(),
        userId: testUserId,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        ip: "127.0.0.1",
        createdAt: daysAgo(entry.daysOld),
      });
    }
    console.log(`✅ ${auditSeeds.length} audit log entries geseed`);

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
