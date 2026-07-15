"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  BarChart3,
  Users,
  List,
  FolderTree,
  CreditCard,
  Headphones,
  Scale,
  Star,
  ShieldCheck,
  Menu,
  X,
  Search,
  LogOut,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthContext } from "@/hooks/use-auth";
import { useAdminMe } from "@/hooks/use-admin-me";
import { can } from "@/lib/admin-can";
import { apiUrl } from "@/lib/api-url";

const SESSION_MS = 8 * 60 * 60 * 1000;
const IDLE_MS = 30 * 60 * 1000;
const WARN_BEFORE_MS = 15 * 60 * 1000;

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, module: "dashboard" },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, module: "dashboard" },
  { href: "/admin/users", label: "Users", icon: Users, module: "users" },
  { href: "/admin/listings", label: "Listings", icon: List, module: "listings" },
  { href: "/admin/categories", label: "Categories", icon: FolderTree, module: "categories" },
  { href: "/admin/transactions", label: "Transactions", icon: CreditCard, module: "transactions" },
  { href: "/admin/support", label: "Support", icon: Headphones, module: "support" },
  { href: "/admin/disputes", label: "Disputes", icon: Scale, module: "disputes" },
  { href: "/admin/reviews", label: "Reviews", icon: Star, module: "reviews" },
  { href: "/admin/verifications", label: "Verifications", icon: ShieldCheck, module: "verifications" },
] as const;

export { can };

type SearchResult = {
  users?: { id: number; name: string; email: string }[];
  listings?: { id: number; title: string; listingType: string }[];
  transactions?: { id: number; referenceNumber: string | null; amount: string }[];
  support?: { id: number; subject: string; status: string }[];
  disputes?: { id: number; reason: string; status: string }[];
};

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, logout } = useAuthContext();
  const { data: admin, isLoading, isError, error } = useAdminMe();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sessionWarning, setSessionWarning] = useState<string | null>(null);
  const lastActivity = useRef(Date.now());
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markActivity = useCallback(() => {
    lastActivity.current = Date.now();
    if (typeof window !== "undefined") {
      sessionStorage.setItem("admin_last_activity", String(lastActivity.current));
    }
  }, []);

  useEffect(() => {
    if (!token) {
      router.replace("/admin/login");
      return;
    }
    if (isError) {
      const status = (error as { status?: number })?.status;
      if (status === 401) router.replace("/admin/login");
      else router.replace("/admin/unauthorized");
    }
  }, [token, isError, error, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = sessionStorage.getItem("admin_session_start");
    if (!stored) sessionStorage.setItem("admin_session_start", String(Date.now()));
    markActivity();

    const onActivity = () => markActivity();
    window.addEventListener("mousemove", onActivity);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("click", onActivity);

    const interval = setInterval(() => {
      const start = parseInt(sessionStorage.getItem("admin_session_start") || String(Date.now()), 10);
      const idle = Date.now() - lastActivity.current;
      const elapsed = Date.now() - start;
      const sessionRemaining = SESSION_MS - elapsed;
      const idleRemaining = IDLE_MS - idle;

      if (idle >= IDLE_MS || elapsed >= SESSION_MS) {
        logout();
        queryClient.clear();
        sessionStorage.removeItem("admin_session_start");
        sessionStorage.removeItem("admin_last_activity");
        router.replace("/admin/login");
        return;
      }

      if (sessionRemaining <= WARN_BEFORE_MS || idleRemaining <= 5 * 60 * 1000) {
        const mins = Math.min(
          Math.ceil(sessionRemaining / 60000),
          Math.ceil(idleRemaining / 60000),
        );
        setSessionWarning(`Session expiring in ~${Math.max(1, mins)} min due to timeout or inactivity.`);
      } else {
        setSessionWarning(null);
      }
    }, 30000);

    return () => {
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("click", onActivity);
      clearInterval(interval);
    };
  }, [logout, markActivity, queryClient, router]);

  const visibleNav = useMemo(() => {
    if (!admin) return [];
    return NAV.filter((item) => can(admin.permissions, item.module, "read", admin.isSuperAdmin));
  }, [admin]);

  const handleLogout = async () => {
    try {
      await fetch(apiUrl("/api/admin/logout"), {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {
      /* ignore */
    }
    logout();
    queryClient.clear();
    sessionStorage.removeItem("admin_session_start");
    sessionStorage.removeItem("admin_last_activity");
    router.push("/admin/login");
  };

  const runSearch = useCallback(
    (q: string) => {
      if (!token || !q.trim() || !admin || !can(admin.permissions, "search", "read", admin.isSuperAdmin)) {
        setSearchResults(null);
        return;
      }
      fetch(apiUrl(`/api/admin/search?q=${encodeURIComponent(q.trim())}`), {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          setSearchResults(data);
          setSearchOpen(true);
        })
        .catch(() => setSearchResults(null));
    },
    [token, admin],
  );

  const onSearchChange = (value: string) => {
    setSearchQ(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => runSearch(value), 300);
  };

  if (!token || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-500">Loading admin console…</div>
      </div>
    );
  }

  if (!admin) return null;

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-14 flex items-center justify-between px-4 border-b border-slate-200">
          <Link href="/admin" className="font-semibold text-slate-900 tracking-tight">
            Admin Console
          </Link>
          <button type="button" className="lg:hidden p-1 text-slate-500" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {visibleNav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(href)
                  ? "bg-teal-50 text-teal-800 border border-teal-100"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-200 text-xs text-slate-500">
          {admin.adminRoles.join(", ") || "Admin"}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-14 bg-white border-b border-slate-200 flex items-center gap-3 px-4">
          <button
            type="button"
            className="lg:hidden p-1.5 rounded-md text-slate-600 hover:bg-slate-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search users, listings, transactions…"
              value={searchQ}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => searchResults && setSearchOpen(true)}
              className="pl-9 h-9 bg-slate-50 border-slate-200"
            />
            {searchOpen && searchResults && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-80 overflow-y-auto z-50 text-sm">
                {[
                  ...(searchResults.users ?? []).map((u) => ({
                    key: `u-${u.id}`,
                    href: `/admin/users/${u.id}`,
                    label: `${u.name} · ${u.email}`,
                  })),
                  ...(searchResults.listings ?? []).map((l) => ({
                    key: `l-${l.id}`,
                    href: "/admin/listings",
                    label: `Listing #${l.id} · ${l.title}`,
                  })),
                  ...(searchResults.transactions ?? []).map((t) => ({
                    key: `t-${t.id}`,
                    href: "/admin/transactions",
                    label: `Txn #${t.id} · ${t.referenceNumber || t.amount}`,
                  })),
                  ...(searchResults.support ?? []).map((s) => ({
                    key: `s-${s.id}`,
                    href: "/admin/support",
                    label: `Support #${s.id} · ${s.subject}`,
                  })),
                  ...(searchResults.disputes ?? []).map((d) => ({
                    key: `d-${d.id}`,
                    href: "/admin/disputes",
                    label: `Dispute #${d.id} · ${d.reason}`,
                  })),
                ].map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className="block px-3 py-2 hover:bg-slate-50 text-slate-700"
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchQ("");
                    }}
                  >
                    {item.label}
                  </Link>
                ))}
                {!searchResults.users?.length &&
                  !searchResults.listings?.length &&
                  !searchResults.transactions?.length &&
                  !searchResults.support?.length &&
                  !searchResults.disputes?.length && (
                    <p className="px-3 py-4 text-slate-500 text-center">No results</p>
                  )}
              </div>
            )}
          </div>

          <span className="hidden sm:inline text-sm text-slate-600 truncate max-w-[140px]">{admin.name}</span>
          <Button type="button" variant="outline" size="sm" onClick={handleLogout} className="shrink-0">
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            Logout
          </Button>
        </header>

        {sessionWarning && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {sessionWarning}
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
