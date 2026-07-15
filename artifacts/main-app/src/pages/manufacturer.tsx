import { useParams, Link } from "wouter";
import { Star, MapPin, CheckCircle, CheckCircle2, Mail, Phone, Globe, TrendingUp, Users, Clock, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { manufacturers } from "@/data/manufacturers";
import XiyLogo from "@/components/XiyLogo";

export default function ManufacturerPage() {
  const params = useParams<{ id: string }>();
  const manufacturer = manufacturers.find(m => m.id === parseInt(params.id || "0"));

  if (!manufacturer) {
    return (
      <div className="min-h-screen bg-[#F8FAFF] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Manufacturer not found</h2>
          <Link href="/browse"><Button variant="outline">Back to Search</Button></Link>
        </div>
      </div>
    );
  }

  const m = manufacturer;

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/"><XiyLogo size="sm" /></Link>
          <div className="flex items-center gap-3">
            <Link href="/browse">
              <Button variant="outline" size="sm" className="border-gray-200 text-gray-700">Back to Search</Button>
            </Link>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">Contact</Button>
          </div>
        </div>
      </header>

      {/* Blue hero banner */}
      <div className="bg-blue-600 text-white py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-5">
          <div className="w-16 h-16 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none">
              <rect x="5" y="20" width="30" height="16" rx="2" fill="white" fillOpacity="0.3"/>
              <path d="M10 20V14l5-5h10l5 5v6" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="1.5"/>
              <rect x="14" y="24" width="4" height="12" rx="1" fill="white" fillOpacity="0.6"/>
              <rect x="22" y="24" width="4" height="12" rx="1" fill="white" fillOpacity="0.6"/>
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-2xl font-bold">{m.name}</h1>
              {m.verified && (
                <span className="inline-flex items-center gap-1 text-xs font-medium bg-white/20 border border-white/30 text-white px-2 py-0.5 rounded-full">
                  <CheckCircle className="w-3 h-3" /> Verified
                </span>
              )}
            </div>
            <p className="text-blue-200 text-sm">{m.tagline}</p>
            <div className="flex items-center gap-3 mt-1.5 text-sm text-blue-200">
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {m.location}</span>
              <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" /> {m.rating} ({m.reviewCount} reviews)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { icon: <CheckCircle2 className="w-5 h-5 text-blue-500" />, value: m.stats.projectsCompleted.toLocaleString(), label: "Projects Completed" },
            { icon: <Users className="w-5 h-5 text-blue-500" />, value: m.stats.activeClients, label: "Active Clients" },
            { icon: <Clock className="w-5 h-5 text-blue-500" />, value: m.stats.avgResponseTime, label: "Avg. Response Time" },
            { icon: <TrendingUp className="w-5 h-5 text-blue-500" />, value: m.stats.successRate, label: "Success Rate" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5 text-center shadow-sm">
              <div className="flex justify-center mb-2">{s.icon}</div>
              <div className="text-2xl font-bold text-gray-900 mb-0.5">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: About + Capabilities + Machinery */}
          <div className="lg:col-span-2 space-y-5">
            {/* About */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="font-bold text-gray-900 text-lg mb-3">About</h2>
              <p className="text-gray-600 text-sm leading-relaxed">{m.about}</p>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h3 className="font-semibold text-gray-900 text-sm mb-3">Contact Information</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" /> {m.contact.email}</li>
                  <li className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /> {m.contact.phone}</li>
                  <li className="flex items-center gap-2"><Globe className="w-4 h-4 text-gray-400" /> {m.contact.website}</li>
                </ul>
              </div>
            </div>

            {/* Capabilities */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="font-bold text-gray-900 text-lg mb-4">Capabilities</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {m.capabilities.map(cap => (
                  <div key={cap} className="flex items-center gap-2 text-sm text-gray-700 py-2 border-b border-gray-50">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    {cap}
                  </div>
                ))}
              </div>
            </div>

            {/* Machinery */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="font-bold text-gray-900 text-lg mb-4">Available Machinery</h2>
              <div className="space-y-3">
                {m.machinery.map(machine => (
                  <div key={machine.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                          <rect x="3" y="12" width="18" height="9" rx="1" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1.2"/>
                          <path d="M6 12V9l3-3h6l3 3v3" fill="#BFDBFE" stroke="#93C5FD" strokeWidth="1.2"/>
                          <rect x="9" y="15" width="2.5" height="6" rx="0.5" fill="#60A5FA"/>
                          <rect x="12.5" y="15" width="2.5" height="6" rx="0.5" fill="#60A5FA"/>
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{machine.name}</p>
                        <p className="text-xs text-gray-400">{machine.subtitle}</p>
                      </div>
                    </div>
                    <div className="text-blue-600 font-bold text-sm">${machine.pricePerHour}/hr</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Certifications + CTA */}
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-500" /> Certifications
              </h2>
              <div className="space-y-3">
                {m.certificationDetails.map(cert => (
                  <div key={cert.name} className={`rounded-lg p-3 border ${cert.name.includes("ISO") ? "bg-emerald-50 border-emerald-100" : cert.name.includes("AS") ? "bg-emerald-50 border-emerald-100" : "bg-gray-50 border-gray-100"}`}>
                    <p className="font-semibold text-gray-900 text-sm">{cert.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{cert.org}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Certified: {cert.year}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-600 rounded-xl p-6 text-white text-center">
              <h3 className="font-bold text-lg mb-2">Ready to Start?</h3>
              <p className="text-blue-200 text-sm mb-4">Connect with {m.name.split(" ")[0]} to discuss your project.</p>
              <Link href={`/booking/${m.id}/${m.machinery[0]?.id || 1}`}>
                <Button className="w-full bg-white text-blue-700 hover:bg-blue-50 font-semibold">
                  Send Message
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Book CTA */}
        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-bold text-gray-900">Ready to book manufacturing time?</h3>
            <p className="text-gray-500 text-sm mt-0.5">View availability and book a time slot instantly</p>
          </div>
          <Link href={`/booking/${m.id}/${m.machinery[0]?.id || 1}`}>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 font-semibold px-6">
              View Availability &amp; Book
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
