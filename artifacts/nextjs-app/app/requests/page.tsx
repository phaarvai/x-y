"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import XiyLogo from "@/components/XiyLogo";
import { apiUrl } from "@/lib/api-url";
import { useAuthContext } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

function RequestsInboxInner() {
  const params = useSearchParams();
  const inbox = params.get("inbox") === "manufacturer";
  const { token } = useAuthContext();

  const { data, isLoading } = useQuery({
    queryKey: ["requests-inbox", inbox],
    queryFn: async () => {
      const q = inbox ? "?inbox=manufacturer" : "";
      const res = await fetch(apiUrl(`/api/requests${q}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ items: Array<{ id: number; title: string; status: string; requestType: string; createdAt: string }> }>;
    },
    enabled: !!token,
  });

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <header className="bg-white border-b h-14 flex items-center justify-between px-6">
        <Link href="/"><XiyLogo size="sm" /></Link>
        <div className="flex gap-2">
          <Link href="/requests"><Button variant={!inbox ? "default" : "outline"} size="sm">All</Button></Link>
          <Link href="/requests?inbox=manufacturer"><Button variant={inbox ? "default" : "outline"} size="sm">Manufacturer inbox</Button></Link>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">{inbox ? "Incoming Requests" : "My Requests"}</h1>
        {isLoading ? (
          <div className="flex justify-center py-16"><LoadingSpinner /></div>
        ) : !(data?.items?.length) ? (
          <EmptyState title="No requests yet" description="Booking and requirement activity will show up here." />
        ) : (
          <div className="space-y-3">
            {data.items.map((r) => (
              <Link key={r.id} href={`/requests/${r.id}`} className="block bg-white border rounded-xl p-4 shadow-sm hover:border-blue-300">
                <div className="font-semibold">{r.title}</div>
                <div className="text-sm text-gray-500 mt-1">{r.status} · {r.requestType}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function RequestsPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>}>
        <RequestsInboxInner />
      </Suspense>
    </ProtectedRoute>
  );
}
