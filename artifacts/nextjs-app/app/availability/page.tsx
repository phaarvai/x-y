"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import XiyLogo from "@/components/XiyLogo";
import { apiUrl } from "@/lib/api-url";
import { useAuthContext } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

function AvailabilityInner() {
  const { token } = useAuthContext();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({
    inventoryId: "",
    slotDate: "",
    startTime: "09:00",
    endTime: "17:00",
    isRecurring: false,
    recurrenceRule: "WEEKLY",
    notes: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["availability"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/availability"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{
        items: Array<{ id: number; inventoryId: number; slotDate: string; startTime: string; endTime: string; status: string; isRecurring: boolean }>;
      }>;
    },
    enabled: !!token,
  });

  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl("/api/availability"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          inventoryId: Number(form.inventoryId),
          slotDate: form.slotDate,
          startTime: form.startTime,
          endTime: form.endTime,
          isRecurring: form.isRecurring,
          recurrenceRule: form.isRecurring ? form.recurrenceRule : undefined,
          notes: form.notes || undefined,
        }),
      });
      if (!res.ok) throw await res.json();
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["availability"] });
      toast({ title: "Slot saved" });
    },
    onError: (e: { error?: string }) => toast({ title: "Failed", description: e?.error, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(apiUrl(`/api/availability/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw await res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["availability"] }),
  });

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <header className="bg-white border-b h-14 flex items-center px-6"><Link href="/"><XiyLogo size="sm" /></Link></header>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold">Machine Availability</h1>
        <div className="bg-white border rounded-xl p-5 shadow-sm space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Machine ID *</Label><Input value={form.inventoryId} onChange={(e) => setForm((p) => ({ ...p, inventoryId: e.target.value }))} /></div>
            <div><Label>Date *</Label><Input type="date" value={form.slotDate} onChange={(e) => setForm((p) => ({ ...p, slotDate: e.target.value }))} /></div>
            <div><Label>Start</Label><Input value={form.startTime} onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))} /></div>
            <div><Label>End</Label><Input value={form.endTime} onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isRecurring} onChange={(e) => setForm((p) => ({ ...p, isRecurring: e.target.checked }))} />
            Recurring weekly
          </label>
          <Button className="bg-blue-600 text-white" onClick={() => create.mutate()} disabled={!form.inventoryId || !form.slotDate}>
            Add slot
          </Button>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-10"><LoadingSpinner /></div>
        ) : !(data?.items?.length) ? (
          <EmptyState title="No slots yet" description="Add availability for your published machines." />
        ) : (
          <div className="space-y-2">
            {data.items.map((s) => (
              <div key={s.id} className="bg-white border rounded-xl p-4 flex justify-between items-center">
                <div className="text-sm">
                  <div className="font-medium">Machine #{s.inventoryId} · {s.slotDate}</div>
                  <div className="text-gray-500">{s.startTime}–{s.endTime} · {s.status}{s.isRecurring ? " · recurring" : ""}</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => remove.mutate(s.id)}>Delete</Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AvailabilityPage() {
  return (
    <ProtectedRoute>
      <RoleGuard allowedRoles={["MANUFACTURER", "PLATFORM_ADMIN"]}>
        <AvailabilityInner />
      </RoleGuard>
    </ProtectedRoute>
  );
}
