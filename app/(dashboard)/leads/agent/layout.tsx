import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { AgentTabs } from "@/components/leads-agent/AgentTabs";

export default async function LeadsAgentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  // Role-gated to admin (this app has no separate "owner" role) — non-admins
  // get 404, not a redirect, so the section's existence isn't leaked.
  if (session?.user?.role !== "admin") notFound();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-brand-black">Leads Agent</h1>
        <p className="text-gray-600">Vindt, verifieert en scoort MKB-leads automatisch.</p>
      </div>
      <AgentTabs />
      {children}
    </div>
  );
}
