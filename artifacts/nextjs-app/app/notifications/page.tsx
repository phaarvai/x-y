"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import XiyLogo from "@/components/XiyLogo";
import { apiUrl } from "@/lib/api-url";
import { useAuthContext } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

function NotificationsInner() {
  const { token } = useAuthContext();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/notifications"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{
        items: Array<{ id: number; title: string; description: string | null; status: string; createdAt: string; relatedType: string | null; relatedId: number | null }>;
      }>;
    },
    enabled: !!token,
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl("/api/notifications"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ all: true }),
      });
      if (!res.ok) throw await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast({ title: "Marked all as read" });
    },
  });

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <header className="bg-white border-b h-14 flex items-center justify-between px-6">
        <Link href="/"><XiyLogo size="sm" /></Link>
        <Button size="sm" variant="outline" onClick={() => markAll.mutate()}>Mark all read</Button>
      </header>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Notifications</h1>
        {isLoading ? (
          <div className="flex justify-center py-16"><LoadingSpinner /></div>
        ) : !(data?.items?.length) ? (
          <EmptyState title="No notifications" description="Updates on requests, bookings, and offers will appear here." />
        ) : (
          <div className="space-y-3">
            {data.items.map((n) => (
              <div key={n.id} className={`bg-white border rounded-xl p-4 shadow-sm ${n.status === "UNREAD" ? "border-blue-200" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{n.title}</div>
                    {n.description && <p className="text-sm text-gray-600 mt-1">{n.description}</p>}
                    <div className="text-xs text-gray-400 mt-2">{new Date(n.createdAt).toLocaleString()} · {n.status}</div>
                  </div>
                  {n.relatedType === "ManufacturingRequest" && n.relatedId && (
                    <Link href={`/requests/${n.relatedId}`} className="text-sm text-blue-600 whitespace-nowrap">Open</Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <ProtectedRoute>
      <NotificationsInner />
    </ProtectedRoute>
  );
}
