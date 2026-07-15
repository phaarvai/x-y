"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, useAuthContext } from "@/hooks/use-auth";
import { apiUrl } from "@/lib/api-url";

const PLACEMENTS = [
  "HOMEPAGE",
  "SEARCH_RESULTS",
  "CATEGORY_PAGE",
  "MANUFACTURER_LISTING",
  "VENDOR_LISTING",
  "SIDEBAR",
  "FEATURED_SECTION",
];

export default function AdsDashboardPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { token } = useAuthContext();
  const qc = useQueryClient();
  const isAdmin = user?.primaryRole === "PLATFORM_ADMIN";
  const [form, setForm] = useState({
    title: "",
    description: "",
    imageUrl: "",
    destinationUrl: "https://",
    placement: "HOMEPAGE",
    category: "",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    remainingCredits: "100",
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["my-ads"],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/advertisements?mine=true"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
      return res.json();
    },
  });

  const adminList = useQuery({
    queryKey: ["admin-ads"],
    enabled: !!token && isAdmin,
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/advertisements?page=1&limit=50"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl("/api/advertisements"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          startDate: new Date(form.startDate).toISOString(),
          endDate: new Date(form.endDate).toISOString(),
          remainingCredits: parseInt(form.remainingCredits, 10) || 0,
          imageUrl: form.imageUrl || null,
          category: form.category || null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Create failed");
      return body;
    },
    onSuccess: () => {
      setMsg("Advertisement submitted for approval.");
      setErr(null);
      qc.invalidateQueries({ queryKey: ["my-ads"] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  const moderate = useMutation({
    mutationFn: async ({ id, action, reason }: { id: number; action: string; reason?: string }) => {
      const res = await fetch(apiUrl(`/api/admin/advertisements/${id}/${action}`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(reason ? { reason } : {}),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Action failed");
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-ads"] });
      qc.invalidateQueries({ queryKey: ["my-ads"] });
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFF]">
        <Navbar />
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" /></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F8FAFF]">
        <Navbar />
        <div className="text-center py-16"><Link href="/login"><Button className="bg-blue-600 text-white">Sign In</Button></Link></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <h1 className="text-2xl font-bold text-gray-900">Advertisement Dashboard</h1>
        {msg && <div className="rounded-lg bg-emerald-50 text-emerald-800 text-sm px-3 py-2">{msg}</div>}
        {err && <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{err}</div>}

        <form
          className="bg-white rounded-xl border border-gray-200 p-5 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <h2 className="font-semibold text-gray-900">Create advertisement</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Title</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required /></div>
            <div className="space-y-1">
              <Label className="text-xs">Placement</Label>
              <Select value={form.placement} onValueChange={(v) => setForm((f) => ({ ...f, placement: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLACEMENTS.map((p) => <SelectItem key={p} value={p}>{p.replaceAll("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Destination URL</Label><Input value={form.destinationUrl} onChange={(e) => setForm((f) => ({ ...f, destinationUrl: e.target.value }))} required /></div>
            <div className="space-y-1"><Label className="text-xs">Banner image URL</Label><Input value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Start</Label><Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">End</Label><Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} /></div>
          </div>
          <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <Button type="submit" className="bg-blue-600 text-white" disabled={create.isPending}>Submit for approval</Button>
        </form>

        <section>
          <h2 className="font-semibold text-gray-900 mb-3">My advertisements</h2>
          {(list.data?.items?.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-500">No ads yet.</p>
          ) : (
            <div className="space-y-2">
              {list.data.items.map((ad: any) => (
                <div key={ad.id} className="bg-white border rounded-lg p-3 text-sm flex justify-between gap-3">
                  <div>
                    <p className="font-medium">{ad.title}</p>
                    <p className="text-xs text-gray-500">{ad.placement} · {ad.status}</p>
                  </div>
                  <Link href={`/api/advertisements/${ad.id}`} className="text-blue-600 text-xs">#{ad.id}</Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {isAdmin && (
          <section>
            <h2 className="font-semibold text-gray-900 mb-3">Admin approval queue</h2>
            <div className="space-y-2">
              {(adminList.data?.items ?? []).map((ad: any) => (
                <div key={ad.id} className="bg-white border rounded-lg p-3 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <p className="font-medium">{ad.title}</p>
                      <p className="text-xs text-gray-500">#{ad.id} · {ad.status} · {ad.placement}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="outline" onClick={() => moderate.mutate({ id: ad.id, action: "approve" })}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => moderate.mutate({ id: ad.id, action: "reject", reason: "Does not meet guidelines" })}>Reject</Button>
                      <Button size="sm" variant="outline" onClick={() => moderate.mutate({ id: ad.id, action: "pause" })}>Pause</Button>
                      <Button size="sm" variant="outline" onClick={() => moderate.mutate({ id: ad.id, action: "resume" })}>Resume</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
