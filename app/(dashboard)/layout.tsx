import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/dashboard/Navbar";
import { Sidebar } from "@/components/dashboard/Sidebar";
import MobileNav from "@/components/dashboard/MobileNav";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // A JWT session can outlive the user it was minted for (e.g. after an auth
  // rework, or if the account was removed). Catch that here instead of
  // letting every downstream query/insert fail on a foreign key violation.
  const userExists = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { id: true },
  });
  if (!userExists) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <MobileNav />
      <div className="md:ml-56 flex flex-col min-h-screen">
        <Navbar session={session} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-8 max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
