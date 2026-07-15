"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StarRating } from "@/components/reviews/StarRating";
import { useAuthContext } from "@/hooks/use-auth";
import { apiUrl } from "@/lib/api-url";

export default function AdminReviewsPage() {
  const { token } = useAuthContext();
  const qc = useQueryClient();
  const [status, setStatus] = useState("PENDING");
  const [notes, setNotes] = useState("");
  const [moderationEnabled, setModerationEnabled] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["admin-reviews", status],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/admin/reviews?status=${status}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
      return res.json();
    },
  });

  const reports = useQuery({
    queryKey: ["admin-review-reports"],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/admin/review-reports"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return { items: [] };
      return res.json();
    },
  });

  const settings = useQuery({
    queryKey: ["admin-review-settings"],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/admin/review-settings"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const moderate = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: string }) => {
      const res = await fetch(apiUrl(`/api/admin/reviews/${id}/${action}`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notes || null }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed");
      return body;
    },
    onSuccess: () => {
      setMsg("Updated.");
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
  });

  const saveSettings = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl("/api/admin/review-settings"), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ moderationEnabled }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed");
      return body;
    },
    onSuccess: () => {
      setMsg("Settings saved.");
      qc.invalidateQueries({ queryKey: ["admin-review-settings"] });
    },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Review Moderation</h1>
        <p className="text-sm text-slate-500">Approve, reject, or hide user reviews</p>
      </div>
      {msg && <div className="text-sm text-emerald-700 bg-emerald-50 rounded px-3 py-2">{msg}</div>}

      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-3">
        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.data ? settings.data.moderationEnabled : moderationEnabled}
            onChange={(e) => setModerationEnabled(e.target.checked)}
          />
          Enable review moderation
        </label>
        <Button size="sm" variant="outline" onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending}>
          Save settings
        </Button>
      </div>

      <div className="flex gap-2 items-center">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["PENDING", "PUBLISHED", "HIDDEN", "REJECTED"].map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Textarea placeholder="Moderation notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="max-w-md" rows={1} />
      </div>

      {list.isLoading ? (
        <Loader2 className="animate-spin text-teal-700" />
      ) : list.isError ? (
        <div className="text-sm text-red-700 bg-red-50 rounded px-3 py-2">{(list.error as Error).message}</div>
      ) : (list.data?.items?.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-500">No reviews in this queue.</div>
      ) : (
        <div className="space-y-3">
          {list.data.items.map((r: { id: number; bookingId: number; overallRating: number; comment: string | null }) => (
            <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-4 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-medium">#{r.id} · Booking {r.bookingId}</p>
                  <StarRating value={r.overallRating} readOnly size="sm" />
                  <p className="text-slate-600 mt-1">{r.comment || "—"}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="outline" onClick={() => moderate.mutate({ id: r.id, action: "approve" })}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => moderate.mutate({ id: r.id, action: "reject" })}>Reject</Button>
                  <Button size="sm" variant="outline" onClick={() => moderate.mutate({ id: r.id, action: "hide" })}>Hide</Button>
                  <Button size="sm" variant="outline" onClick={() => moderate.mutate({ id: r.id, action: "restore" })}>Restore</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <section>
        <h2 className="font-semibold text-slate-900 mb-2">Reported reviews</h2>
        {(reports.data?.items?.length ?? 0) === 0 ? (
          <p className="text-sm text-slate-500">No open reports.</p>
        ) : (
          <div className="space-y-2">
            {reports.data.items.map((rep: { id: number; reviewId: number; reason: string; status: string }) => (
              <div key={rep.id} className="bg-white border border-slate-200 rounded-lg p-3 text-sm">
                Report #{rep.id} on review {rep.reviewId} · {rep.reason} · {rep.status}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
