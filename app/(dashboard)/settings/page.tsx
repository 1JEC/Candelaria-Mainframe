import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, integrationCredentials, settings as settingsTable } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import IntegrationConfigButton from "@/components/settings/IntegrationConfigButton";
import TwoFactorSetup from "@/components/settings/TwoFactorSetup";
import IntakeAutoReplySettings from "@/components/settings/IntakeAutoReplySettings";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  const providers = [
    { key: "meta", label: "Meta Graph API" },
    { key: "x", label: "X API" },
    { key: "resend", label: "Resend" },
    { key: "proton", label: "Proton Mail" },
  ];

  const credentials = await db
    .select()
    .from(integrationCredentials)
    .where(and(eq(integrationCredentials.userId, session.user.id)));

  const configuredProviders = new Set(
    credentials.filter((c) => c.isActive).map((c) => c.provider)
  );

  const userSettings = await db.query.settings.findFirst({
    where: eq(settingsTable.userId, session.user.id),
  });

  return (
    <div>
      <h1 className="text-3xl font-bold text-brand-black mb-8">Settings</h1>

      <div className="max-w-2xl space-y-8">
        {/* User Account */}
        <section className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold text-brand-black mb-4">
            Account
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={user?.name || ""}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <input
                type="text"
                value={user?.role || "user"}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 cursor-not-allowed"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Account edits coming in future phases.
          </p>
        </section>

        {/* Security */}
        <section className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold text-brand-black mb-4">
            Security
          </h2>
          {user?.role === "admin" ? (
            <TwoFactorSetup enabled={Boolean(user?.totpSecret)} />
          ) : (
            <p className="text-sm text-gray-600">
              2FA is only available for admin accounts.
            </p>
          )}
        </section>

        {/* Integrations */}
        <section className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold text-brand-black mb-4">
            Integrations
          </h2>
          <div className="space-y-3">
            {providers.map((provider) => (
              <IntegrationCard
                key={provider.key}
                provider={provider.key}
                name={provider.label}
                configured={configuredProviders.has(provider.key)}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Handmatige API-key opslag; volledige OAuth-koppeling volgt zodra de app-credentials
            per provider zijn aangeleverd (zie project-CLAUDE.md).
          </p>
        </section>

        {/* Offertes / intake */}
        <section className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold text-brand-black mb-4">
            Automatische bevestigingsmail
          </h2>
          <IntakeAutoReplySettings enabledTypes={userSettings?.intakeAutoReplyFormTypes || []} />
        </section>

        {/* Database */}
        <section className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold text-brand-black mb-4">
            Database
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            View your database via Drizzle Studio:
          </p>
          <code className="bg-gray-50 p-3 rounded text-xs block mb-4">
            npm run db:studio
          </code>
          <p className="text-xs text-gray-500">
            Studio runs locally on port 3001
          </p>
        </section>

        {/* Danger Zone */}
        <section className="bg-red-50 p-6 rounded-lg border-2 border-red-200">
          <h2 className="text-xl font-semibold text-red-900 mb-4">Danger Zone</h2>
          <p className="text-sm text-red-700">
            Neem contact op via{" "}
            <a href="mailto:j.candelaria171@gmail.com" className="underline font-medium">
              j.candelaria171@gmail.com
            </a>{" "}
            om je account te laten verwijderen. Zelf verwijderen is uitgeschakeld omdat dit
            momenteel het enige beheerdersaccount is.
          </p>
        </section>
      </div>
    </div>
  );
}

function IntegrationCard({
  provider,
  name,
  configured,
}: {
  provider: string;
  name: string;
  configured: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div>
        <p className="font-medium text-gray-900">{name}</p>
        <p className={`text-xs ${configured ? "text-green-600" : "text-gray-500"}`}>
          {configured ? "Configured" : "Not Configured"}
        </p>
      </div>
      <IntegrationConfigButton provider={provider} label={name} />
    </div>
  );
}
