"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CalendarDays, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import XiyLogo from "@/components/XiyLogo";
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { apiUrl } from "@/lib/api-url";
import { useAuthContext } from "@/hooks/use-auth";

function BookingInner() {
  const { manufacturerId, machineId } = useParams<{ manufacturerId: string; machineId: string }>();
  const facilityId = parseInt(manufacturerId || "0", 10);
  const inventoryId = parseInt(machineId || "0", 10);
  const router = useRouter();
  const { toast } = useToast();
  const { token } = useAuthContext();
  const [message, setMessage] = useState("");
  const [selectedSlots, setSelectedSlots] = useState<number[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["facility-booking", facilityId],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/marketplace/manufacturers/${facilityId}`));
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: facilityId > 0,
  });

  const machine = data?.machines?.find((m: { id: number }) => m.id === inventoryId);
  const slots = (data?.slots ?? []).filter((s: { inventoryId: number }) => s.inventoryId === inventoryId);

  const submit = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl("/api/requests"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          facilityId,
          inventoryId,
          manufacturerUserId: data.facility.ownerUserId,
          title: `Booking request: ${machine?.name ?? "Machinery"}`,
          message,
          slotIds: selectedSlots.length ? selectedSlots : undefined,
        }),
      });
      if (!res.ok) throw await res.json();
      return res.json();
    },
    onSuccess: (req) => {
      toast({ title: "Request submitted!", description: "The manufacturer will review your request." });
      router.push(`/requests/${req.id}`);
    },
    onError: (e: { error?: string }) => toast({ title: "Request failed", description: e?.error, variant: "destructive" }),
  });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner className="w-8 h-8" /></div>;
  if (!data?.facility || !machine) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Link href="/browse"><Button variant="outline">Back to Search</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <header className="sticky top-0 z-50 bg-white border-b h-14 flex items-center px-6 justify-between">
        <Link href="/"><XiyLogo size="sm" /></Link>
        <Link href={`/manufacturer/${facilityId}`}><Button variant="outline" size="sm">Back</Button></Link>
      </header>
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">{machine.name}</h1>
          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><MapPin className="w-3.5 h-3.5" /> {data.facility.location}</p>
          <p className="text-blue-600 font-bold mt-2">${Number(machine.pricePerHour)}/hr</p>
        </div>

        {slots.length > 0 && (
          <div className="bg-white rounded-xl border p-6 shadow-sm">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Select Availability</h2>
            <div className="space-y-2">
              {slots.map((s: { id: number; slotDate: string; startTime: string; endTime: string }) => (
                <label key={s.id} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${selectedSlots.includes(s.id) ? "border-blue-500 bg-blue-50" : ""}`}>
                  <input type="checkbox" checked={selectedSlots.includes(s.id)} onChange={() => setSelectedSlots((prev) => prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id])} />
                  <span className="text-sm">{s.slotDate} {s.startTime}–{s.endTime}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <Label>Message to manufacturer</Label>
          <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe your project, quantities, timeline..." className="mt-2" />
        </div>

        <Button className="w-full bg-blue-600 text-white h-11" onClick={() => submit.mutate()} disabled={submit.isPending}>
          {submit.isPending ? "Submitting..." : "Submit Request"}
        </Button>
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <ProtectedRoute>
      <BookingInner />
    </ProtectedRoute>
  );
}
