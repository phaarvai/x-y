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

function FavoritesInner() {
  const { token } = useAuthContext();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["favorites"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/favorites"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ items: Array<{ id: number; entityType: string; entityId: number; title: string | null }> }>;
    },
    enabled: !!token,
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(apiUrl(`/api/favorites/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favorites"] });
      toast({ title: "Removed from favorites" });
    },
  });

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <header className="bg-white border-b h-14 flex items-center px-6"><Link href="/"><XiyLogo size="sm" /></Link></header>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Saved Listings</h1>
        {isLoading ? (
          <div className="flex justify-center py-16"><LoadingSpinner /></div>
        ) : !(data?.items?.length) ? (
          <EmptyState title="No favorites yet" description="Save manufacturers and listings while browsing." />
        ) : (
          <div className="space-y-3">
            {data.items.map((f) => (
              <div key={f.id} className="bg-white border rounded-xl p-4 flex items-center justify-between shadow-sm">
                <div>
                  <div className="font-semibold">{f.title || `${f.entityType} #${f.entityId}`}</div>
                  <div className="text-xs text-gray-500 mt-1">{f.entityType} · #{f.entityId}</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => remove.mutate(f.id)}>Remove</Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FavoritesPage() {
  return (
    <ProtectedRoute>
      <FavoritesInner />
    </ProtectedRoute>
  );
}
