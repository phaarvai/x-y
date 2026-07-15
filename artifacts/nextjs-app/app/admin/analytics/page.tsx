"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Download,
  Globe,
  Loader2,
  Search,
  Star,
  Users,
  Wallet,
} from "lucide-react";
import DateRangeFilter from "@/components/dashboard/DateRangeFilter";
import StatCard from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/hooks/use-auth";
import { apiUrl } from "@/lib/api-url";

type Tab = "overview" | "users" | "revenue" | "search" | "regions" | "reviews";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "users", label: "Users", icon: Users },
  { id: "revenue", label: "Revenue", icon: Wallet },
  { id: "search", label: "Search", icon: Search },
  { id: "regions", label: "Regions", icon: Globe },
  { id: "reviews", label: "Reviews", icon: Star },
];

function authHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function AdminAnalyticsPage() {
  const { token } = useAuthContext();
  const [range, setRange] = useState("LAST_30_DAYS");
  const [tab, setTab] = useState<Tab>("overview");

  const qs = `range=${encodeURIComponent(range)}`;

  const overview = useQuery({
    queryKey: ["admin-analytics-overview", range],
    enabled: !!token && tab === "overview",
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/admin/analytics/overview?${qs}`), {
        headers: authHeaders(token),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
      return res.json();
    },
  });

  const users = useQuery({
    queryKey: ["admin-analytics-users", range],
    enabled: !!token && tab === "users",
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/admin/analytics/users?${qs}`), {
        headers: authHeaders(token),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
      return res.json();
    },
  });

  const revenue = useQuery({
    queryKey: ["admin-analytics-revenue", range],
    enabled: !!token && tab === "revenue",
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/admin/analytics/revenue?${qs}`), {
        headers: authHeaders(token),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
      return res.json();
    },
  });

  const search = useQuery({
    queryKey: ["admin-analytics-search", range],
    enabled: !!token && tab === "search",
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/admin/analytics/search?${qs}`), {
        headers: authHeaders(token),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
      return res.json();
    },
  });

  const regions = useQuery({
    queryKey: ["admin-analytics-regions"],
    enabled: !!token && tab === "regions",
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/admin/analytics/regions"), {
        headers: authHeaders(token),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
      return res.json();
    },
  });

  const reviews = useQuery({
    queryKey: ["admin-analytics-reviews"],
    enabled: !!token && tab === "reviews",
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/admin/analytics/reviews"), {
        headers: authHeaders(token),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
      return res.json();
    },
  });

  const activeQuery =
    tab === "overview"
      ? overview
      : tab === "users"
        ? users
        : tab === "revenue"
          ? revenue
          : tab === "search"
            ? search
            : tab === "regions"
              ? regions
              : reviews;

  const handleExport = (report: string, format: "csv" | "excel" = "csv") => {
    if (!token) return;
    fetch(apiUrl(`/api/admin/analytics/export?report=${report}&format=${format}&${qs}`), {
      headers: authHeaders(token),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Export failed");
        const blob = await res.blob();
        const disposition = res.headers.get("Content-Disposition") || "";
        const match = disposition.match(/filename="([^"]+)"/);
        const filename = match?.[1] || `analytics-${report}.${format === "excel" ? "xls" : "csv"}`;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => alert("Export failed. Check permissions and try again."));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Platform metrics, search trends, and regional insights</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeFilter value={range} onChange={setRange} />
          <Button
            variant="outline"
            size="sm"
            className="gap-1 border-slate-200"
            onClick={() => handleExport(tab === "search" ? "search" : tab === "users" ? "users" : "revenue", "csv")}
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 border-slate-200"
            onClick={() => handleExport(tab === "search" ? "search" : tab === "users" ? "users" : "revenue", "excel")}
          >
            <Download className="w-3.5 h-3.5" />
            Export Excel
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-px">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === id
                ? "bg-white border border-b-0 border-slate-200 text-teal-800"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {activeQuery.isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-teal-700" />
        </div>
      )}

      {activeQuery.isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {(activeQuery.error as Error).message}
        </div>
      )}

      {tab === "overview" && overview.data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Total Users" value={overview.data.users.totalUsers} icon={Users} />
            <StatCard label="New Registrations" value={overview.data.users.newRegistrations} icon={Users} />
            <StatCard label="Total Bookings" value={overview.data.bookings.totalBookings} icon={BarChart3} />
            <StatCard
              label="GMV"
              value={`₹${Number(overview.data.revenue.gmv).toLocaleString()}`}
              icon={Wallet}
            />
            <StatCard label="Active Listings" value={overview.data.marketplace.activeListings} icon={BarChart3} />
            <StatCard label="Pending Listings" value={overview.data.marketplace.pendingListings} icon={BarChart3} />
            <StatCard label="Open Disputes" value={overview.data.support.openDisputes} icon={BarChart3} />
            <StatCard
              label="Avg Rating"
              value={overview.data.reviews.averageRating.toFixed(1)}
              icon={Star}
            />
          </div>
        </div>
      )}

      {tab === "users" && users.data && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard label="Total Users" value={users.data.totalUsers} icon={Users} />
          <StatCard label="Verified Users" value={users.data.verifiedUsers} icon={Users} />
          <StatCard label="New Registrations" value={users.data.newRegistrations} icon={Users} />
          <StatCard label="Active Manufacturers" value={users.data.activeManufacturers} icon={Users} />
          <StatCard label="Active Visionaries" value={users.data.activeVisionaries} icon={Users} />
          <StatCard label="Active Vendors" value={users.data.activeVendors} icon={Users} />
          <StatCard label="Active Service Providers" value={users.data.activeServiceProviders} icon={Users} />
        </div>
      )}

      {tab === "revenue" && revenue.data && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard label="GMV (range)" value={`₹${Number(revenue.data.gmv).toLocaleString()}`} icon={Wallet} />
          <StatCard
            label="Platform Commission"
            value={`₹${Number(revenue.data.platformCommission).toLocaleString()}`}
            icon={Wallet}
          />
          <StatCard label="Monthly Revenue" value={`₹${Number(revenue.data.monthlyRevenue).toLocaleString()}`} icon={Wallet} />
          <StatCard label="Annual Revenue" value={`₹${Number(revenue.data.annualRevenue).toLocaleString()}`} icon={Wallet} />
          <StatCard
            label="Subscription Revenue"
            value={`₹${Number(revenue.data.subscriptionRevenue).toLocaleString()}`}
            icon={Wallet}
          />
          <StatCard label="Pending Payments" value={revenue.data.pendingPayments} icon={Wallet} />
        </div>
      )}

      {tab === "search" && search.data && (
        <div className="grid lg:grid-cols-2 gap-6">
          <section className="bg-white border border-slate-200 rounded-xl p-4">
            <h2 className="font-semibold text-slate-900 mb-3">Top Keywords ({search.data.totalSearches} searches)</h2>
            {(search.data.mostSearchedKeywords?.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-500">No search data for this range.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {search.data.mostSearchedKeywords.map((k: { query: string; count: number }, i: number) => (
                  <li key={i} className="flex justify-between py-1 border-b border-slate-50 last:border-0">
                    <span className="text-slate-700">{k.query}</span>
                    <span className="text-slate-500">{k.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="bg-white border border-slate-200 rounded-xl p-4">
            <h2 className="font-semibold text-slate-900 mb-3">Top Categories</h2>
            {(search.data.mostSearchedCategories?.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-500">No category search data.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {search.data.mostSearchedCategories.map((c: { category: string; count: number }, i: number) => (
                  <li key={i} className="flex justify-between py-1 border-b border-slate-50 last:border-0">
                    <span className="text-slate-700">{c.category}</span>
                    <span className="text-slate-500">{c.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {tab === "regions" && regions.data && (
        <div className="grid lg:grid-cols-2 gap-6">
          <section className="bg-white border border-slate-200 rounded-xl p-4">
            <h2 className="font-semibold text-slate-900 mb-3">Most Active Cities</h2>
            <ul className="space-y-1 text-sm">
              {(regions.data.mostActiveCities ?? []).map((c: { city: string; count: number }, i: number) => (
                <li key={i} className="flex justify-between py-1 border-b border-slate-50 last:border-0">
                  <span className="text-slate-700">{c.city}</span>
                  <span className="text-slate-500">{c.count}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="bg-white border border-slate-200 rounded-xl p-4">
            <h2 className="font-semibold text-slate-900 mb-3">Most Active States</h2>
            <ul className="space-y-1 text-sm">
              {(regions.data.mostActiveStates ?? []).map((s: { state: string; count: number }, i: number) => (
                <li key={i} className="flex justify-between py-1 border-b border-slate-50 last:border-0">
                  <span className="text-slate-700">{s.state}</span>
                  <span className="text-slate-500">{s.count}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {tab === "reviews" && reviews.data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Reviews" value={reviews.data.totalReviews} icon={Star} />
          <StatCard label="Average Rating" value={reviews.data.averageRating.toFixed(1)} icon={Star} />
          <StatCard label="Verification Rate" value={`${reviews.data.verificationRate}%`} icon={Star} />
          <StatCard label="Reported Reviews" value={reviews.data.reportedReviews} icon={Star} />
        </div>
      )}
    </div>
  );
}
