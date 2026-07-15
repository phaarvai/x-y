"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useAuthContext } from "@/hooks/use-auth";
import { useAdminMe } from "@/hooks/use-admin-me";
import { apiUrl } from "@/lib/api-url";

type Dispute = {
  id: number;
  bookingId: number;
  openedBy: number;
  againstUser: number | null;
  category: string;
  reason: string;
  description: string;
  status: string;
  priority: string;
  assignedAdminId?: number | null;
  createdAt: string;
};

export default function AdminDisputesPage() {
  const { token } = useAuthContext();
  const { data: admin } = useAdminMe();
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const [closeId, setCloseId] = useState<number | null>(null);
  const [resolution, setResolution] = useState("");
  const [assignId, setAssignId] = useState<number | null>(null);
  const [assignAdminId, setAssignAdminId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const query = useQuery<{ items: Dispute[]; total: number }>({
    queryKey: ["admin-disputes", status],
    enabled: !!token,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      const res = await fetch(apiUrl(`/api/admin/disputes?${params}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
      return res.json();
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ id, adminId }: { id: number; adminId: number }) => {
      const res = await fetch(apiUrl(`/api/admin/disputes/${id}/assign`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ assignedAdminId: adminId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Assign failed");
      return body;
    },
    onSuccess: () => {
      setMsg("Dispute assigned.");
      setAssignId(null);
      qc.invalidateQueries({ queryKey: ["admin-disputes"] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, next }: { id: number; next: string }) => {
      const res = await fetch(apiUrl(`/api/admin/disputes/${id}/status`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Update failed");
      return body;
    },
    onSuccess: () => {
      setMsg("Status updated.");
      qc.invalidateQueries({ queryKey: ["admin-disputes"] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  const closeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(apiUrl(`/api/admin/disputes/${id}/close`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ resolutionNotes: resolution }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Close failed");
      return body;
    },
    onSuccess: () => {
      setMsg("Dispute closed.");
      setCloseId(null);
      setResolution("");
      qc.invalidateQueries({ queryKey: ["admin-disputes"] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Disputes</h1>
        <p className="text-sm text-slate-500">{query.data?.total ?? 0} disputes</p>
      </div>

      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {["OPEN", "UNDER_REVIEW", "RESOLVED", "CLOSED"].map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {msg && <div className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">{msg}</div>}
      {err && <div className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{err}</div>}

      {query.isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-teal-700" /></div>
      ) : (query.data?.items.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-500">No disputes</div>
      ) : (
        <div className="space-y-3">
          {query.data!.items.map((d) => (
            <div key={d.id} className="bg-white border border-slate-200 rounded-xl p-4 text-sm">
              <div className="flex flex-wrap justify-between gap-2 mb-2">
                <div>
                  <p className="font-medium text-slate-900">#{d.id} · Booking {d.bookingId}</p>
                  <p className="text-xs text-slate-500">{d.category} · {d.reason} · Priority {d.priority}</p>
                  {d.assignedAdminId && <p className="text-xs text-teal-700 mt-0.5">Assigned to admin #{d.assignedAdminId}</p>}
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 h-fit">{d.status}</span>
              </div>
              <p className="text-slate-600 mb-3">{d.description}</p>
              <div className="flex flex-wrap gap-1">
                <Button size="sm" variant="outline" onClick={() => { setAssignId(d.id); setAssignAdminId(admin ? String(admin.id) : ""); }}>
                  Assign
                </Button>
                <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: d.id, next: "UNDER_REVIEW" })}>
                  Mark reviewing
                </Button>
                <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: d.id, next: "RESOLVED" })}>
                  Resolve
                </Button>
                <Button size="sm" variant="outline" onClick={() => setCloseId(d.id)}>Close</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={closeId !== null}
        title="Close dispute"
        description="Provide resolution notes before closing."
        loading={closeMutation.isPending}
        onCancel={() => { setCloseId(null); setResolution(""); }}
        onConfirm={() => closeId && closeMutation.mutate(closeId)}
      >
        <Textarea placeholder="Resolution notes" value={resolution} onChange={(e) => setResolution(e.target.value)} rows={3} />
      </ConfirmDialog>

      <ConfirmDialog
        open={assignId !== null}
        title="Assign dispute"
        description="Enter the admin user ID to assign this dispute."
        loading={assignMutation.isPending}
        onCancel={() => setAssignId(null)}
        onConfirm={() => {
          if (assignId && assignAdminId) assignMutation.mutate({ id: assignId, adminId: parseInt(assignAdminId, 10) });
        }}
      >
        <Input placeholder="Admin user ID" value={assignAdminId} onChange={(e) => setAssignAdminId(e.target.value)} />
      </ConfirmDialog>
    </div>
  );
}
