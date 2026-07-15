"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  Factory,
  List,
  MessageSquare,
  Star,
  Bell,
  ClipboardList,
  Loader2,
} from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import StatCard from "@/components/dashboard/StatCard";
import RevenueCards from "@/components/dashboard/RevenueCards";
import ActivityTimeline from "@/components/dashboard/ActivityTimeline";
import QuickActions from "@/components/dashboard/QuickActions";
import { Button } from "@/components/ui/button";
import { useAuth, useAuthContext } from "@/hooks/use-auth";
import { apiUrl } from "@/lib/api-url";

type ManufacturerDashboard = {
  widgets: {
    activeListings: number;
    draftListings: number;
    pendingRequests: number;
    acceptedRequests: number;
    upcomingBookings: number;
    currentProductionJobs: number;
    notifications: number;
    ratingsReviews: { count: number; average: number };
    revenue: { today: string; month: string; year: string };
    profileCompletion: number;
    pendingPayments: number;
  };
  calendar: {
    id: number;
    reference: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
  }[];
  quickActions: { label: string; href: string }[];
};

type ActivityData = {
  items: { type: string; label: string; createdAt: string }[];
};

export default function ManufacturerDashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { token } = useAuthContext();

  const { data, isLoading, isError, error } = useQuery<ManufacturerDashboard>({
    queryKey: ["dashboard-manufacturer"],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/dashboard/manufacturer"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to load dashboard");
      return res.json();
    },
  });

  const activity = useQuery<ActivityData>({
    queryKey: ["dashboard-manufacturer-activity"],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/dashboard/manufacturer/activity"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to load activity");
      return res.json();
    },
  });

  if (authLoading) {
    return (
      <DashboardShell title="Manufacturer Dashboard" subtitle="Loading…">
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-teal-700" />
        </div>
      </DashboardShell>
    );
  }

  if (!isAuthenticated) {
    return (
      <DashboardShell title="Manufacturer Dashboard">
        <div className="text-center py-12">
          <Link href="/login">
            <Button className="bg-teal-700 hover:bg-teal-800 text-white">Sign In</Button>
          </Link>
        </div>
      </DashboardShell>
    );
  }

  if (isError) {
    return (
      <DashboardShell title="Manufacturer Dashboard">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {(error as Error).message}
        </div>
      </DashboardShell>
    );
  }

  const w = data?.widgets;
  const loading = isLoading;

  return (
    <DashboardShell
      title="Manufacturer Dashboard"
      subtitle="Listings, bookings, revenue, and production at a glance"
    >
      <div className="space-y-6">
        <section>
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Revenue</h2>
          <RevenueCards
            today={w?.revenue.today ?? 0}
            month={w?.revenue.month ?? 0}
            year={w?.revenue.year ?? 0}
            loading={loading}
          />
        </section>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Active Listings" value={w?.activeListings ?? 0} icon={List} loading={loading} />
          <StatCard label="Pending Requests" value={w?.pendingRequests ?? 0} icon={ClipboardList} loading={loading} />
          <StatCard label="Upcoming Bookings" value={w?.upcomingBookings ?? 0} icon={Calendar} loading={loading} />
          <StatCard label="Production Jobs" value={w?.currentProductionJobs ?? 0} icon={Factory} loading={loading} />
          <StatCard label="Accepted Requests" value={w?.acceptedRequests ?? 0} icon={ClipboardList} loading={loading} />
          <StatCard label="Draft Listings" value={w?.draftListings ?? 0} icon={List} loading={loading} />
          <StatCard
            label="Reviews"
            value={w ? `${w.ratingsReviews.count} · ${w.ratingsReviews.average.toFixed(1)}★` : "—"}
            icon={Star}
            loading={loading}
          />
          <StatCard label="Notifications" value={w?.notifications ?? 0} icon={Bell} loading={loading} />
        </div>

        {!loading && data && <QuickActions actions={data.quickActions} />}

        <div className="grid lg:grid-cols-2 gap-6">
          <section className="bg-white border border-slate-200 rounded-xl p-4">
            <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-700" />
              Booking Calendar
            </h2>
            {loading ? (
              <div className="space-y-2 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-slate-50 rounded-lg" />
                ))}
              </div>
            ) : (data?.calendar?.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">No upcoming bookings scheduled.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data!.calendar.map((b) => (
                  <li key={b.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div>
                      <p className="font-medium text-slate-800">{b.reference}</p>
                      <p className="text-xs text-slate-500">
                        {b.startDate ? new Date(b.startDate).toLocaleDateString() : "—"}
                        {b.endDate ? ` → ${new Date(b.endDate).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">{b.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <ActivityTimeline
            items={activity.data?.items ?? []}
            loading={activity.isLoading}
            title="Activity Feed"
          />
        </div>

        {!loading && w && (
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 bg-white border border-slate-200 rounded-xl p-4">
            <span>Profile completion: <strong className="text-slate-900">{w.profileCompletion}%</strong></span>
            <span>Pending payments: <strong className="text-slate-900">{w.pendingPayments}</strong></span>
            <Link href="/bookings" className="text-teal-700 hover:underline flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" /> Manage bookings
            </Link>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
