import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
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
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Two-factor authentication (2FA) via TOTP is enabled for your admin account.
              </p>
              <button className="btn-secondary text-sm py-2 px-4" disabled>
                Manage 2FA (Coming Soon)
              </button>
            </div>
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
            <IntegrationCard name="Meta Graph API" status="Not Configured" />
            <IntegrationCard name="X API" status="Not Configured" />
            <IntegrationCard name="Resend" status="Not Configured" />
            <IntegrationCard name="Proton Mail" status="Not Configured" />
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Integration setup coming in Fase 2+
          </p>
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
          <button className="btn-secondary text-sm py-2 px-4 text-red-700 border-red-700" disabled>
            Delete Account (Disabled)
          </button>
          <p className="text-xs text-red-700 mt-2">
            Account deletion coming in future phases.
          </p>
        </section>
      </div>
    </div>
  );
}

function IntegrationCard({
  name,
  status,
}: {
  name: string;
  status: string;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div>
        <p className="font-medium text-gray-900">{name}</p>
        <p className="text-xs text-gray-500">{status}</p>
      </div>
      <button className="text-sm text-gray-400 cursor-not-allowed" disabled>
        Configure
      </button>
    </div>
  );
}
