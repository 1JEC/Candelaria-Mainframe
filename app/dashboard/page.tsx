import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-brand-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold text-brand-black mb-8">
          Mainframe HQ
        </h1>
        <p className="text-gray-600 text-lg mb-12">
          Welcome to the Candelaria Agency operations portal. Modules coming
          soon.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <ModuleCard title="Social Publisher" status="fase-3" />
          <ModuleCard title="Website Intake" status="fase-2" />
          <ModuleCard title="Mailbox" status="fase-4" />
          <ModuleCard title="Lead Engine" status="fase-5" />
          <ModuleCard title="Dashboard" status="fase-6" />
        </div>
      </div>
    </div>
  );
}

function ModuleCard({
  title,
  status,
}: {
  title: string;
  status: string;
}) {
  return (
    <div className="p-4 border-2 border-brand-green rounded-lg hover:bg-brand-green hover:text-brand-white transition">
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-sm text-gray-500">Coming in {status}</p>
    </div>
  );
}
