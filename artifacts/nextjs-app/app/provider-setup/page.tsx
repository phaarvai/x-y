"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Plus, Trash2, Factory, DollarSign, MapPin, CalendarDays, CheckCircle2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/hooks/use-auth";
import XiyLogo from "@/components/XiyLogo";
import { apiUrl } from "@/lib/api-url";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const MACHINE_TYPES = ["CNC Milling", "3D Printing", "Laser Cutting", "Injection Molding", "CNC Lathe", "Welding", "Assembly", "Sheet Metal", "Rapid Prototyping", "Surface Finishing"];

interface AvailabilitySlot { id: number; date: string; startTime: string; endTime: string; price: string; }
interface Machine {
  id: number;
  name: string;
  type: string;
  description: string;
  pricePerHour: string;
  pricePerDay: string;
  pricePerWeek: string;
  pricingModel: string;
  location: string;
  quantity: string;
  condition: string;
  slots: AvailabilitySlot[];
}

const EMPTY_MACHINE: Omit<Machine, "id"> = {
  name: "", type: "", description: "", pricePerHour: "", pricePerDay: "", pricePerWeek: "",
  pricingModel: "HOURLY", location: "", quantity: "1", condition: "", slots: [],
};

function authHeaders(token: string | null) {
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

function ProviderSetupInner() {
  const router = useRouter();
  const { toast } = useToast();
  const { token } = useAuthContext();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [facilityId, setFacilityId] = useState<number | null>(null);
  const [facility, setFacility] = useState({
    name: "",
    tagline: "",
    location: "",
    description: "",
    contactEmail: "",
    contactPhone: "",
    industry: "",
    ownerName: "",
    sezStatus: "NONE",
    serviceAreas: "",
    workingHours: "",
    addressLine: "",
  });
  const [machines, setMachines] = useState<Machine[]>([]);
  const [currentMachine, setCurrentMachine] = useState<Omit<Machine, "id">>({ ...EMPTY_MACHINE });
  const [slotCounter, setSlotCounter] = useState(1);

  const saveFacility = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl("/api/facilities"), {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ ...facility, id: facilityId ?? undefined }),
      });
      if (!res.ok) throw await res.json();
      return res.json();
    },
    onSuccess: (data) => {
      setFacilityId(data.id);
      setStep(2);
      toast({ title: "Factory saved" });
    },
    onError: (e: { error?: string }) => toast({ title: "Failed to save factory", description: e?.error, variant: "destructive" }),
  });

  const saveMachineApi = useMutation({
    mutationFn: async (machine: Omit<Machine, "id">) => {
      if (!facilityId) throw new Error("Save factory first");
      const res = await fetch(apiUrl(`/api/facilities/${facilityId}/machinery`), {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({
          name: machine.name,
          machineType: machine.type,
          description: machine.description,
          quantity: Number(machine.quantity) || 1,
          pricePerHour: machine.pricePerHour || 0,
          pricePerDay: machine.pricePerDay || undefined,
          pricePerWeek: machine.pricePerWeek || undefined,
          pricingModel: machine.pricingModel || "HOURLY",
          condition: machine.condition || undefined,
          keywords: machine.type ? [machine.type] : [],
          slots: machine.slots.map((s) => ({ date: s.date, startTime: s.startTime, endTime: s.endTime, price: s.price })),
        }),
      });
      if (!res.ok) throw await res.json();
      return res.json();
    },
  });

  const publish = useMutation({
    mutationFn: async () => {
      if (!facilityId) throw new Error("No facility");
      const res = await fetch(apiUrl(`/api/facilities/${facilityId}/publish`), {
        method: "POST",
        headers: authHeaders(token),
      });
      if (!res.ok) throw await res.json();
      return res.json();
    },
    onSuccess: () => {
      setStep(3);
      toast({ title: "Listing submitted for review!" });
    },
    onError: (e: { error?: string }) => toast({ title: "Publish failed", description: e?.error, variant: "destructive" }),
  });

  const addSlot = () => {
    setCurrentMachine((prev) => ({
      ...prev,
      slots: [...prev.slots, { id: slotCounter, date: "", startTime: "09:00", endTime: "17:00", price: prev.pricePerHour }],
    }));
    setSlotCounter((c) => c + 1);
  };

  const saveMachine = async () => {
    if (!currentMachine.name || !currentMachine.type || !currentMachine.pricePerHour) {
      toast({ title: "Fill in all required fields", variant: "destructive" });
      return;
    }
    try {
      await saveMachineApi.mutateAsync(currentMachine);
      setMachines((prev) => [...prev, { ...currentMachine, id: Date.now() }]);
      setCurrentMachine({ ...EMPTY_MACHINE });
      toast({ title: "Machine added!" });
    } catch (e: unknown) {
      const err = e as { error?: string };
      toast({ title: "Failed to add machine", description: err?.error, variant: "destructive" });
    }
  };

  const finishSetup = () => {
    if (machines.length === 0) {
      toast({ title: "Add at least one machine", variant: "destructive" });
      return;
    }
    publish.mutate();
  };

  const STEPS = [{ n: 1, label: "Factory Info" }, { n: 2, label: "Add Machines" }, { n: 3, label: "Go Live" }];

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/"><XiyLogo size="sm" /></Link>
          <span className="text-sm text-gray-500">Provider Setup</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center gap-0 mb-10">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= s.n ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-400"}`}>
                  {step > s.n ? <CheckCircle2 className="w-4 h-4" /> : s.n}
                </div>
                <span className={`text-xs mt-1 font-medium ${step >= s.n ? "text-blue-600" : "text-gray-400"}`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 mb-4 ${step > s.n ? "bg-blue-600" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><Factory className="w-5 h-5 text-blue-600" /></div>
              <div>
                <h1 className="font-bold text-gray-900 text-lg">Tell us about your factory</h1>
                <p className="text-gray-500 text-sm">Basic information to help customers find you</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Factory / Business Name *</Label>
                <Input value={facility.name} onChange={(e) => setFacility((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. PrecisionTech Manufacturing" className="h-11 border-gray-200 rounded-lg" />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Tagline</Label>
                <Input value={facility.tagline} onChange={(e) => setFacility((p) => ({ ...p, tagline: e.target.value }))} placeholder="Precision Engineering for the Future" className="h-11 border-gray-200 rounded-lg" />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Location *</Label>
                <div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input value={facility.location} onChange={(e) => setFacility((p) => ({ ...p, location: e.target.value }))} placeholder="City, State, Country" className="pl-10 h-11 border-gray-200 rounded-lg" /></div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Industry</Label>
                <Input value={facility.industry} onChange={(e) => setFacility((p) => ({ ...p, industry: e.target.value }))} placeholder="e.g. Aerospace" className="h-11 border-gray-200 rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Owner / Contact name</Label>
                  <Input value={facility.ownerName} onChange={(e) => setFacility((p) => ({ ...p, ownerName: e.target.value }))} className="h-11 border-gray-200 rounded-lg" />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">SEZ status</Label>
                  <Select value={facility.sezStatus} onValueChange={(v) => setFacility((p) => ({ ...p, sezStatus: v }))}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">None</SelectItem>
                      <SelectItem value="SEZ">SEZ</SelectItem>
                      <SelectItem value="EOU">EOU</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Address line</Label>
                <Input value={facility.addressLine} onChange={(e) => setFacility((p) => ({ ...p, addressLine: e.target.value }))} className="h-11 border-gray-200 rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Service areas</Label>
                  <Input value={facility.serviceAreas} onChange={(e) => setFacility((p) => ({ ...p, serviceAreas: e.target.value }))} className="h-11 border-gray-200 rounded-lg" />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Working hours</Label>
                  <Input value={facility.workingHours} onChange={(e) => setFacility((p) => ({ ...p, workingHours: e.target.value }))} placeholder="Mon–Fri 9–18" className="h-11 border-gray-200 rounded-lg" />
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">About Your Factory</Label>
                <textarea rows={3} value={facility.description} onChange={(e) => setFacility((p) => ({ ...p, description: e.target.value }))} placeholder="Describe your manufacturing capabilities..." className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-sm font-medium text-gray-700 mb-1.5 block">Contact Email *</Label><Input type="email" value={facility.contactEmail} onChange={(e) => setFacility((p) => ({ ...p, contactEmail: e.target.value }))} className="h-11 border-gray-200 rounded-lg" /></div>
                <div><Label className="text-sm font-medium text-gray-700 mb-1.5 block">Phone</Label><Input type="tel" value={facility.contactPhone} onChange={(e) => setFacility((p) => ({ ...p, contactPhone: e.target.value }))} className="h-11 border-gray-200 rounded-lg" /></div>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <Button disabled={saveFacility.isPending || !facility.name || !facility.location} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 h-11 gap-2" onClick={() => saveFacility.mutate()}>
                {saveFacility.isPending ? <LoadingSpinner className="w-4 h-4" /> : null} Continue <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            {machines.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3 text-sm">Added Machines ({machines.length})</h3>
                {machines.map((m) => (
                  <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div><p className="font-medium text-gray-900 text-sm">{m.name}</p><p className="text-xs text-gray-400">{m.type} • ${m.pricePerHour}/hr</p></div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                ))}
              </div>
            )}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm space-y-4">
              <h2 className="font-bold text-gray-900 text-lg">Add a Machine</h2>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Machine Name *</Label><Input value={currentMachine.name} onChange={(e) => setCurrentMachine((p) => ({ ...p, name: e.target.value }))} className="h-11" /></div>
                <div>
                  <Label>Machine Type *</Label>
                  <Select value={currentMachine.type} onValueChange={(v) => setCurrentMachine((p) => ({ ...p, type: v }))}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Select type..." /></SelectTrigger>
                    <SelectContent>{MACHINE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Description</Label><textarea rows={2} value={currentMachine.description} onChange={(e) => setCurrentMachine((p) => ({ ...p, description: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Price per Hour *</Label><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input type="number" value={currentMachine.pricePerHour} onChange={(e) => setCurrentMachine((p) => ({ ...p, pricePerHour: e.target.value }))} className="pl-9 h-11" /></div></div>
                <div><Label>Quantity</Label><Input type="number" value={currentMachine.quantity} onChange={(e) => setCurrentMachine((p) => ({ ...p, quantity: e.target.value }))} className="h-11" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Pricing model</Label>
                  <Select value={currentMachine.pricingModel} onValueChange={(v) => setCurrentMachine((p) => ({ ...p, pricingModel: v }))}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["HOURLY", "DAILY", "WEEKLY", "MONTHLY", "PER_UNIT", "PER_BATCH"].map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Price / day</Label><Input type="number" value={currentMachine.pricePerDay} onChange={(e) => setCurrentMachine((p) => ({ ...p, pricePerDay: e.target.value }))} className="h-11" /></div>
                <div><Label>Price / week</Label><Input type="number" value={currentMachine.pricePerWeek} onChange={(e) => setCurrentMachine((p) => ({ ...p, pricePerWeek: e.target.value }))} className="h-11" /></div>
              </div>
              <div><Label>Condition</Label><Input value={currentMachine.condition} onChange={(e) => setCurrentMachine((p) => ({ ...p, condition: e.target.value }))} placeholder="Excellent / Good / Refurbished" className="h-11" /></div>
              <div>
                <div className="flex items-center justify-between mb-2"><Label className="flex items-center gap-1"><CalendarDays className="w-4 h-4" /> Availability Slots</Label><Button type="button" variant="outline" size="sm" onClick={addSlot}><Plus className="w-3 h-3 mr-1" /> Add Slot</Button></div>
                {currentMachine.slots.map((s) => (
                  <div key={s.id} className="grid grid-cols-4 gap-2 mb-2">
                    <Input type="date" value={s.date} onChange={(e) => setCurrentMachine((p) => ({ ...p, slots: p.slots.map((x) => x.id === s.id ? { ...x, date: e.target.value } : x) }))} />
                    <Input type="time" value={s.startTime} onChange={(e) => setCurrentMachine((p) => ({ ...p, slots: p.slots.map((x) => x.id === s.id ? { ...x, startTime: e.target.value } : x) }))} />
                    <Input type="time" value={s.endTime} onChange={(e) => setCurrentMachine((p) => ({ ...p, slots: p.slots.map((x) => x.id === s.id ? { ...x, endTime: e.target.value } : x) }))} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => setCurrentMachine((p) => ({ ...p, slots: p.slots.filter((x) => x.id !== s.id) }))}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" onClick={saveMachine} disabled={saveMachineApi.isPending} className="w-full">Save Machine to Listing</Button>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button className="bg-blue-600 text-white" onClick={finishSetup} disabled={publish.isPending}>{publish.isPending ? "Publishing..." : "Publish Listing"}</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center shadow-sm">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re Live!</h2>
            <p className="text-gray-500 mb-6">Your listing is pending admin review and will appear in search once approved.</p>
            <div className="flex gap-3 justify-center">
              <Link href="/dashboard/manufacturer"><Button className="bg-blue-600 text-white">Go to Dashboard</Button></Link>
              <Link href="/browse"><Button variant="outline">Browse Marketplace</Button></Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProviderSetupPage() {
  return (
    <ProtectedRoute>
      <ProviderSetupInner />
    </ProtectedRoute>
  );
}
