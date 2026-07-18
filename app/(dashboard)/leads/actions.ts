"use server";

import { db } from "@/lib/db";
import { leads, leadEvents } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "demo-key");

export async function createLead(input: {
  name: string;
  email: string;
  company?: string;
  source: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  if (!input.email || !input.name) {
    throw new Error("Naam en e-mail zijn verplicht");
  }

  const existing = await db.query.leads.findFirst({
    where: eq(leads.email, input.email.toLowerCase()),
  });
  if (existing) {
    throw new Error("Er bestaat al een lead met dit e-mailadres");
  }

  const id = crypto.randomUUID();
  await db.insert(leads).values({
    id,
    email: input.email.toLowerCase(),
    name: input.name,
    company: input.company || null,
    source: input.source || "manual",
    status: "new",
    score: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await db.insert(leadEvents).values({
    id: crypto.randomUUID(),
    leadId: id,
    type: "created",
    description: `Handmatig aangemaakt door ${session.user.email}`,
    createdAt: new Date(),
  });

  await logAudit({
    userId: session.user.id,
    action: "lead_created",
    resourceType: "lead",
    resourceId: id,
    after: input,
  });

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@candelaria-agency.com",
      to: "j.candelaria171@gmail.com",
      subject: `Nieuwe lead aangemaakt: ${input.name}`,
      html: `<p>Er is handmatig een nieuwe lead toegevoegd door ${session.user.email}.</p>
             <p><strong>Naam:</strong> ${input.name}</p>
             <p><strong>E-mail:</strong> ${input.email}</p>
             <p><strong>Bedrijf:</strong> ${input.company || "—"}</p>`,
    });
  } catch (err) {
    console.error("Failed to send lead notification:", err);
  }

  revalidatePath("/leads");
  return { id };
}

export async function updateLead(
  id: string,
  input: { name?: string; company?: string; status?: string; notes?: string }
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await db
    .update(leads)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(leads.id, id));

  await logAudit({
    userId: session.user.id,
    action: "lead_updated",
    resourceType: "lead",
    resourceId: id,
    after: input,
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
}

export async function deleteLead(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await db.delete(leads).where(eq(leads.id, id));

  await logAudit({
    userId: session.user.id,
    action: "lead_deleted",
    resourceType: "lead",
    resourceId: id,
  });

  revalidatePath("/leads");
}
