"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuthContext } from "@/hooks/use-auth";
import { apiUrl } from "@/lib/api-url";

type Txn = {
  id: number;
  amount: string;
  currency: string;
  status: string;
  payerUserId: number;
  payeeUserId: number | null;
  bookingId: number | null;
  referenceNumber: string | null;
  adminNotes: string | null;
  transactionDate: string;
  commissionAmount: string | null;
};

export default function AdminTransactionsPage() {
  const { token } = useAuthContext();
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const query = useQuery<{ items: Txn[]; total: number }>({
    queryKey: ["admin-transactions", status, q],
    enabled: !!token,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      if (q) params.set("q", q);
      const res = await fetch(apiUrl(`/api/admin/transactions?${params}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
      return res.json();
    },
  });

  const detail = useQuery({
    queryKey: ["admin-transaction", selected],
    enabled: !!token && selected != null,
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/admin/transactions/${selected}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load detail");
      return res.json();
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (next: string) => {
      const res = await fetch(apiUrl(`/api/admin/transactions/${selected}/status`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: next, adminNotes: adminNotes || undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Update failed");
      return body;
    },
    onSuccess: () => {
      setMsg("Status updated.");
      setErr(null);
      qc.invalidateQueries({ queryKey: ["admin-transactions"] });
      qc.invalidateQueries({ queryKey: ["admin-transaction", selected] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  const updateRef = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl(`/api/admin/transactions/${selected}/reference`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ referenceNumber, adminNotes: adminNotes || undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Reference update failed");
      return body;
    },
    onSuccess: () => {
      setMsg("Reference saved.");
      qc.invalidateQueries({ queryKey: ["admin-transaction", selected] });
      qc.invalidateQueries({ queryKey: ["admin-transactions"] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  return (
    <div className="max-w-6xl mx-auto grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
          <p className="text-sm text-slate-500">Manage payment transactions</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Search ref / id" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {["PENDING", "PAID", "FAILED", "REFUNDED", "CANCELLED"].map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {msg && <div className="text-sm text-emerald-700 bg-emerald-50 rounded px-3 py-2">{msg}</div>}
        {err && <div className="text-sm text-red-700 bg-red-50 rounded px-3 py-2">{err}</div>}
        {query.isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-teal-700" /></div>
        ) : query.isError ? (
          <div className="text-sm text-red-700 bg-red-50 rounded px-3 py-2">{(query.error as Error).message}</div>
        ) : (query.data?.items?.length ?? 0) === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-500">No transactions</div>
        ) : (
          <div className="space-y-2">
            {query.data!.items.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelected(t.id)}
                className={`w-full text-left bg-white border rounded-lg p-3 text-sm hover:border-teal-200 ${selected === t.id ? "border-teal-400" : "border-slate-200"}`}
              >
                <div className="flex justify-between gap-2">
                  <span className="font-medium">#{t.id} · {t.currency} {t.amount}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-100">{t.status}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Booking {t.bookingId ?? "—"} · Payer {t.payerUserId} · {new Date(t.transactionDate).toLocaleString()}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 h-fit">
        {!selected ? (
          <p className="text-sm text-slate-500">Select a transaction to manage status and reference.</p>
        ) : detail.isLoading ? (
          <Loader2 className="animate-spin text-teal-700" />
        ) : (
          <div className="space-y-3">
            <h2 className="font-semibold text-slate-900">Transaction #{selected}</h2>
            <p className="text-sm text-slate-600">Status: {detail.data?.status}</p>
            <p className="text-sm text-slate-600">Commission: {detail.data?.currency} {detail.data?.commissionAmount}</p>
            <Textarea placeholder="Admin notes" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={3} />
            <div className="flex flex-wrap gap-2">
              {["PAID", "FAILED", "REFUNDED", "CANCELLED"].map((s) => (
                <Button key={s} size="sm" variant="outline" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate(s)}>
                  Mark {s}
                </Button>
              ))}
            </div>
            <Input placeholder="Reference number" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
            <Button size="sm" className="bg-teal-700 text-white" disabled={!referenceNumber.trim() || updateRef.isPending} onClick={() => updateRef.mutate()}>
              Save reference
            </Button>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase mb-1">Status history</p>
              {(detail.data?.history ?? []).map((h: { id: number; fromStatus: string | null; toStatus: string; createdAt: string; source: string }) => (
                <p key={h.id} className="text-xs text-slate-600">
                  {h.fromStatus ?? "—"} → {h.toStatus} · {new Date(h.createdAt).toLocaleString()} ({h.source})
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
