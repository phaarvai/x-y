"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useAuthContext } from "@/hooks/use-auth";
import { apiUrl } from "@/lib/api-url";

type Listing = {
  id: number;
  listingType: string;
  listingId: number;
  title: string;
  status: string;
  ownerUserId: number | null;
  createdAt: string;
};

type ModerateAction = "approve" | "reject" | "request-changes" | null;

export default function AdminListingsPage() {
  const { token } = useAuthContext();
  const qc = useQueryClient();
  const [status, setStatus] = useState("PENDING");
  const [listingType, setListingType] = useState("all");
  const [action, setAction] = useState<ModerateAction>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const query = useQuery<{ items: Listing[]; total: number }>({
    queryKey: ["admin-listings", status, listingType],
    enabled: !!token,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      if (listingType !== "all") params.set("listingType", listingType);
      const res = await fetch(apiUrl(`/api/admin/listings?${params}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
      return res.json();
    },
  });

  const moderate = useMutation({
    mutationFn: async ({ id, act }: { id: number; act: string }) => {
      const res = await fetch(apiUrl(`/api/admin/listings/${id}/${act}`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Moderation failed");
      return body;
    },
    onSuccess: () => {
      setMsg("Listing updated.");
      setErr(null);
      setAction(null);
      setReason("");
      setSelectedId(null);
      qc.invalidateQueries({ queryKey: ["admin-listings"] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  const openAction = (id: number, act: ModerateAction) => {
    setSelectedId(id);
    setAction(act);
    setReason("");
  };

  const confirmModerate = () => {
    if (!selectedId || !action) return;
    if (action !== "approve" && !reason.trim()) {
      setErr("Reason is required for reject and request-changes.");
      return;
    }
    moderate.mutate({ id: selectedId, act: action });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Listing Moderation</h1>
        <p className="text-sm text-slate-500">Review and moderate platform listings</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {["PENDING", "APPROVED", "REJECTED", "CHANGES_REQUESTED"].map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={listingType} onValueChange={setListingType}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {["VENDOR", "LABOR", "LOGISTICS", "MARKET_OPPORTUNITY", "ADVERTISEMENT", "LEGAL_PROVIDER"].map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {msg && <div className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">{msg}</div>}
      {err && <div className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{err}</div>}

      {query.isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-teal-700" /></div>
      ) : (query.data?.items.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-500">No listings in queue</div>
      ) : (
        <div className="space-y-3">
          {query.data!.items.map((l) => (
            <div key={l.id} className="bg-white border border-slate-200 rounded-xl p-4 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">{l.title || `Listing #${l.listingId}`}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    #{l.id} · {l.listingType} · Owner {l.ownerUserId ?? "—"} · {new Date(l.createdAt).toLocaleString()}
                  </p>
                  <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded bg-slate-100">{l.status}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="outline" onClick={() => openAction(l.id, "approve")}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => openAction(l.id, "reject")}>Reject</Button>
                  <Button size="sm" variant="outline" onClick={() => openAction(l.id, "request-changes")}>Request changes</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={action !== null}
        title={action === "approve" ? "Approve listing" : action === "reject" ? "Reject listing" : "Request changes"}
        description={action === "approve" ? "Approve this listing for publication?" : "Provide a reason for the moderator action."}
        destructive={action === "reject"}
        loading={moderate.isPending}
        onCancel={() => { setAction(null); setReason(""); }}
        onConfirm={confirmModerate}
      >
        {action !== "approve" && (
          <Textarea placeholder="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
        )}
      </ConfirmDialog>
    </div>
  );
}
