"use server";

import { db } from "@/lib/db";
import { users, integrationCredentials, settings } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { auth, generateTOTPSecret, verifyTOTP } from "@/lib/auth";
import { encryptCredential } from "@/lib/crypto";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function saveIntegrationCredential(provider: string, token: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!token.trim()) throw new Error("Vul een geldige API-key/token in");

  const existing = await db.query.integrationCredentials.findFirst({
    where: and(
      eq(integrationCredentials.userId, session.user.id),
      eq(integrationCredentials.provider, provider)
    ),
  });

  const encryptedToken = encryptCredential(token);

  if (existing) {
    await db
      .update(integrationCredentials)
      .set({ encryptedToken, isActive: true, updatedAt: new Date() })
      .where(eq(integrationCredentials.id, existing.id));
  } else {
    await db.insert(integrationCredentials).values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      provider,
      encryptedToken,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  await logAudit({
    userId: session.user.id,
    action: "integration_credential_saved",
    resourceType: "integration_credentials",
    resourceId: provider,
  });

  revalidatePath("/settings");
}

export async function updateIntakeAutoReply(formTypes: string[]) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const existing = await db.query.settings.findFirst({
    where: eq(settings.userId, session.user.id),
  });

  if (existing) {
    await db
      .update(settings)
      .set({ intakeAutoReplyFormTypes: formTypes, updatedAt: new Date() })
      .where(eq(settings.id, existing.id));
  } else {
    await db.insert(settings).values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      intakeAutoReplyFormTypes: formTypes,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  await logAudit({
    userId: session.user.id,
    action: "intake_autoreply_settings_updated",
    resourceType: "settings",
    after: { intakeAutoReplyFormTypes: formTypes },
  });

  revalidatePath("/settings");
}

export async function startTotpSetup() {
  const session = await auth();
  if (!session?.user?.email) throw new Error("Unauthorized");

  return generateTOTPSecret(session.user.email);
}

export async function confirmTotpSetup(secret: string, code: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const valid = await verifyTOTP(secret, code);
  if (!valid) {
    throw new Error("Ongeldige code. Probeer opnieuw.");
  }

  await db.update(users).set({ totpSecret: secret }).where(eq(users.id, session.user.id));

  await logAudit({
    userId: session.user.id,
    action: "2fa_enabled",
    resourceType: "user",
    resourceId: session.user.id,
  });

  revalidatePath("/settings");
}
