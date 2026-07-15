import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Plus, Trash2, Factory, Clock, DollarSign, MapPin, CalendarDays, CheckCircle2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import XiyLogo from "@/components/XiyLogo";

const MACHINE_TYPES = ["CNC Milling", "3D Printing", "Laser Cutting", "Injection Molding", "CNC Lathe", "Welding", "Assembly", "Sheet Metal", "Rapid Prototyping", "Surface Finishing"];

interface AvailabilitySlot {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  price: string;
}

interface Machine {
  id: number;
  name: string;
  type: string;
  description: string;
  pricePerHour: string;
  location: string;
  quantity: string;
  slots: AvailabilitySlot[];
}

const EMPTY_MACHINE: Omit<Machine, "id"> = {
  name: "",
  type: "",
  description: "",
  pricePerHour: "",
  location: "",
  quantity: "1",
  slots: [],
};

export default function ProviderSetupPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [currentMachine, setCurrentMachine] = useState<Omit<Machine, "id">>({ ...EMPTY_MACHINE });
  const [slotCounter, setSlotCounter] = useState(1);

  const addSlot = () => {
    setCurrentMachine(prev => ({
      ...prev,
      slots: [...prev.slots, { id: slotCounter, date: "", startTime: "09:00", endTime: "17:00", price: prev.pricePerHour }],
    }));
    setSlotCounter(c => c + 1);
  };

  const removeSlot = (slotId: number) => {
    setCurrentMachine(prev => ({ ...prev, slots: prev.slots.filter(s => s.id !== slotId) }));
  };

  const updateSlot = (slotId: number, field: keyof AvailabilitySlot, value: string) => {
    setCurrentMachine(prev => ({
      ...prev,
      slots: prev.slots.map(s => s.id === slotId ? { ...s, [field]: value } : s),
    }));
  };

  const saveMachine = () => {
    if (!currentMachine.name || !currentMachine.type || !currentMachine.pricePerHour) {
      toast({ title: "Fill in all required fields", variant: "destructive" });
      return;
    }
    const newMachine: Machine = { ...currentMachine, id: Date.now() };
    setMachines(prev => [...prev, newMachine]);
    setCurrentMachine({ ...EMPTY_MACHINE });
    toast({ title: "Machine added!", description: `${newMachine.name} has been added to your listing.` });
  };

  const finishSetup = () => {
    if (machines.length === 0) {
      toast({ title: "Add at least one machine", description: "Please add a machine before finishing.", variant: "destructive" });
      return;
    }
    setStep(3);
  };

  const STEPS = [
    { n: 1, label: "Factory Info" },
    { n: 2, label: "Add Machines" },
    { n: 3, label: "Go Live" },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/"><XiyLogo size="sm" /></Link>
          <span className="text-sm text-gray-500">Provider Setup</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Progress steps */}
        <div className="flex items-center gap-0 mb-10">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step >= s.n ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-400"}`}>
                  {step > s.n ? <CheckCircle2 className="w-4 h-4" /> : s.n}
                </div>
                <span className={`text-xs mt-1 font-medium ${step >= s.n ? "text-blue-600" : "text-gray-400"}`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 mb-4 ${step > s.n ? "bg-blue-600" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        {/* Step 1 — Factory Info */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Factory className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900 text-lg">Tell us about your factory</h1>
                <p className="text-gray-500 text-sm">Basic information to help customers find you</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Factory / Business Name *</Label>
                <Input placeholder="e.g. PrecisionTech Manufacturing" className="h-11 border-gray-200 rounded-lg" />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Tagline</Label>
                <Input placeholder="e.g. Precision Engineering for the Future" className="h-11 border-gray-200 rounded-lg" />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Location *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input placeholder="City, State, Country" className="pl-10 h-11 border-gray-200 rounded-lg" />
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">About Your Factory</Label>
                <textarea
                  rows={3}
                  placeholder="Describe your manufacturing capabilities, experience, and what makes you unique..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Contact Email *</Label>
                  <Input type="email" placeholder="contact@yourfactory.com" className="h-11 border-gray-200 rounded-lg" />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Phone Number</Label>
                  <Input type="tel" placeholder="+1 (555) 000-0000" className="h-11 border-gray-200 rounded-lg" />
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 h-11 gap-2" onClick={() => setStep(2)}>
                Continue <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2 — Add Machines */}
        {step === 2 && (
          <div className="space-y-5">
            {/* Added machines list */}
            {machines.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3 text-sm">Added Machines ({machines.length})</h3>
                <div className="space-y-2">
                  {machines.map(m => (
                    <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{m.name}</p>
                        <p className="text-xs text-gray-400">{m.type} • ${m.pricePerHour}/hr • {m.slots.length} slots</p>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Machine form */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <h2 className="font-bold text-gray-900 text-lg mb-1">Add a Machine</h2>
              <p className="text-gray-500 text-sm mb-6">Add each machine you want to list for booking</p>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Machine Name *</Label>
                    <Input
                      placeholder="e.g. CNC Milling Machine"
                      value={currentMachine.name}
                      onChange={e => setCurrentMachine(p => ({ ...p, name: e.target.value }))}
                      className="h-11 border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Machine Type *</Label>
                    <Select value={currentMachine.type} onValueChange={v => setCurrentMachine(p => ({ ...p, type: v }))}>
                      <SelectTrigger className="h-11 border-gray-200 rounded-lg">
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {MACHINE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Description</Label>
                  <textarea
                    rows={2}
                    placeholder="Describe the machine specs, capabilities, and compatible materials..."
                    value={currentMachine.description}
                    onChange={e => setCurrentMachine(p => ({ ...p, description: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Price per Hour *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="number"
                        placeholder="150"
                        value={currentMachine.pricePerHour}
                        onChange={e => setCurrentMachine(p => ({ ...p, pricePerHour: e.target.value }))}
                        className="pl-9 h-11 border-gray-200 rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="1"
                      value={currentMachine.quantity}
                      onChange={e => setCurrentMachine(p => ({ ...p, quantity: e.target.value }))}
                      className="h-11 border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Location</Label>
                    <Input
                      placeholder="Hall A, Floor 2"
                      value={currentMachine.location}
                      onChange={e => setCurrentMachine(p => ({ ...p, location: e.target.value }))}
                      className="h-11 border-gray-200 rounded-lg"
                    />
                  </div>
                </div>

                {/* Availability Slots */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-medium text-gray-700">Availability Slots</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addSlot} className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50">
                      <Plus className="w-3.5 h-3.5" /> Add Slot
                    </Button>
                  </div>
                  {currentMachine.slots.length === 0 && (
                    <div className="text-center py-6 border border-dashed border-gray-200 rounded-lg">
                      <CalendarDays className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No slots added yet. Click "Add Slot" to start.</p>
                    </div>
                  )}
                  <div className="space-y-3">
                    {currentMachine.slots.map(slot => (
                      <div key={slot.id} className="grid grid-cols-4 gap-2 bg-gray-50 rounded-lg p-3 items-end">
                        <div>
                          <Label className="text-xs text-gray-500 mb-1 block">Date</Label>
                          <Input type="date" value={slot.date} onChange={e => updateSlot(slot.id, "date", e.target.value)} className="h-9 border-gray-200 rounded-md text-xs" />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500 mb-1 block">Start Time</Label>
                          <Input type="time" value={slot.startTime} onChange={e => updateSlot(slot.id, "startTime", e.target.value)} className="h-9 border-gray-200 rounded-md text-xs" />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500 mb-1 block">End Time</Label>
                          <Input type="time" value={slot.endTime} onChange={e => updateSlot(slot.id, "endTime", e.target.value)} className="h-9 border-gray-200 rounded-md text-xs" />
                        </div>
                        <div className="flex gap-1 items-end">
                          <div className="flex-1">
                            <Label className="text-xs text-gray-500 mb-1 block">Price ($)</Label>
                            <Input type="number" value={slot.price} onChange={e => updateSlot(slot.id, "price", e.target.value)} placeholder="150" className="h-9 border-gray-200 rounded-md text-xs" />
                          </div>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeSlot(slot.id)} className="h-9 w-9 p-0 text-red-400 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3 justify-between">
                <Button variant="outline" onClick={() => setStep(1)} className="border-gray-200 text-gray-600">Back</Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={saveMachine} className="border-blue-200 text-blue-600 hover:bg-blue-50 gap-1.5">
                    <Plus className="w-4 h-4" /> Save & Add Another
                  </Button>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 font-semibold" onClick={finishSetup}>
                    Finish Setup <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Go Live */}
        {step === 3 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 shadow-sm text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">You're all set!</h2>
            <p className="text-gray-500 mb-2">
              Your factory profile is live with <span className="font-semibold text-gray-900">{machines.length} machine{machines.length !== 1 ? "s" : ""}</span>.
            </p>
            <p className="text-gray-400 text-sm mb-8">Customers can now find and book your machines instantly.</p>

            <div className="bg-gray-50 rounded-xl p-5 text-left mb-8 space-y-2">
              {machines.map(m => (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="font-medium text-gray-900">{m.name}</span>
                    <span className="text-gray-400">{m.type}</span>
                  </div>
                  <span className="text-blue-600 font-semibold">${m.pricePerHour}/hr</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-center">
              <Link href="/browse">
                <Button variant="outline" className="border-gray-200 text-gray-700">View Marketplace</Button>
              </Link>
              <Link href="/">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5">
                  Go to Dashboard <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
