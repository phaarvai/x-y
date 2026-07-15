"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useAuth, useAuthContext } from "@/hooks/use-auth";
import { apiUrl } from "@/lib/api-url";

export default function SubscriptionDashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { token } = useAuthContext();
  const qc = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["subscriptions-me"],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/subscriptions/me"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
      return res.json();
    },
  });

  const cancel = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl("/api/subscriptions/me/cancel"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Cancel failed");
      return body;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subscriptions-me"] }),
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

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900">My Subscription</h1>
          <Link href="/pricing"><Button variant="outline" size="sm">View plans</Button></Link>
        </div>

        {data?.expiredBanner && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Subscription expired — features downgraded. <Link href="/pricing" className="underline">Renew now</Link>
          </div>
        )}
        {isError && <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{(error as Error).message}</div>}

        {data?.current ? (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Current plan</p>
            <h2 className="text-xl font-semibold text-gray-900 mt-1">{data.current.plan?.name}</h2>
            <p className="text-sm text-gray-600 mt-2">
              Status: {data.current.status}
              {data.current.endDate ? ` · Ends ${new Date(data.current.endDate).toLocaleDateString()}` : " · Lifetime"}
            </p>
            <div className="flex gap-2 mt-4">
              <Link href="/pricing"><Button size="sm" className="bg-blue-600 text-white">Upgrade / change</Button></Link>
              <Button size="sm" variant="outline" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
                Cancel auto-renew
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <p className="font-medium text-gray-800">No active subscription</p>
            <p className="text-sm text-gray-500 mt-1">Browse plans to unlock ads credits and better commission rates.</p>
            <Link href="/pricing" className="inline-block mt-4"><Button className="bg-blue-600 text-white">See pricing</Button></Link>
          </div>
        )}

        <section>
          <h3 className="font-semibold text-gray-900 mb-3">Subscription history</h3>
          {(data?.history?.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-500">No history yet.</p>
          ) : (
            <div className="space-y-2">
              {data.history.map((h: any) => (
                <div key={h.id} className="bg-white border border-gray-200 rounded-lg p-3 text-sm flex justify-between gap-3">
                  <span>{h.plan?.name} · {h.status}</span>
                  <span className="text-gray-500">{new Date(h.startDate).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
