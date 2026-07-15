"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useAuth, useAuthContext } from "@/hooks/use-auth";
import { apiUrl } from "@/lib/api-url";

type Plan = {
  id: number;
  name: string;
  description: string | null;
  price: string;
  currency: string;
  billingCycle: string;
  commissionType: string;
  commissionValue: string;
  listingLimit: number | null;
  featuredListings: number | null;
  prioritySupport: boolean;
  adCredits: number;
  features: string | null;
  isRecommended: boolean;
};

type MeSub = {
  current: (Record<string, unknown> & { plan?: Plan; endDate?: string | null; status?: string }) | null;
  history: unknown[];
  expiredBanner: boolean;
  downgraded: boolean;
};

export default function PricingPage() {
  const { isAuthenticated } = useAuth();
  const { token } = useAuthContext();
  const qc = useQueryClient();
  const [cycle, setCycle] = useState<"MONTHLY" | "YEARLY" | "ALL">("ALL");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const plansQuery = useQuery<{ items: Plan[] }>({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/subscription-plans"));
      if (!res.ok) throw new Error("Failed to load plans");
      return res.json();
    },
  });

  const meQuery = useQuery<MeSub>({
    queryKey: ["subscriptions-me"],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/subscriptions/me"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load subscription");
      return res.json();
    },
  });

  const subscribe = useMutation({
    mutationFn: async (planId: number) => {
      const res = await fetch(apiUrl("/api/subscriptions"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ planId, autoRenew: true }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Purchase failed");
      return body;
    },
    onSuccess: () => {
      setMsg("Subscription activated.");
      setErr(null);
      qc.invalidateQueries({ queryKey: ["subscriptions-me"] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  const plans = useMemo(() => {
    const items = plansQuery.data?.items ?? [];
    if (cycle === "ALL") return items;
    return items.filter((p) => p.billingCycle === cycle);
  }, [plansQuery.data, cycle]);

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Subscription Plans</h1>
          <p className="text-gray-500 mt-2 text-sm">Choose a plan that fits your manufacturing and listing needs.</p>
          <div className="mt-4 inline-flex rounded-lg border border-gray-200 bg-white p-1 gap-1">
            {(["ALL", "MONTHLY", "YEARLY"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCycle(c)}
                className={`px-3 py-1.5 text-sm rounded-md ${cycle === c ? "bg-blue-600 text-white" : "text-gray-600"}`}
              >
                {c === "ALL" ? "All" : c.charAt(0) + c.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {meQuery.data?.expiredBanner && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-sm p-4">
            Your previous subscription expired. You are on free defaults until you renew.
          </div>
        )}
        {meQuery.data?.downgraded && meQuery.data?.expiredBanner === false && !meQuery.data.current && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm p-4">
            You currently have no active plan. Subscribe below to unlock higher listing limits and lower commission rates.
          </div>
        )}
        {meQuery.data?.current && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            Current plan: <strong>{(meQuery.data.current.plan as Plan | undefined)?.name ?? "Active"}</strong>
            {meQuery.data.current.endDate
              ? ` · valid until ${new Date(String(meQuery.data.current.endDate)).toLocaleDateString()}`
              : " · lifetime"}
            {" · "}
            <Link href="/dashboard/subscription" className="underline">Manage</Link>
          </div>
        )}

        {msg && <div className="mb-4 rounded-lg bg-emerald-50 text-emerald-800 text-sm px-3 py-2">{msg}</div>}
        {err && <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{err}</div>}

        {plansQuery.isLoading ? (
          <div className="grid md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-72 rounded-xl bg-white border animate-pulse" />
            ))}
          </div>
        ) : plans.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
            No plans available yet. Admins can create plans from the admin console.
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-5">
            {plans.map((plan) => {
              const features = (plan.features || "")
                .split(/[,\n]/)
                .map((f) => f.trim())
                .filter(Boolean);
              return (
                <div
                  key={plan.id}
                  className={`rounded-xl border bg-white p-6 shadow-sm flex flex-col ${
                    plan.isRecommended ? "border-blue-400 ring-1 ring-blue-200" : "border-gray-200"
                  }`}
                >
                  {plan.isRecommended && (
                    <span className="text-[10px] uppercase tracking-wide text-blue-700 font-semibold mb-2">Recommended</span>
                  )}
                  <h2 className="text-xl font-bold text-gray-900">{plan.name}</h2>
                  <p className="text-sm text-gray-500 mt-1 min-h-[40px]">{plan.description || "Platform access plan"}</p>
                  <p className="mt-4 text-3xl font-bold text-gray-900">
                    {plan.currency} {plan.price}
                    <span className="text-sm font-normal text-gray-500"> / {plan.billingCycle.toLowerCase()}</span>
                  </p>
                  <ul className="mt-4 space-y-2 flex-1">
                    <li className="text-sm text-gray-600 flex gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" />{plan.listingLimit ?? "∞"} listings</li>
                    <li className="text-sm text-gray-600 flex gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" />{plan.featuredListings ?? 0} featured</li>
                    <li className="text-sm text-gray-600 flex gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" />{plan.adCredits} ad credits</li>
                    <li className="text-sm text-gray-600 flex gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" />Commission {plan.commissionValue}{plan.commissionType === "PERCENTAGE" ? "%" : " flat"}</li>
                    {plan.prioritySupport && (
                      <li className="text-sm text-gray-600 flex gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" />Priority support</li>
                    )}
                    {features.map((f) => (
                      <li key={f} className="text-sm text-gray-600 flex gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" />{f}</li>
                    ))}
                  </ul>
                  <Button
                    className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={!isAuthenticated || subscribe.isPending}
                    onClick={() => {
                      if (!isAuthenticated) return;
                      subscribe.mutate(plan.id);
                    }}
                  >
                    {subscribe.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : isAuthenticated ? "Subscribe" : "Sign in to subscribe"}
                  </Button>
                  {!isAuthenticated && (
                    <Link href="/login" className="text-center text-xs text-blue-600 mt-2 hover:underline">Sign in required</Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
