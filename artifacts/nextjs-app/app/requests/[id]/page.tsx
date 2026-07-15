"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { apiUrl } from "@/lib/api-url";
import { useAuthContext } from "@/hooks/use-auth";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import XiyLogo from "@/components/XiyLogo";

function RequestDetailInner() {
  const { id } = useParams<{ id: string }>();
  const requestId = parseInt(id || "0", 10);
  const { token } = useAuthContext();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [message, setMessage] = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [offer, setOffer] = useState({ proposedPrice: "", terms: "", proposedStartDate: "", proposedEndDate: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["request-messages", requestId],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/requests/${requestId}/messages`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: requestId > 0 && !!token,
  });

  const { data: offersData } = useQuery({
    queryKey: ["request-offers", requestId],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/requests/${requestId}/offers`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{
        items: Array<{
          id: number;
          offeredByUserId: number;
          proposedPrice: string | null;
          terms: string | null;
          status: string;
          createdAt: string;
        }>;
      }>;
    },
    enabled: requestId > 0 && !!token,
  });

  const sendMsg = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl(`/api/requests/${requestId}/messages`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ body: message }),
      });
      if (!res.ok) throw await res.json();
      return res.json();
    },
    onSuccess: () => {
      setMessage("");
      qc.invalidateQueries({ queryKey: ["request-messages", requestId] });
    },
  });

  const respond = useMutation({
    mutationFn: async (action: "ACCEPT" | "DECLINE") => {
      const res = await fetch(apiUrl(`/api/requests/${requestId}/respond`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, declineReason: action === "DECLINE" ? declineReason : undefined }),
      });
      if (!res.ok) throw await res.json();
      return res.json();
    },
    onSuccess: (result) => {
      toast({ title: result.booking ? "Booking confirmed!" : "Request updated" });
      qc.invalidateQueries({ queryKey: ["request-messages", requestId] });
      if (result.booking) window.location.href = `/bookings/${result.booking.id}`;
    },
    onError: (e: { error?: string }) => toast({ title: "Action failed", description: e?.error, variant: "destructive" }),
  });

  const submitOffer = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl(`/api/requests/${requestId}/offers`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          proposedPrice: offer.proposedPrice || undefined,
          terms: offer.terms || undefined,
          proposedStartDate: offer.proposedStartDate || undefined,
          proposedEndDate: offer.proposedEndDate || undefined,
        }),
      });
      if (!res.ok) throw await res.json();
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Counter-offer sent" });
      setOffer({ proposedPrice: "", terms: "", proposedStartDate: "", proposedEndDate: "" });
      qc.invalidateQueries({ queryKey: ["request-offers", requestId] });
      qc.invalidateQueries({ queryKey: ["request-messages", requestId] });
    },
    onError: (e: { error?: string }) => toast({ title: "Offer failed", description: e?.error, variant: "destructive" }),
  });

  const respondOffer = useMutation({
    mutationFn: async ({ offerId, action }: { offerId: number; action: "ACCEPT" | "REJECT" }) => {
      const res = await fetch(apiUrl(`/api/offers/${offerId}/respond`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw await res.json();
      return res.json();
    },
    onSuccess: (result) => {
      toast({ title: result.booking ? "Offer accepted — booking created" : "Offer updated" });
      qc.invalidateQueries({ queryKey: ["request-offers", requestId] });
      qc.invalidateQueries({ queryKey: ["request-messages", requestId] });
      if (result.booking) window.location.href = `/bookings/${result.booking.id}`;
    },
  });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;
  const req = data?.request;
  const isManufacturer = user?.id === req?.manufacturerUserId;
  const canAct = req && ["PENDING", "COUNTERED"].includes(req.status);

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <header className="bg-white border-b h-14 flex items-center justify-between px-6">
        <Link href="/"><XiyLogo size="sm" /></Link>
        <Link href="/requests" className="text-sm text-gray-600">Back to inbox</Link>
      </header>
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
        {req && (
          <div className="bg-white rounded-xl border p-6 shadow-sm">
            <h1 className="text-xl font-bold">{req.title}</h1>
            <p className="text-sm text-gray-500 mt-1">Status: <span className="font-medium">{req.status}</span></p>
            {req.message && <p className="text-sm text-gray-600 mt-3">{req.message}</p>}
            {isManufacturer && canAct && (
              <div className="mt-4 space-y-3">
                <Textarea placeholder="Decline reason (optional)" value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} />
                <div className="flex gap-2 flex-wrap">
                  <Button className="bg-emerald-600 text-white" onClick={() => respond.mutate("ACCEPT")}>Accept & Create Booking</Button>
                  <Button variant="destructive" onClick={() => respond.mutate("DECLINE")}>Decline</Button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-xl border p-6 shadow-sm space-y-4">
          <h2 className="font-semibold">Counter-offers</h2>
          <div className="space-y-2">
            {(offersData?.items ?? []).map((o) => (
              <div key={o.id} className="border rounded-lg p-3 text-sm">
                <div className="font-medium">{o.proposedPrice ? `${o.proposedPrice}` : "No price"} · {o.status}</div>
                {o.terms && <p className="text-gray-600 mt-1">{o.terms}</p>}
                {o.status === "PENDING" && o.offeredByUserId !== user?.id && (
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" className="bg-emerald-600 text-white" onClick={() => respondOffer.mutate({ offerId: o.id, action: "ACCEPT" })}>Accept offer</Button>
                    <Button size="sm" variant="outline" onClick={() => respondOffer.mutate({ offerId: o.id, action: "REJECT" })}>Reject</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {canAct && (
            <div className="space-y-2 border-t pt-4">
              <Label>Propose counter-offer</Label>
              <Input placeholder="Proposed price" value={offer.proposedPrice} onChange={(e) => setOffer((p) => ({ ...p, proposedPrice: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={offer.proposedStartDate} onChange={(e) => setOffer((p) => ({ ...p, proposedStartDate: e.target.value }))} />
                <Input type="date" value={offer.proposedEndDate} onChange={(e) => setOffer((p) => ({ ...p, proposedEndDate: e.target.value }))} />
              </div>
              <Textarea rows={2} placeholder="Terms" value={offer.terms} onChange={(e) => setOffer((p) => ({ ...p, terms: e.target.value }))} />
              <Button className="bg-blue-600 text-white" onClick={() => submitOffer.mutate()}>Send counter-offer</Button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <h2 className="font-semibold mb-4">Messages</h2>
          <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
            {(data?.messages ?? []).map((m: { id: number; body: string; senderUserId: number; createdAt: string }) => (
              <div key={m.id} className={`text-sm p-3 rounded-lg ${m.senderUserId === user?.id ? "bg-blue-50 ml-8" : "bg-gray-50 mr-8"}`}>
                {m.body}
                <div className="text-xs text-gray-400 mt-1">{new Date(m.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
          <Textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type a message..." />
          <Button className="mt-2 bg-blue-600 text-white" onClick={() => sendMsg.mutate()} disabled={!message.trim()}>Send</Button>
        </div>
      </div>
    </div>
  );
}

export default function RequestDetailPage() {
  return (
    <ProtectedRoute>
      <RequestDetailInner />
    </ProtectedRoute>
  );
}
