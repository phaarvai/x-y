"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Users, List, Scale, CreditCard, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/hooks/use-auth";
import { apiUrl } from "@/lib/api-url";

type DashboardData = {
  widgets: {
    totalUsers: number;
    activeUsers: number;
    pendingListings: number;
    pendingReviews: number;
    openDisputes: number;
    transactions: number;
    revenue: string;
    subscriptions: number;
    advertisements: number;
    notifications: number;
  };
  recentActivity: { id: number; action: string; entityType: string; entityId: number | null; createdAt: string }[];
  recentRegistrations: {
    id: number;
    name: string;
    email: string;
    primaryRole: string | null;
    status: string;
    createdAt: string;
  }[];
  quickActions: { label: string; href: string }[];
};

function Widget({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <Icon className="w-4 h-4 text-teal-700" />
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { token } = useAuthContext();

  const { data, isLoading, isError, error } = useQuery<DashboardData>({
    queryKey: ["admin-dashboard"],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/admin/dashboard"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to load dashboard");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-teal-700" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(error as Error).message}
      </div>
    );
  }

  const w = data!.widgets;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Platform overview and recent activity</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Widget label="Total Users" value={w.totalUsers} icon={Users} />
        <Widget label="Active Users" value={w.activeUsers} icon={Users} />
        <Widget label="Pending Listings" value={w.pendingListings} icon={List} />
        <Widget label="Open Disputes" value={w.openDisputes} icon={Scale} />
        <Widget label="Transactions" value={w.transactions} icon={CreditCard} />
        <Widget label="Revenue (paid)" value={`₹${Number(w.revenue).toLocaleString()}`} icon={CreditCard} />
        <Widget label="Pending Reviews" value={w.pendingReviews} icon={List} />
        <Widget label="Active Subscriptions" value={w.subscriptions} icon={Users} />
      </div>

      {data!.quickActions.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-900 mb-2">Quick Actions</h2>
          <div className="flex flex-wrap gap-2">
            {data!.quickActions.map((a) => (
              <Link key={a.href} href={a.href}>
                <Button variant="outline" size="sm" className="gap-1">
                  {a.label} <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200 rounded-xl p-4">
          <h2 className="font-semibold text-slate-900 mb-3">Recent Activity</h2>
          {(data!.recentActivity?.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-500">No recent activity.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data!.recentActivity.map((a) => (
                <li key={a.id} className="flex justify-between gap-2 border-b border-slate-100 pb-2 last:border-0">
                  <span className="text-slate-700">
                    {a.action} · {a.entityType}
                    {a.entityId != null ? ` #${a.entityId}` : ""}
                  </span>
                  <span className="text-xs text-slate-400 shrink-0">
                    {new Date(a.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-4">
          <h2 className="font-semibold text-slate-900 mb-3">Recent Registrations</h2>
          {(data!.recentRegistrations?.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-500">No recent registrations.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data!.recentRegistrations.map((u) => (
                <li key={u.id} className="flex justify-between items-center gap-2">
                  <div>
                    <Link href={`/admin/users/${u.id}`} className="font-medium text-teal-800 hover:underline">
                      {u.name}
                    </Link>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">{u.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
