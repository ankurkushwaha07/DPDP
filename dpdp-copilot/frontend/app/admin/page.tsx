import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ShieldCheck, Users, Activity, AlertTriangle } from "lucide-react";

async function getMetrics() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/admin/metrics`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    return null;
  }
}

export default async function AdminPage() {
  const user = await currentUser();

  // Basic role guard logic
  if (!user) {
    redirect("/sign-in");
  }

  // Define authorized admin user(s)
  const isAdmin = true; // In full production, you would check: user.emailAddresses.some(e => e.emailAddress === "your@email.com")

  if (!isAdmin) {
    return (
      <div className="flex h-[80vh] items-center justify-center p-6 text-center">
        <div>
          <ShieldCheck className="h-16 w-16 mx-auto text-red-500 mb-4" />
          <h1 className="text-3xl font-bold dark:text-gray-100 mb-2">Unauthorized</h1>
          <p className="text-gray-500 dark:text-gray-400">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  const metrics = await getMetrics();

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Platform usage and compliance metrics strictly at a glance.</p>
        </div>
      </div>

      {!metrics ? (
        <div className="p-8 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl border border-red-200 dark:border-red-800">
          Failed to load database metrics. Ensure your backend is running.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Users"
            value={metrics.total_users}
            icon={<Users className="w-5 h-5 text-blue-500" />}
            color="border-blue-500"
          />
          <MetricCard
            title="Analyses Run"
            value={metrics.total_analyses}
            icon={<Activity className="w-5 h-5 text-teal-500" />}
            color="border-teal-500"
          />
          <MetricCard
            title="Avg Compliance"
            value={`${metrics.average_compliance}%`}
            icon={<ShieldCheck className="w-5 h-5 text-green-500" />}
            color="border-green-500"
          />
          <MetricCard
            title="High Risk Assets"
            value={metrics.risk_breakdown?.high || 0}
            icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
            color="border-red-500"
          />
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value, icon, color }: { title: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className={`p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border-t-4 ${color} border-x border-b border-x-gray-200 dark:border-x-gray-800 border-b-gray-200 dark:border-b-gray-800`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-600 dark:text-gray-400">{title}</h3>
        {icon}
      </div>
      <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}
