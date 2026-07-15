import { Link, useLocation } from "wouter";
import { CheckCircle2, CalendarDays, Clock, MapPin, Hash, ArrowRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import XiyLogo from "@/components/XiyLogo";

function generateConfirmationId() {
  return "XIY-" + Math.random().toString(36).toUpperCase().slice(2, 8);
}

const CONFIRMATION_ID = generateConfirmationId();

export default function BookingConfirmationPage() {
  const [location] = useLocation();

  // Parse query params for booking details (passed via navigation state)
  const params = new URLSearchParams(location.split("?")[1] || "");
  const machineName = params.get("machine") || "CNC Milling Machine (5-Axis)";
  const manufacturerName = params.get("manufacturer") || "PrecisionTech Manufacturing";
  const locationStr = params.get("location") || "San Francisco, CA, USA";
  const slots = params.get("slots") || "9:00 AM – 12:00 PM (3 hrs)";
  const total = params.get("total") || "$450";
  const date = params.get("date") || "May 4, 2026";

  return (
    <div className="min-h-screen bg-[#F8FAFF] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center">
          <Link href="/"><XiyLogo size="sm" /></Link>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Success icon */}
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">Booking Confirmed!</h1>
        <p className="text-gray-500 text-center mb-8 max-w-sm">
          Your manufacturing slot has been booked. A confirmation has been sent to your email.
        </p>

        {/* Confirmation card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm w-full max-w-md overflow-hidden">
          {/* Blue header */}
          <div className="bg-blue-600 text-white p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-blue-200 text-xs font-medium">CONFIRMATION ID</span>
              <span className="font-mono font-bold text-sm tracking-wider flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5" />{CONFIRMATION_ID}
              </span>
            </div>
            <h2 className="font-bold text-lg">{machineName}</h2>
            <p className="text-blue-200 text-sm">{manufacturerName}</p>
          </div>

          {/* Details */}
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <CalendarDays className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Date</p>
                <p className="font-medium text-gray-900 text-sm">{date}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Selected Slots</p>
                <p className="font-medium text-gray-900 text-sm">{slots}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Location</p>
                <p className="font-medium text-gray-900 text-sm">{locationStr}</p>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
              <span className="font-semibold text-gray-900">Total Paid</span>
              <span className="text-xl font-bold text-blue-600">{total}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="px-5 pb-5 space-y-2">
            <Button variant="outline" className="w-full border-gray-200 text-gray-700 gap-2">
              <Download className="w-4 h-4" /> Download Receipt
            </Button>
          </div>
        </div>

        {/* Next steps */}
        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-5 w-full max-w-md shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 text-sm">What's Next?</h3>
          <ul className="space-y-3">
            {[
              { step: "1", text: "You'll receive a confirmation email with all booking details." },
              { step: "2", text: "Arrive at the facility 10 minutes before your scheduled slot." },
              { step: "3", text: "Bring your design files and material specifications." },
            ].map(item => (
              <li key={item.step} className="flex gap-3 text-sm text-gray-600">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 font-bold text-xs flex items-center justify-center shrink-0">{item.step}</span>
                {item.text}
              </li>
            ))}
          </ul>
        </div>

        {/* Navigation */}
        <div className="mt-6 flex gap-3">
          <Link href="/browse">
            <Button variant="outline" className="border-gray-200 text-gray-700">Browse More Manufacturers</Button>
          </Link>
          <Link href="/ai-assistant">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
              Plan Another Product <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
