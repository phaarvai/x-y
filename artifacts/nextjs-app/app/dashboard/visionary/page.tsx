"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Bookmark,
  ClipboardList,
  Factory,
  Heart,
  Loader2,
  Send,
  Star,
} from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import StatCard from "@/components/dashboard/StatCard";
import ActivityTimeline from "@/components/dashboard/ActivityTimeline";
import QuickActions from "@/components/dashboard/QuickActions";
import { Button } from "@/components/ui/button";
import { useAuth, useAuthContext } from "@/hooks/use-auth";
import { apiUrl } from "@/lib/api-url";

type VisionaryDashboard = {
  widgets: {
    draftRequirements: number;
    postedRequirements: number;
    recommendedManufacturers: number;
    savedManufacturers: number;
    savedListings: number;
    sentRequests: number;
    acceptedRequests: number;
    notifications: number;
    pendingReviews: number;
  };
  requirementOverview: {
    draft: number;
    published: number;
    closed: number;
    expired: number;
  };
  recommendedManufacturers: {
    id: number;
    name: string;
    industry: string | null;
    location: string | null;
    identityVerificationStatus: string | null;
  }[];
  quickActions: { label: string; href: string }[];
};

type ActivityData = {
  items: { type: string; label: string; createdAt: string }[];
};

export default function VisionaryDashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { token } = useAuthContext();

  const { data, isLoading, isError, error } = useQuery<VisionaryDashboard>({
    queryKey: ["dashboard-visionary"],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/dashboard/visionary"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to load dashboard");
      return res.json();
    },
  });

  const activity = useQuery<ActivityData>({
    queryKey: ["dashboard-visionary-activity"],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/dashboard/visionary/activity"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to load activity");
      return res.json();
    },
  });

  if (authLoading) {
    return (
      <DashboardShell title="Visionary Dashboard" subtitle="Loading…">
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-teal-700" />
        </div>
      </DashboardShell>
    );
  }

  if (!isAuthenticated) {
    return (
      <DashboardShell title="Visionary Dashboard">
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
      <DashboardShell title="Visionary Dashboard">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {(error as Error).message}
        </div>
      </DashboardShell>
    );
  }

  const w = data?.widgets;
  const overview = data?.requirementOverview;
  const loading = isLoading;

  return (
    <DashboardShell
      title="Visionary Dashboard"
      subtitle="Requirements, recommendations, and project tracking"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Draft Requirements" value={w?.draftRequirements ?? 0} icon={ClipboardList} loading={loading} />
          <StatCard label="Posted Requirements" value={w?.postedRequirements ?? 0} icon={Send} loading={loading} />
          <StatCard label="Accepted Requests" value={w?.acceptedRequests ?? 0} icon={Star} loading={loading} />
          <StatCard label="Sent Requests" value={w?.sentRequests ?? 0} icon={Send} loading={loading} />
          <StatCard label="Saved Manufacturers" value={w?.savedManufacturers ?? 0} icon={Heart} loading={loading} />
          <StatCard label="Saved Listings" value={w?.savedListings ?? 0} icon={Bookmark} loading={loading} />
          <StatCard label="Pending Reviews" value={w?.pendingReviews ?? 0} icon={Star} loading={loading} />
          <StatCard label="Notifications" value={w?.notifications ?? 0} icon={Factory} loading={loading} />
        </div>

        {!loading && overview && (
          <section className="bg-white border border-slate-200 rounded-xl p-4">
            <h2 className="font-semibold text-slate-900 mb-3">Requirements Overview</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              {[
                { label: "Draft", value: overview.draft },
                { label: "Published", value: overview.published },
                { label: "Closed", value: overview.closed },
                { label: "Expired", value: overview.expired },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-slate-50 p-3">
                  <p className="text-2xl font-semibold text-slate-900">{item.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{item.label}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {!loading && data && <QuickActions actions={data.quickActions} />}

        <div className="grid lg:grid-cols-2 gap-6">
          <section className="bg-white border border-slate-200 rounded-xl p-4">
            <h2 className="font-semibold text-slate-900 mb-3">Recommended Manufacturers</h2>
            {loading ? (
              <div className="space-y-2 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-slate-50 rounded-lg" />
                ))}
              </div>
            ) : (data?.recommendedManufacturers?.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">No recommendations yet. Browse manufacturers to get started.</p>
            ) : (
              <ul className="space-y-2">
                {data!.recommendedManufacturers.map((m) => (
                  <li key={m.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 text-sm">
                    <div>
                      <p className="font-medium text-slate-800">{m.name}</p>
                      <p className="text-xs text-slate-500">
                        {[m.industry, m.location].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                    <Link href={`/browse`} className="text-xs text-teal-700 hover:underline">
                      View
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <ActivityTimeline
            items={activity.data?.items ?? []}
            loading={activity.isLoading}
            title="Recent Activity"
          />
        </div>
      </div>
    </DashboardShell>
  );
}
