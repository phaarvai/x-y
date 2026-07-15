"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useAuth, useAuthContext } from "@/hooks/use-auth";
import { apiUrl } from "@/lib/api-url";

type Txn = {
  id: number;
  amount: string;
  currency: string;
  status: string;
  bookingId: number | null;
  transactionDate: string;
  referenceNumber: string | null;
};

export default function PaymentsDashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { token } = useAuthContext();
  const qc = useQueryClient();

  const { data, isLoading, isError, error } = useQuery<{ items: Txn[] }>({
    queryKey: ["my-transactions"],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/transactions"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
      return res.json();
    },
  });

  const checkout = useMutation({
    mutationFn: async (transactionId: number) => {
      const res = await fetch(apiUrl("/api/payments/checkout"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Checkout failed");
      return body;
    },
    onSuccess: async (body) => {
      // MVP: complete mock payment immediately after checkout creation
      await fetch(apiUrl("/api/payments/mock-complete"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: body.transaction.id, status: "PAID" }),
      });
      qc.invalidateQueries({ queryKey: ["my-transactions"] });
    },
  });

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Payments</h1>
        <p className="text-sm text-gray-500 mb-6">Payment status and transaction history.</p>

        {authLoading || isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-blue-600" /></div>
        ) : !isAuthenticated ? (
          <div className="text-center py-12"><Link href="/login"><Button className="bg-blue-600 text-white">Sign In</Button></Link></div>
        ) : isError ? (
          <div className="rounded-lg bg-red-50 text-red-700 p-4 text-sm">{(error as Error).message}</div>
        ) : (data?.items?.length ?? 0) === 0 ? (
          <div className="rounded-xl border border-dashed bg-white p-12 text-center text-gray-500">No payments yet.</div>
        ) : (
          <div className="space-y-3">
            {data!.items.map((t) => (
              <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">#{t.id} · {t.currency} {t.amount}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(t.transactionDate).toLocaleString()}
                      {t.bookingId ? ` · Booking #${t.bookingId}` : ""}
                      {t.referenceNumber ? ` · Ref ${t.referenceNumber}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${t.status === "PAID" ? "bg-emerald-50 text-emerald-700" : t.status === "PENDING" ? "bg-amber-50 text-amber-800" : "bg-gray-100 text-gray-700"}`}>
                      {t.status}
                    </span>
                    {t.status === "PENDING" && (
                      <Button size="sm" className="bg-blue-600 text-white" disabled={checkout.isPending} onClick={() => checkout.mutate(t.id)}>
                        Pay now
                      </Button>
                    )}
                    {t.status === "PAID" && (
                      <a href={apiUrl(`/api/payments/${t.id}/receipt`)} className="inline-flex">
                        <Button size="sm" variant="outline" className="gap-1"><Download className="w-3.5 h-3.5" /> Receipt</Button>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
