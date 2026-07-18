import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { intakeSubmissions, leads, leadEvents } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "@/lib/audit";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "demo-key");
const INTAKE_SECRET = process.env.INTAKE_API_KEY || "changeme";

export async function POST(req: NextRequest) {
  // Verify secret token
  const token = req.headers.get("x-intake-token");
  if (token !== INTAKE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await req.json();

    // Validate required fields
    if (!payload.email || !payload.name || !payload.formType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Anti-spam: honeypot check
    const isSpam = payload.honeypot || payload.website?.includes("viagra");
    const spamScore = isSpam ? 100 : 0;

    // Create intake submission
    const submissionId = crypto.randomUUID();
    await db.insert(intakeSubmissions).values({
      id: submissionId,
      formType: payload.formType,
      source: "website",
      email: payload.email,
      name: payload.name,
      company: payload.company,
      website: payload.website,
      phone: payload.phone,
      message: payload.message,
      payload,
      isSpam: spamScore > 50,
      spamScore,
      createdAt: new Date(),
    });

    // If not spam, create lead
    let leadId: string | null = null;
    if (!isSpam) {
      leadId = crypto.randomUUID();

      // Check if lead already exists (by email)
      const existing = await db.query.leads.findFirst({
        where: eq(leads.email, payload.email),
      });

      if (existing) {
        // Update existing lead
        leadId = existing.id;
        await db
          .update(leads)
          .set({
            name: payload.name || existing.name,
            company: payload.company || existing.company,
            website: payload.website || existing.website,
            phone: payload.phone || existing.phone,
            updatedAt: new Date(),
          })
          .where(eq(leads.id, leadId));
      } else {
        // Create new lead
        await db.insert(leads).values({
          id: leadId,
          email: payload.email,
          name: payload.name,
          company: payload.company,
          website: payload.website,
          phone: payload.phone,
          source: "website",
          sourceId: submissionId,
          status: "new",
          score: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Add lead event
        await db.insert(leadEvents).values({
          id: crypto.randomUUID(),
          leadId,
          type: "email_received",
          description: `New ${payload.formType} submission from website`,
          metadata: payload,
          createdAt: new Date(),
        });
      }

      // Update submission with lead ID
      await db
        .update(intakeSubmissions)
        .set({ convertedToLeadId: leadId })
        .where(eq(intakeSubmissions.id, submissionId));

      // Send email notification to admin
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "noreply@candelaria-agency.com",
          to: "j.candelaria171@gmail.com", // TODO: Make configurable
          subject: `Nieuwe ${payload.formType} aanvraag: ${payload.name}`,
          html: `
            <h2>Nieuwe formulieraanvraag</h2>
            <p><strong>Naam:</strong> ${payload.name}</p>
            <p><strong>E-mail:</strong> ${payload.email}</p>
            <p><strong>Bedrijf:</strong> ${payload.company || "—"}</p>
            <p><strong>Website:</strong> ${payload.website || "—"}</p>
            <p><strong>Telefoon:</strong> ${payload.phone || "—"}</p>
            <p><strong>Bericht:</strong></p>
            <p>${payload.message || "—"}</p>
            <p><a href="${process.env.NEXTAUTH_URL || "https://mainframe-hq.vercel.app"}/leads">Bekijk in portaal</a></p>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send email:", emailError);
        // Don't fail the intake if email fails
      }

      // Log audit
      await logAudit({
        action: "intake_submitted",
        resourceType: "intake_submission",
        resourceId: submissionId,
        metadata: {
          formType: payload.formType,
          leadId,
          email: payload.email,
        },
      });
    }

    return NextResponse.json({
      success: true,
      submissionId,
      leadId,
      message: isSpam ? "Spam detected" : "Submission received",
    });
  } catch (error) {
    console.error("Intake error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
