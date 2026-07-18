import { db } from "@/lib/db";
import { auditLog, leads, posts, emails, agentRuns } from "@/drizzle/schema";
import { count } from "drizzle-orm";
import PortalInsights from "@/components/dashboard/PortalInsights";

export default async function AnalyticsPage() {
  const [logCount] = await db.select({ count: count() }).from(auditLog);
  const [leadCount] = await db.select({ count: count() }).from(leads);
  const [postCount] = await db.select({ count: count() }).from(posts);
  const [emailCount] = await db.select({ count: count() }).from(emails);
  const [agentCount] = await db.select({ count: count() }).from(agentRuns);

  return (
    <PortalInsights
      metrics={{
        logCount: logCount?.count || 0,
        leadCount: leadCount?.count || 0,
        postCount: postCount?.count || 0,
        emailCount: emailCount?.count || 0,
        agentCount: agentCount?.count || 0,
      }}
    />
  );
}
