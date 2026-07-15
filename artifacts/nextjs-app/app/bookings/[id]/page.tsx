"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Download, FileText, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, useAuthContext } from "@/hooks/use-auth";
import { apiUrl } from "@/lib/api-url";
import { DISPUTE_CATEGORIES, formatCategory } from "@/lib/legal-constants";
import ReviewForm from "@/components/reviews/ReviewForm";
import { StarRating } from "@/components/reviews/StarRating";

type Acceptance = {
  id: number;
  userId: number;
  accepted: boolean;
  acceptedAt: string;
  digitalSignature: string | null;
};

type LegalDoc = {
  id: number;
  documentTitle: string;
  documentUrl: string | null;
  documentContent: string | null;
  version: number;
  status: string;
  requiresAcceptance: boolean;
  acceptances: Acceptance[];
};

type LegalPayload = {
  booking: { id: number; reference: string; status: string; agreementsPending?: boolean };
  items: LegalDoc[];
  agreementsPending: boolean;
};

export default function BookingDetailPage() {
  const params = useParams();
  const bookingId = String(params.id);
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const { token } = useAuthContext();
  const qc = useQueryClient();

  const [acceptChecked, setAcceptChecked] = useState<Record<number, boolean>>({});
  const [signature, setSignature] = useState("");
  const [showDispute, setShowDispute] = useState(false);
  const [disputeForm, setDisputeForm] = useState({
    category: "QUALITY",
    reason: "",
    description: "",
    againstUserId: "",
    evidenceUrl: "",
    evidenceName: "",
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [attachTitle, setAttachTitle] = useState("");
  const [attachTemplateId, setAttachTemplateId] = useState("");
  const [attachContent, setAttachContent] = useState("");

  const { data, isLoading, isError, error } = useQuery<LegalPayload>({
    queryKey: ["booking-legal", bookingId],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/bookings/${bookingId}/legal-documents`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to load");
      return res.json();
    },
  });

  const templatesQuery = useQuery<{ items: { id: number; title: string; category: string }[] }>({
    queryKey: ["contract-templates-public"],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/contracts/templates"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return { items: [] };
      return res.json();
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async (docId: number) => {
      const res = await fetch(apiUrl(`/api/legal-documents/${docId}/accept`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          accepted: true,
          digitalSignature: signature.trim() || user?.name || "Accepted",
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Acceptance failed");
      return body;
    },
    onSuccess: () => {
      setMsg("Agreement accepted.");
      setErr(null);
      qc.invalidateQueries({ queryKey: ["booking-legal", bookingId] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  const attachMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl(`/api/bookings/${bookingId}/legal-documents`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          documentTitle: attachTitle.trim(),
          templateId: attachTemplateId ? parseInt(attachTemplateId, 10) : null,
          documentContent: attachContent || null,
          requiresAcceptance: true,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Attach failed");
      return body;
    },
    onSuccess: () => {
      setMsg("Agreement attached.");
      setAttachTitle("");
      setAttachContent("");
      setAttachTemplateId("");
      qc.invalidateQueries({ queryKey: ["booking-legal", bookingId] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  const startProductionMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl(`/api/bookings/${bookingId}/production/start`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || body.message || "Cannot start production");
      return body;
    },
    onSuccess: () => {
      setMsg("Production started.");
      qc.invalidateQueries({ queryKey: ["booking-legal", bookingId] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  const disputeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl(`/api/bookings/${bookingId}/disputes`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          category: disputeForm.category,
          reason: disputeForm.reason.trim(),
          description: disputeForm.description.trim(),
          againstUserId: disputeForm.againstUserId ? parseInt(disputeForm.againstUserId, 10) : undefined,
          evidence: disputeForm.evidenceUrl
            ? [{ fileUrl: disputeForm.evidenceUrl, fileName: disputeForm.evidenceName || "evidence", fileType: "application/octet-stream" }]
            : undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to open dispute");
      return body;
    },
    onSuccess: () => {
      setMsg("Dispute opened.");
      setShowDispute(false);
      qc.invalidateQueries({ queryKey: ["booking-legal", bookingId] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl(`/api/bookings/${bookingId}/complete`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Cannot complete booking");
      return body;
    },
    onSuccess: () => {
      setMsg("Booking marked completed. You can leave a review.");
      qc.invalidateQueries({ queryKey: ["booking-legal", bookingId] });
      qc.invalidateQueries({ queryKey: ["booking-reviews", bookingId] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  const reviewsQuery = useQuery({
    queryKey: ["booking-reviews", bookingId],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/bookings/${bookingId}/reviews`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return { items: [], myReview: null, canReview: false };
      return res.json();
    },
  });

  if (authLoading || isLoading) {
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

  const pending = data?.agreementsPending ?? false;

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <Link href="/bookings" className="text-sm text-blue-600 hover:underline">← Bookings</Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">{data?.booking.reference ?? `Booking #${bookingId}`}</h1>
            <p className="text-sm text-gray-500">Status: {data?.booking.status}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              className="bg-blue-600 text-white"
              disabled={pending || startProductionMutation.isPending}
              onClick={() => startProductionMutation.mutate()}
            >
              Start production
            </Button>
            <Button
              variant="outline"
              disabled={completeMutation.isPending || data?.booking.status === "COMPLETED"}
              onClick={() => completeMutation.mutate()}
            >
              Mark completed
            </Button>
            <Button variant="outline" className="gap-1 text-amber-800 border-amber-300" onClick={() => setShowDispute((v) => !v)}>
              <AlertTriangle className="w-4 h-4" /> Report dispute
            </Button>
          </div>
        </div>

        {pending && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-medium">Required agreements not accepted</p>
              <p className="mt-0.5">Production and completion actions are blocked until all required parties accept.</p>
            </div>
          </div>
        )}

        {msg && <div className="rounded-lg bg-emerald-50 text-emerald-800 text-sm px-3 py-2">{msg}</div>}
        {err && <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{err}</div>}
        {isError && <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{(error as Error).message}</div>}

        <section className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><FileText className="w-4 h-4" /> Legal Agreements</h2>

          {(data?.items?.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-500 mb-4">No agreements attached yet.</p>
          ) : (
            <div className="space-y-4 mb-6">
              {data!.items.map((doc) => {
                const mine = doc.acceptances.find((a) => a.userId === user?.id);
                return (
                  <div key={doc.id} className="rounded-lg border border-gray-100 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-medium text-gray-900">{doc.documentTitle}</p>
                        <p className="text-xs text-gray-500">Version {doc.version} · {doc.requiresAcceptance ? "Acceptance required" : "Informational"}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded ${doc.status === "ACCEPTED" || doc.status === "FULLY_ACCEPTED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
                        {doc.status}
                      </span>
                    </div>
                    {doc.documentContent && (
                      <pre className="text-xs bg-gray-50 rounded p-3 max-h-40 overflow-auto whitespace-pre-wrap mb-3">{doc.documentContent}</pre>
                    )}
                    {doc.documentUrl && (
                      <a href={doc.documentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-3">
                        <Download className="w-3.5 h-3.5" /> Download / preview
                      </a>
                    )}
                    {doc.acceptances.length > 0 && (
                      <div className="mb-3 space-y-1">
                        <p className="text-xs font-medium text-gray-500 uppercase">Acceptance history</p>
                        {doc.acceptances.map((a) => (
                          <p key={a.id} className="text-xs text-gray-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            User #{a.userId} · {new Date(a.acceptedAt).toLocaleString()}
                            {a.digitalSignature ? ` · “${a.digitalSignature}”` : ""}
                          </p>
                        ))}
                      </div>
                    )}
                    {doc.requiresAcceptance && !mine && (
                      <div className="space-y-2 border-t border-gray-100 pt-3">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`accept-${doc.id}`}
                            checked={!!acceptChecked[doc.id]}
                            onCheckedChange={(v) => setAcceptChecked((s) => ({ ...s, [doc.id]: !!v }))}
                          />
                          <Label htmlFor={`accept-${doc.id}`} className="text-sm">I have read and agree to this agreement</Label>
                        </div>
                        <Input
                          placeholder="Digital signature (full name)"
                          value={signature}
                          onChange={(e) => setSignature(e.target.value)}
                          className="max-w-sm"
                        />
                        <Button
                          size="sm"
                          className="bg-blue-600 text-white"
                          disabled={!acceptChecked[doc.id] || acceptMutation.isPending}
                          onClick={() => acceptMutation.mutate(doc.id)}
                        >
                          Accept agreement
                        </Button>
                      </div>
                    )}
                    {mine && (
                      <p className="text-sm text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> You accepted on {new Date(mine.acceptedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-sm font-medium text-gray-800">Attach agreement</p>
            <Input placeholder="Document title" value={attachTitle} onChange={(e) => setAttachTitle(e.target.value)} />
            <Select value={attachTemplateId || "none"} onValueChange={(v) => setAttachTemplateId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Template (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No template</SelectItem>
                {(templatesQuery.data?.items ?? []).map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>{t.title} ({formatCategory(t.category)})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea placeholder="Agreement content (optional if using template)" rows={4} value={attachContent} onChange={(e) => setAttachContent(e.target.value)} />
            <Button
              size="sm"
              variant="outline"
              disabled={!attachTitle.trim() || attachMutation.isPending}
              onClick={() => attachMutation.mutate()}
            >
              Attach to booking
            </Button>
          </div>
        </section>

        {showDispute && (
          <section className="bg-white rounded-xl border border-amber-200 p-5 shadow-sm space-y-3">
            <h2 className="font-semibold text-gray-900">Report a dispute</h2>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Category</Label>
              <Select value={disputeForm.category} onValueChange={(v) => setDisputeForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DISPUTE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{formatCategory(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input placeholder="Reason *" value={disputeForm.reason} onChange={(e) => setDisputeForm((f) => ({ ...f, reason: e.target.value }))} />
            <Textarea placeholder="Description *" rows={4} value={disputeForm.description} onChange={(e) => setDisputeForm((f) => ({ ...f, description: e.target.value }))} />
            <Input placeholder="Against user ID (optional)" value={disputeForm.againstUserId} onChange={(e) => setDisputeForm((f) => ({ ...f, againstUserId: e.target.value }))} />
            <Input placeholder="Evidence file URL" value={disputeForm.evidenceUrl} onChange={(e) => setDisputeForm((f) => ({ ...f, evidenceUrl: e.target.value }))} />
            <Input placeholder="Evidence file name" value={disputeForm.evidenceName} onChange={(e) => setDisputeForm((f) => ({ ...f, evidenceName: e.target.value }))} />
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={!disputeForm.reason.trim() || !disputeForm.description.trim() || disputeMutation.isPending}
              onClick={() => disputeMutation.mutate()}
            >
              Submit dispute
            </Button>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="font-semibold text-gray-900">Reviews</h2>
          {reviewsQuery.data?.canReview && (
            <ReviewForm bookingId={bookingId} token={token} onSuccess={() => qc.invalidateQueries({ queryKey: ["booking-reviews", bookingId] })} />
          )}
          {reviewsQuery.data?.myReview && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
              <p className="font-medium text-gray-800 mb-2">Your review ({reviewsQuery.data.myReview.status})</p>
              <StarRating value={reviewsQuery.data.myReview.overallRating} readOnly />
              {reviewsQuery.data.myReview.comment && (
                <p className="text-gray-600 mt-2 whitespace-pre-wrap">{reviewsQuery.data.myReview.comment}</p>
              )}
            </div>
          )}
          {!reviewsQuery.data?.canReview && !reviewsQuery.data?.myReview && data?.booking.status !== "COMPLETED" && (
            <p className="text-sm text-gray-500">Reviews unlock after the booking is marked completed.</p>
          )}
        </section>
      </div>
    </div>
  );
}
