"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useAuthContext } from "@/hooks/use-auth";
import { apiUrl } from "@/lib/api-url";

type DialogType = "suspend" | "activate" | "deactivate" | "reset-verification" | null;

export default function AdminUserDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { token } = useAuthContext();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<DialogType>(null);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const detail = useQuery({
    queryKey: ["admin-user", id],
    enabled: !!token && !!id,
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/admin/users/${id}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
      return res.json();
    },
  });

  const activity = useQuery({
    queryKey: ["admin-user-activity", id],
    enabled: !!token && !!id,
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/admin/users/${id}/activity`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return { items: [] };
      return res.json();
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch(apiUrl(`/api/admin/users/${id}/status`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason: reason || undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed");
      return body;
    },
    onSuccess: () => {
      setMsg("User status updated.");
      setErr(null);
      setDialog(null);
      setReason("");
      qc.invalidateQueries({ queryKey: ["admin-user", id] });
      qc.invalidateQueries({ queryKey: ["admin-user-activity", id] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  const verificationMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl(`/api/admin/users/${id}/verification`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed");
      return body;
    },
    onSuccess: () => {
      setMsg("Verification reset.");
      setDialog(null);
      qc.invalidateQueries({ queryKey: ["admin-user", id] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  if (detail.isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-teal-700" /></div>;
  }

  if (detail.isError || !detail.data) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <p className="text-sm text-red-700">{(detail.error as Error)?.message || "User not found"}</p>
        <Link href="/admin/users"><Button variant="outline" className="mt-4">Back to users</Button></Link>
      </div>
    );
  }

  const { user, adminRoles, bookings, reviews, subscriptions, loginHistory } = detail.data;

  const confirmStatus = () => {
    if (dialog === "suspend") statusMutation.mutate("SUSPENDED");
    else if (dialog === "activate") statusMutation.mutate("ACTIVE");
    else if (dialog === "deactivate") statusMutation.mutate("DEACTIVATED");
    else if (dialog === "reset-verification") verificationMutation.mutate();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link href="/admin/users" className="inline-flex items-center gap-1 text-sm text-teal-800 hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to users
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{user.name}</h1>
          <p className="text-sm text-slate-500">{user.email}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-xs px-2 py-0.5 rounded bg-slate-100">{user.status}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-teal-50 text-teal-800">{user.primaryRole ?? "—"}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-100">{user.identityVerificationStatus}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setDialog("suspend")}>Suspend</Button>
          <Button size="sm" variant="outline" onClick={() => setDialog("activate")}>Activate</Button>
          <Button size="sm" variant="outline" onClick={() => setDialog("deactivate")}>Deactivate</Button>
          <Button size="sm" variant="outline" onClick={() => setDialog("reset-verification")}>Reset verification</Button>
        </div>
      </div>

      {msg && <div className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">{msg}</div>}
      {err && <div className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{err}</div>}

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="bg-white border border-slate-200 rounded-xl p-4">
          <h2 className="font-semibold text-slate-900 mb-2">Admin Roles</h2>
          {(adminRoles?.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-500">No admin roles assigned.</p>
          ) : (
            <ul className="text-sm space-y-1">
              {adminRoles.map((r: { name: string; assignedAt: string }) => (
                <li key={r.name}>{r.name} · {new Date(r.assignedAt).toLocaleDateString()}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-4">
          <h2 className="font-semibold text-slate-900 mb-2">Profile</h2>
          <dl className="text-sm grid grid-cols-2 gap-2">
            <dt className="text-slate-500">Industry</dt><dd>{user.industry ?? "—"}</dd>
            <dt className="text-slate-500">Location</dt><dd>{user.location ?? "—"}</dd>
            <dt className="text-slate-500">Joined</dt><dd>{new Date(user.createdAt).toLocaleString()}</dd>
            {user.suspendedAt && (
              <>
                <dt className="text-slate-500">Suspended</dt>
                <dd>{new Date(user.suspendedAt).toLocaleString()}</dd>
              </>
            )}
          </dl>
        </section>
      </div>

      <section className="bg-white border border-slate-200 rounded-xl p-4">
        <h2 className="font-semibold text-slate-900 mb-2">Bookings ({bookings?.length ?? 0})</h2>
        {(bookings?.length ?? 0) === 0 ? (
          <p className="text-sm text-slate-500">No bookings.</p>
        ) : (
          <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
            {bookings.slice(0, 10).map((b: { id: number; status: string }) => (
              <li key={b.id}>Booking #{b.id} · {b.status}</li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="bg-white border border-slate-200 rounded-xl p-4">
          <h2 className="font-semibold text-slate-900 mb-2">Reviews ({reviews?.length ?? 0})</h2>
          {(reviews?.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-500">No reviews.</p>
          ) : (
            <ul className="text-sm space-y-1 max-h-32 overflow-y-auto">
              {reviews.slice(0, 5).map((r: { id: number; overallRating: number }) => (
                <li key={r.id}>Review #{r.id} · {r.overallRating}★</li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-4">
          <h2 className="font-semibold text-slate-900 mb-2">Subscriptions ({subscriptions?.length ?? 0})</h2>
          {(subscriptions?.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-500">No subscriptions.</p>
          ) : (
            <ul className="text-sm space-y-1">
              {subscriptions.map((s: { id: number; status: string }) => (
                <li key={s.id}>#{s.id} · {s.status}</li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="bg-white border border-slate-200 rounded-xl p-4">
        <h2 className="font-semibold text-slate-900 mb-2">Login History</h2>
        {(loginHistory?.length ?? 0) === 0 ? (
          <p className="text-sm text-slate-500">No login history.</p>
        ) : (
          <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
            {loginHistory.map((l: { id: number; success: boolean; ipAddress: string | null; createdAt: string }) => (
              <li key={l.id}>
                {l.success ? "Success" : "Failed"} · {l.ipAddress ?? "—"} · {new Date(l.createdAt).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-4">
        <h2 className="font-semibold text-slate-900 mb-2">Activity Timeline</h2>
        {(activity.data?.items?.length ?? 0) === 0 ? (
          <p className="text-sm text-slate-500">No activity recorded.</p>
        ) : (
          <ul className="text-sm space-y-2 max-h-60 overflow-y-auto">
            {activity.data.items.map((a: { type: string; action: string; createdAt: string; entityType: string }, i: number) => (
              <li key={i} className="flex justify-between gap-2 border-b border-slate-100 pb-1">
                <span>{a.action} · {a.entityType}</span>
                <span className="text-xs text-slate-400">{new Date(a.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={dialog !== null}
        title={
          dialog === "suspend" ? "Suspend user" :
          dialog === "activate" ? "Activate user" :
          dialog === "deactivate" ? "Deactivate user" :
          "Reset verification"
        }
        description={
          dialog === "reset-verification"
            ? "This will set the user's identity verification status to UNVERIFIED."
            : "Provide an optional reason for this action."
        }
        destructive={dialog === "suspend" || dialog === "deactivate"}
        loading={statusMutation.isPending || verificationMutation.isPending}
        onCancel={() => { setDialog(null); setReason(""); }}
        onConfirm={confirmStatus}
      >
        {dialog !== "reset-verification" && (
          <Textarea placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
        )}
      </ConfirmDialog>
    </div>
  );
}
