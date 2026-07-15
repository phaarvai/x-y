import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { CalendarDays, Clock, MapPin, Star, Sparkles, CheckCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { manufacturers, TIME_SLOTS } from "@/data/manufacturers";
import XiyLogo from "@/components/XiyLogo";
import { useToast } from "@/hooks/use-toast";

export default function BookingPage() {
  const params = useParams<{ manufacturerId: string; machineId: string }>();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const manufacturer = manufacturers.find(m => m.id === parseInt(params.manufacturerId || "1"));
  const machine = manufacturer?.machinery.find(m => m.id === parseInt(params.machineId || "1")) ?? manufacturer?.machinery[0];
  const [selectedSlots, setSelectedSlots] = useState<number[]>([]);

  if (!manufacturer || !machine) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-3">Machine not found</p>
          <Link href="/browse"><Button variant="outline">Back to Search</Button></Link>
        </div>
      </div>
    );
  }

  const toggleSlot = (slotId: number) => {
    if (TIME_SLOTS.find(s => s.id === slotId)?.booked) return;
    setSelectedSlots(prev => prev.includes(slotId) ? prev.filter(id => id !== slotId) : [...prev, slotId]);
  };

  const selectedSlotData = TIME_SLOTS.filter(s => selectedSlots.includes(s.id));
  const totalHours = selectedSlotData.reduce((acc, s) => acc + s.hours, 0);
  const totalCost = selectedSlotData.reduce((acc, s) => acc + s.hours * s.pricePerHour, 0);

  const handleBook = () => {
    if (selectedSlots.length === 0) {
      toast({ title: "Select a time slot", description: "Please select at least one time slot to book.", variant: "destructive" });
      return;
    }
    const slotSummary = selectedSlotData.map(s => `${s.start} – ${s.end} (${s.hours} hrs)`).join(", ");
    const query = new URLSearchParams({
      machine: machine?.name || "",
      manufacturer: manufacturer?.name || "",
      location: manufacturer?.location || "",
      slots: slotSummary,
      total: `$${totalCost}`,
      date: "May 4, 2026",
    }).toString();
    setLocation(`/booking-confirmation?${query}`);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/"><XiyLogo size="sm" /></Link>
          <Link href="/browse">
            <Button variant="outline" size="sm" className="border-gray-200 text-gray-700">Back to Search</Button>
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Machine details + Time slots */}
          <div className="lg:col-span-2 space-y-5">
            {/* Machine card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{machine.name}</h1>
                  <p className="text-gray-500 text-sm mt-0.5">{machine.subtitle.split(" • ")[0].replace("Qty:", "").trim()}</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">Base Rate</div>
                  <div className="text-2xl font-bold text-blue-600">${machine.pricePerHour}/hr</div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500 mt-2">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {manufacturer.location}</span>
                <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" /> {manufacturer.rating} ({manufacturer.reviewCount} reviews)</span>
              </div>

              {machine.specs && (
                <div className="mt-5 pt-5 border-t border-gray-100">
                  <h3 className="font-semibold text-gray-900 text-sm mb-3">Specifications</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {machine.specs.workEnvelope && <div><p className="text-xs text-gray-400">Work Envelope</p><p className="text-sm font-medium text-gray-800 mt-0.5">{machine.specs.workEnvelope}</p></div>}
                    {machine.specs.spindleSpeed && <div><p className="text-xs text-gray-400">Spindle Speed</p><p className="text-sm font-medium text-gray-800 mt-0.5">{machine.specs.spindleSpeed}</p></div>}
                    {machine.specs.toolCapacity && <div><p className="text-xs text-gray-400">Tool Capacity</p><p className="text-sm font-medium text-gray-800 mt-0.5">{machine.specs.toolCapacity}</p></div>}
                    {machine.specs.materials && <div><p className="text-xs text-gray-400">Compatible Materials</p><p className="text-sm font-medium text-gray-800 mt-0.5">{machine.specs.materials}</p></div>}
                  </div>
                </div>
              )}
            </div>

            {/* Time slots */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="font-bold text-gray-900 text-base mb-4 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-blue-500" /> Select Your Time Slots
              </h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5">
                <p className="text-blue-700 text-sm font-medium flex items-center gap-1.5 mb-2">
                  <Info className="w-4 h-4" /> How booking works:
                </p>
                <ul className="space-y-1 text-blue-700 text-sm">
                  <li>• Select one or multiple time slots based on your project needs</li>
                  <li>• Prices may vary by time of day (evening/weekend rates)</li>
                  <li>• Instant booking - confirmation happens immediately</li>
                  <li>• Flexible cancellation up to 24 hours before</li>
                </ul>
              </div>

              <div className="mb-3">
                <p className="font-semibold text-gray-900 text-sm">May 4, 2026</p>
                <p className="text-xs text-gray-400">Monday</p>
              </div>

              <div className="space-y-3">
                {TIME_SLOTS.map(slot => (
                  <div
                    key={slot.id}
                    onClick={() => toggleSlot(slot.id)}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${slot.booked ? "bg-gray-50 border-gray-100 cursor-not-allowed opacity-60" : selectedSlots.includes(slot.id) ? "border-blue-500 bg-blue-50 cursor-pointer" : "border-gray-200 hover:border-blue-300 cursor-pointer hover:bg-blue-50/30"}`}
                    data-testid={`slot-${slot.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${slot.booked ? "border-gray-300" : selectedSlots.includes(slot.id) ? "border-blue-500 bg-blue-500" : "border-gray-300"}`}>
                        {selectedSlots.includes(slot.id) && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 text-sm flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            {slot.start} – {slot.end}
                          </p>
                          {slot.booked && <span className="text-xs text-red-500 font-medium border border-red-200 bg-red-50 px-1.5 py-0.5 rounded">Booked</span>}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{slot.hours} hours</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 text-sm">${slot.pricePerHour}/hr</p>
                      <p className="text-xs text-gray-400">${slot.hours * slot.pricePerHour} total</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Booking summary + AI tip */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm sticky top-20">
              <h2 className="font-bold text-gray-900 text-base mb-4">Booking Summary</h2>
              {selectedSlots.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDays className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Select time slots to see your booking summary</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedSlotData.map(s => (
                    <div key={s.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">{s.start} – {s.end}</span>
                      <span className="font-medium text-gray-900">${s.hours * s.pricePerHour}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-100 pt-3 flex justify-between font-bold">
                    <span>Total ({totalHours} hrs)</span>
                    <span className="text-blue-600">${totalCost}</span>
                  </div>
                  <Button onClick={handleBook} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold mt-2" data-testid="button-confirm-booking">
                    Confirm Booking
                  </Button>
                </div>
              )}
            </div>

            <div className="bg-violet-50 border border-violet-200 rounded-xl p-5">
              <p className="font-semibold text-gray-900 text-sm mb-1">Need help planning?</p>
              <p className="text-gray-500 text-xs leading-relaxed mb-3">Use our AI Assistant to create a complete manufacturing plan and get recommendations.</p>
              <Link href="/ai-assistant">
                <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold gap-1.5">
                  <Sparkles className="w-4 h-4" /> Try AI Assistant
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
