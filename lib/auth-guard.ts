import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Admin-only gate for the leads agent's mutating routes/pages. This app has
 * no "owner" role (just "user"/"admin") — everywhere the leads-agent spec
 * says "owner or admin", that collapses to "admin" here.
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { ok: false as const, status: 401 as const, reason: "unauthenticated" };
  }
  if (session.user.role !== "admin") {
    return { ok: false as const, status: 403 as const, reason: "forbidden" };
  }
  return { ok: true as const, session };
}
