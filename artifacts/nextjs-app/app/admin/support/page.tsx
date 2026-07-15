"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthContext } from "@/hooks/use-auth";
import { apiUrl } from "@/lib/api-url";

type SupportCase = {
  id: number;
  userId: number;
  subject: string;
  description: string;
  priority: string;
  status: string;
  assignedAdmin: number | null;
  createdAt: string;
};

export default function AdminSupportPage() {
  const { token } = useAuthContext();
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ userId: "", subject: "", description: "", priority: "MEDIUM", bookingId: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const query = useQuery<{ items: SupportCase[]; total: number }>({
    queryKey: ["admin-support", status],
    enabled: !!token,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      const res = await fetch(apiUrl(`/api/admin/support?${params}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
      return res.json();
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl("/api/admin/support"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: parseInt(form.userId, 10),
          subject: form.subject,
          description: form.description,
          priority: form.priority,
          bookingId: form.bookingId ? parseInt(form.bookingId, 10) : undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Create failed");
      return body;
    },
    onSuccess: () => {
      setMsg("Support case created.");
      setShowCreate(false);
      setForm({ userId: "", subject: "", description: "", priority: "MEDIUM", bookingId: "" });
      qc.invalidateQueries({ queryKey: ["admin-support"] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Support Cases</h1>
          <p className="text-sm text-slate-500">{query.data?.total ?? 0} cases</p>
        </div>
        <Button size="sm" className="bg-teal-700 text-white" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="w-4 h-4 mr-1" /> New case
        </Button>
      </div>

      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {msg && <div className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">{msg}</div>}
      {err && <div className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{err}</div>}

      {showCreate && (
        <form
          className="bg-white border border-slate-200 rounded-xl p-4 grid sm:grid-cols-2 gap-3"
          onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
        >
          <Input placeholder="User ID" value={form.userId} onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))} required />
          <Input placeholder="Booking ID (optional)" value={form.bookingId} onChange={(e) => setForm((f) => ({ ...f, bookingId: e.target.value }))} />
          <Input className="sm:col-span-2" placeholder="Subject" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} required />
          <Textarea className="sm:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required />
          <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" className="bg-teal-700 text-white" disabled={create.isPending}>Create</Button>
        </form>
      )}

      {query.isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-teal-700" /></div>
      ) : (query.data?.items.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-500">No support cases</div>
      ) : (
        <div className="space-y-2">
          {query.data!.items.map((c) => (
            <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">#{c.id} · {c.subject}</p>
                  <p className="text-xs text-slate-500 mt-0.5">User {c.userId} · {c.priority} · {new Date(c.createdAt).toLocaleString()}</p>
                  <p className="text-slate-600 mt-1 line-clamp-2">{c.description}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 h-fit">{c.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
