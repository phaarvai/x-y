"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthContext } from "@/hooks/use-auth";
import { apiUrl } from "@/lib/api-url";

const ENTITY_TYPES = [
  "USER",
  "MANUFACTURER",
  "MANUFACTURING_FACILITY",
  "VENDOR",
  "LEGAL_PROVIDER",
  "LOGISTICS_PROVIDER",
  "LABOR_SUPPLIER",
  "INVESTOR",
  "MARKET_LEAD",
];
const VERIFICATION_TYPES = ["IDENTITY", "BUSINESS", "FACILITY", "CERTIFICATION", "COMPLIANCE"];

export default function AdminVerificationsPage() {
  const { token } = useAuthContext();
  const qc = useQueryClient();
  const [status, setStatus] = useState("PENDING");
  const [form, setForm] = useState({
    entityType: "USER",
    entityId: "",
    verificationType: "IDENTITY",
    notes: "",
    expiresAt: "",
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  const list = useQuery({
    queryKey: ["admin-verifications", status],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/admin/verifications?status=${status}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
      return res.json();
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl("/api/admin/verifications"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: form.entityType,
          entityId: parseInt(form.entityId, 10),
          verificationType: form.verificationType,
          notes: form.notes || null,
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Create failed");
      return body;
    },
    onSuccess: () => {
      setMsg("Verification created.");
      setErr(null);
      qc.invalidateQueries({ queryKey: ["admin-verifications"] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  const action = useMutation({
    mutationFn: async ({ id, act }: { id: number; act: string }) => {
      const res = await fetch(apiUrl(`/api/admin/verifications/${id}`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: act, notes: form.notes || null }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Action failed");
      return body;
    },
    onSuccess: (body) => {
      setMsg(`Verification ${body.status}.`);
      setSelected(body.id);
      qc.invalidateQueries({ queryKey: ["admin-verifications"] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Verification Queue</h1>
        <p className="text-sm text-slate-500">Manage entity verifications</p>
      </div>
      {msg && <div className="text-sm text-emerald-700 bg-emerald-50 rounded px-3 py-2">{msg}</div>}
      {err && <div className="text-sm text-red-700 bg-red-50 rounded px-3 py-2">{err}</div>}

      <form
        className="bg-white border border-slate-200 rounded-xl p-4 grid sm:grid-cols-2 gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <Select value={form.entityType} onValueChange={(v) => setForm((f) => ({ ...f, entityType: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="Entity ID" value={form.entityId} onChange={(e) => setForm((f) => ({ ...f, entityId: e.target.value }))} required />
        <Select value={form.verificationType} onValueChange={(v) => setForm((f) => ({ ...f, verificationType: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {VERIFICATION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} />
        <Textarea className="sm:col-span-2" placeholder="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        <Button type="submit" className="bg-teal-700 text-white" disabled={create.isPending}>Create verification</Button>
      </form>

      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          {["PENDING", "VERIFIED", "REJECTED", "EXPIRED", "REVOKED"].map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {list.isLoading ? (
        <Loader2 className="animate-spin text-teal-700" />
      ) : list.isError ? (
        <div className="text-sm text-red-700 bg-red-50 rounded px-3 py-2">{(list.error as Error).message}</div>
      ) : (list.data?.items?.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-500">No verifications in queue</div>
      ) : (
        <div className="space-y-2">
          {list.data.items.map((v: { id: number; entityType: string; entityId: number; verificationType: string; status: string; history?: { id: number; action: string; fromStatus: string | null; toStatus: string }[] }) => (
            <div key={v.id} className={`bg-white border rounded-xl p-4 text-sm ${selected === v.id ? "border-teal-400" : "border-slate-200"}`}>
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-medium">#{v.id} · {v.entityType} {v.entityId}</p>
                  <p className="text-xs text-slate-500">{v.verificationType} · {v.status}</p>
                  {v.history && (
                    <div className="mt-2 space-y-0.5">
                      {v.history.map((h) => (
                        <p key={h.id} className="text-xs text-slate-400">{h.action}: {h.fromStatus ?? "—"} → {h.toStatus}</p>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="outline" onClick={() => action.mutate({ id: v.id, act: "APPROVE" })}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => action.mutate({ id: v.id, act: "REJECT" })}>Reject</Button>
                  <Button size="sm" variant="outline" onClick={() => action.mutate({ id: v.id, act: "REVOKE" })}>Revoke</Button>
                  <Button size="sm" variant="outline" onClick={() => action.mutate({ id: v.id, act: "RENEW" })}>Renew</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
