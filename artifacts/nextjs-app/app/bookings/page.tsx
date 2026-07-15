"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useAuth, useAuthContext } from "@/hooks/use-auth";
import { apiUrl } from "@/lib/api-url";

type Booking = {
  id: number;
  reference: string;
  status: string;
  visionaryUserId: number;
  manufacturerUserId: number;
  agreedPrice: string | null;
  currency: string | null;
  createdAt: string;
};

export default function BookingsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { token } = useAuthContext();

  const { data, isLoading, isError, error } = useQuery<{ items: Booking[] }>({
    queryKey: ["bookings"],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/bookings"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to load bookings");
      return res.json();
    },
  });

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">My Bookings</h1>
        <p className="text-sm text-gray-500 mb-6">View legal agreements and report disputes.</p>

        {authLoading || isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
        ) : !isAuthenticated ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">Sign in to view bookings.</p>
            <Link href="/login"><Button className="bg-blue-600 text-white">Sign In</Button></Link>
          </div>
        ) : isError ? (
          <div className="rounded-lg bg-red-50 text-red-700 p-4 text-sm">{(error as Error).message}</div>
        ) : (data?.items?.length ?? 0) === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <p className="font-medium text-gray-800">No bookings yet</p>
            <p className="text-sm text-gray-500 mt-1">Confirmed production bookings will appear here.</p>
            <Link href="/browse" className="inline-block mt-4"><Button variant="outline">Browse manufacturers</Button></Link>
          </div>
        ) : (
          <div className="space-y-3">
            {data!.items.map((b) => (
              <Link
                key={b.id}
                href={`/bookings/${b.id}`}
                className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{b.reference}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Created {new Date(b.createdAt).toLocaleDateString()}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "DISPUTED"
      ? "bg-amber-50 text-amber-800"
      : status === "COMPLETED"
        ? "bg-emerald-50 text-emerald-800"
        : "bg-blue-50 text-blue-800";
  return <span className={`text-xs font-medium px-2.5 py-1 rounded ${color}`}>{status}</span>;
}
