"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Loader2, LayoutGrid, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthContext } from "@/hooks/use-auth";
import { apiUrl } from "@/lib/api-url";

type UserRow = {
  id: number;
  name: string;
  email: string;
  primaryRole: string | null;
  status: string;
  industry: string | null;
  location: string | null;
  identityVerificationStatus: string;
  createdAt: string;
};

export default function AdminUsersPage() {
  const { token } = useAuthContext();
  const [view, setView] = useState<"table" | "cards">("table");
  const [page, setPage] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [verification, setVerification] = useState("all");

  const query = useQuery<{ items: UserRow[]; total: number; limit: number }>({
    queryKey: ["admin-users", page, name, email, role, status, industry, location, verification],
    enabled: !!token,
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (name) params.set("name", name);
      if (email) params.set("email", email);
      if (role !== "all") params.set("role", role);
      if (status !== "all") params.set("status", status);
      if (industry) params.set("industry", industry);
      if (location) params.set("location", location);
      if (verification !== "all") params.set("verification", verification);
      const res = await fetch(apiUrl(`/api/admin/users?${params}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
      return res.json();
    },
  });

  const totalPages = query.data ? Math.ceil(query.data.total / query.data.limit) : 1;

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-sm text-slate-500">{query.data?.total ?? 0} total</p>
        </div>
        <div className="flex gap-1">
          <Button variant={view === "table" ? "default" : "outline"} size="sm" onClick={() => setView("table")} className={view === "table" ? "bg-teal-700 text-white" : ""}>
            <Table2 className="w-4 h-4" />
          </Button>
          <Button variant={view === "cards" ? "default" : "outline"} size="sm" onClick={() => setView("cards")} className={view === "cards" ? "bg-teal-700 text-white" : ""}>
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Input placeholder="Name" value={name} onChange={(e) => { setName(e.target.value); setPage(1); }} />
        <Input placeholder="Email" value={email} onChange={(e) => { setEmail(e.target.value); setPage(1); }} />
        <Select value={role} onValueChange={(v) => { setRole(v); setPage(1); }}>
          <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {["VISIONARY", "MANUFACTURER", "VENDOR", "PLATFORM_ADMIN"].map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {["ACTIVE", "SUSPENDED", "DEACTIVATED"].map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input placeholder="Industry" value={industry} onChange={(e) => { setIndustry(e.target.value); setPage(1); }} />
        <Input placeholder="Location" value={location} onChange={(e) => { setLocation(e.target.value); setPage(1); }} />
        <Select value={verification} onValueChange={(v) => { setVerification(v); setPage(1); }}>
          <SelectTrigger><SelectValue placeholder="Verification" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All verification</SelectItem>
            {["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"].map((v) => (
              <SelectItem key={v} value={v}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {query.isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-teal-700" /></div>
      ) : query.isError ? (
        <div className="text-sm text-red-700 bg-red-50 rounded-lg p-4">{(query.error as Error).message}</div>
      ) : (query.data?.items.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-500">No users found</div>
      ) : view === "table" ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Verification</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {query.data!.items.map((u) => (
                <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${u.id}`} className="font-medium text-teal-800 hover:underline">{u.name}</Link>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.primaryRole ?? "—"}</td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded bg-slate-100">{u.status}</span></td>
                  <td className="px-4 py-3 text-slate-600">{u.identityVerificationStatus}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {query.data!.items.map((u) => (
            <Link key={u.id} href={`/admin/users/${u.id}`} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-teal-200 transition-colors">
              <p className="font-medium text-slate-900">{u.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{u.email}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                <span className="text-xs px-2 py-0.5 rounded bg-slate-100">{u.status}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-teal-50 text-teal-800">{u.primaryRole ?? "—"}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
