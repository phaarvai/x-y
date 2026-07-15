"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  Briefcase,
  Loader2,
  MessageSquare,
  Megaphone,
  ShieldCheck,
  Star,
} from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import StatCard from "@/components/dashboard/StatCard";
import ActivityTimeline from "@/components/dashboard/ActivityTimeline";
import QuickActions from "@/components/dashboard/QuickActions";
import { Button } from "@/components/ui/button";
import { useAuth, useAuthContext } from "@/hooks/use-auth";
import { apiUrl } from "@/lib/api-url";

type ServiceProviderDashboard = {
  providerType: string;
  widgets: {
    profileStatus: string;
    verificationStatus: string;
    publishedServices: number;
    incomingInquiries: number;
    quoteRequests: number;
    pendingResponses: number;
    ratings: number;
    reviews: number;
    advertisementStatus: number;
    notifications: number;
    revenue: string;
  };
  profiles: {
    id: number;
    providerType: string;
    displayName: string;
    verificationStatus: string;
    isPublished: boolean;
    rating: string | null;
  }[];
  legalProfile: {
    id: number;
    displayName: string;
    isPublished: boolean;
    identityVerificationStatus: string;
  } | null;
  quickActions: { label: string; href: string }[];
};

type ActivityData = {
  items: { type: string; label: string; createdAt: string }[];
};

function formatProviderType(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ProviderDashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { token } = useAuthContext();

  const { data, isLoading, isError, error } = useQuery<ServiceProviderDashboard>({
    queryKey: ["dashboard-provider"],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/dashboard/service-provider"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to load dashboard");
      return res.json();
    },
  });

  const activity = useQuery<ActivityData>({
    queryKey: ["dashboard-provider-activity"],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/dashboard/service-provider/activity"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to load activity");
      return res.json();
    },
  });

  if (authLoading) {
    return (
      <DashboardShell title="Service Provider Dashboard" subtitle="Loading…">
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-teal-700" />
        </div>
      </DashboardShell>
    );
  }

  if (!isAuthenticated) {
    return (
      <DashboardShell title="Service Provider Dashboard">
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
      <DashboardShell title="Service Provider Dashboard">
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
      title="Service Provider Dashboard"
      subtitle={data ? `${formatProviderType(data.providerType)} overview` : "Your services and inquiries"}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Published Services" value={w?.publishedServices ?? 0} icon={Briefcase} loading={loading} />
          <StatCard label="Inquiries" value={w?.incomingInquiries ?? 0} icon={MessageSquare} loading={loading} />
          <StatCard label="Quote Requests" value={w?.quoteRequests ?? 0} icon={MessageSquare} loading={loading} />
          <StatCard label="Pending Responses" value={w?.pendingResponses ?? 0} icon={Bell} loading={loading} />
          <StatCard
            label="Rating"
            value={w ? `${w.ratings.toFixed(1)}★ (${w.reviews})` : "—"}
            icon={Star}
            loading={loading}
          />
          <StatCard label="Active Ads" value={w?.advertisementStatus ?? 0} icon={Megaphone} loading={loading} />
          <StatCard label="Notifications" value={w?.notifications ?? 0} icon={Bell} loading={loading} />
          <StatCard
            label="Month Revenue"
            value={w ? `₹${Number(w.revenue).toLocaleString()}` : "—"}
            icon={Briefcase}
            loading={loading}
          />
        </div>

        {!loading && w && (
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
              Profile: <strong>{w.profileStatus}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700">
              Verification: <strong>{w.verificationStatus}</strong>
            </span>
          </div>
        )}

        {!loading && data && <QuickActions actions={data.quickActions} />}

        <div className="grid lg:grid-cols-2 gap-6">
          <section className="bg-white border border-slate-200 rounded-xl p-4">
            <h2 className="font-semibold text-slate-900 mb-3">Your Profiles</h2>
            {loading ? (
              <div className="space-y-2 animate-pulse">
                {[1, 2].map((i) => (
                  <div key={i} className="h-12 bg-slate-50 rounded-lg" />
                ))}
              </div>
            ) : (data?.profiles?.length ?? 0) === 0 && !data?.legalProfile ? (
              <p className="text-sm text-slate-500 py-6 text-center">No profiles yet. Create one to get started.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data?.profiles.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div>
                      <p className="font-medium text-slate-800">{p.displayName}</p>
                      <p className="text-xs text-slate-500">{formatProviderType(p.providerType)}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {p.isPublished ? "Published" : "Draft"}
                    </span>
                  </li>
                ))}
                {data?.legalProfile && (
                  <li className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div>
                      <p className="font-medium text-slate-800">{data.legalProfile.displayName}</p>
                      <p className="text-xs text-slate-500">Legal Provider</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {data.legalProfile.isPublished ? "Published" : "Draft"}
                    </span>
                  </li>
                )}
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
