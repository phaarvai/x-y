import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Search, Filter, Star, MapPin, CheckCircle, Zap, CalendarDays, Clock, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles } from "lucide-react";
import { manufacturers } from "@/data/manufacturers";
import XiyLogo from "@/components/XiyLogo";

const MACHINE_TYPES = ["All Machines", "CNC Milling", "3D Printing", "Injection Molding", "Laser Cutting", "Assembly"];

export default function BrowsePage() {
  const [query, setQuery] = useState("");
  const [availability, setAvailability] = useState("all");
  const [machineType, setMachineType] = useState("All Machines");
  const [sortBy, setSortBy] = useState("best");

  const filtered = useMemo(() => {
    return manufacturers.filter(m => {
      const matchesQuery = !query || m.name.toLowerCase().includes(query.toLowerCase()) || m.availableMachines.some(am => am.toLowerCase().includes(query.toLowerCase())) || m.location.toLowerCase().includes(query.toLowerCase());
      const matchesMachine = machineType === "All Machines" || m.availableMachines.some(am => am.toLowerCase().includes(machineType.toLowerCase()));
      const matchesAvailability = availability === "all" || (availability === "now" && m.availabilityStatus === "green") || (availability === "instant" && m.instantBook);
      return matchesQuery && matchesMachine && matchesAvailability;
    }).sort((a, b) => sortBy === "price" ? a.priceMin - b.priceMin : b.rating - a.rating);
  }, [query, availability, machineType, sortBy]);

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      {/* Simplified header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/"><XiyLogo size="sm" /></Link>
          <div className="flex items-center gap-3">
            <Link href="/ai-assistant">
              <Button variant="outline" size="sm" className="border-violet-300 text-violet-600 hover:bg-violet-50 gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> AI Assistant
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">Sign In</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Find &amp; Book Manufacturing Services</h1>
          <p className="text-gray-500 text-sm">1,200+ verified manufacturers • Real-time availability • Instant booking</p>
        </div>

        {/* Search + Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
          <div className="flex gap-3 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by machine type, capability, or location..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="pl-10 h-11 border-gray-200 rounded-lg"
                data-testid="input-search"
              />
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white h-11 px-6 gap-2 rounded-lg" data-testid="button-search">
              <Search className="w-4 h-4" /> Search
            </Button>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-gray-500 text-sm flex items-center gap-1.5">
              <Filter className="w-4 h-4" /> Filters:
            </span>
            <Select value={availability} onValueChange={setAvailability}>
              <SelectTrigger className="h-8 w-36 text-sm border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Availability</SelectItem>
                <SelectItem value="now">Available Now</SelectItem>
                <SelectItem value="instant">Instant Book</SelectItem>
              </SelectContent>
            </Select>
            <Select value={machineType} onValueChange={setMachineType}>
              <SelectTrigger className="h-8 w-36 text-sm border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MACHINE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="h-8 w-32 text-sm border-gray-200">
                <SelectValue placeholder="Price Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Price</SelectItem>
                <SelectItem value="low">Under $100/hr</SelectItem>
                <SelectItem value="mid">$100–$200/hr</SelectItem>
                <SelectItem value="high">$200+/hr</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="h-8 w-28 text-sm border-gray-200">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Location</SelectItem>
                <SelectItem value="near">Nearby</SelectItem>
                <SelectItem value="us">United States</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="h-8 w-24 text-sm border-gray-200">
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Rating</SelectItem>
                <SelectItem value="4">4.0+</SelectItem>
                <SelectItem value="4.5">4.5+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results header */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600">{filtered.length} manufacturers available</p>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-8 w-40 text-sm border-gray-200 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="best">Sort by: Best Match</SelectItem>
              <SelectItem value="rating">Sort by: Rating</SelectItem>
              <SelectItem value="price">Sort by: Price</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Manufacturer cards */}
        <div className="space-y-4">
          {filtered.map(m => (
            <div key={m.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow" data-testid={`card-manufacturer-${m.id}`}>
              <div className="flex gap-4">
                {/* Logo */}
                <div className="w-16 h-16 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none">
                    <rect x="5" y="20" width="30" height="16" rx="2" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1.5"/>
                    <path d="M10 20V14l5-5h10l5 5v6" fill="#BFDBFE" stroke="#93C5FD" strokeWidth="1.5"/>
                    <rect x="14" y="24" width="4" height="12" rx="1" fill="#60A5FA"/>
                    <rect x="22" y="24" width="4" height="12" rx="1" fill="#60A5FA"/>
                    <path d="M5 36h30" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  {/* Name row */}
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900 text-base">{m.name}</h3>
                        {m.verified && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3" /> Verified
                          </span>
                        )}
                        {m.instantBook && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <Zap className="w-3 h-3" /> Instant Book
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {m.location} • {m.distance}</span>
                        <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" /> {m.rating} ({m.reviewCount})</span>
                        {m.certifications.map(c => <span key={c} className="text-xs text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded">{c}</span>)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-blue-600 font-bold text-lg">{m.priceRange}</div>
                      <div className="text-gray-400 text-xs">Price range</div>
                    </div>
                  </div>

                  {/* Machine tags */}
                  <div className="mt-2.5">
                    <span className="text-xs text-gray-500 mr-2">Available Machines:</span>
                    <div className="inline-flex flex-wrap gap-1.5 mt-1">
                      {m.availableMachines.map(am => (
                        <span key={am} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">{am}</span>
                      ))}
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="mt-3 flex items-center gap-5 flex-wrap text-xs text-gray-500">
                    <div>
                      <span className="block text-gray-400">Availability</span>
                      <span className={`font-medium flex items-center gap-1 ${m.availabilityStatus === "green" ? "text-emerald-600" : "text-yellow-600"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${m.availabilityStatus === "green" ? "bg-emerald-500" : "bg-yellow-500"}`} />
                        {m.availability}
                      </span>
                    </div>
                    <div>
                      <span className="block text-gray-400">Open Slots</span>
                      <span className="font-medium text-gray-700">{m.openSlots} slots</span>
                    </div>
                    <div>
                      <span className="block text-gray-400">Next Available</span>
                      <span className="font-medium text-gray-700">{m.nextAvailable}</span>
                    </div>
                    <div>
                      <span className="block text-gray-400">Lead Time</span>
                      <span className="font-medium text-gray-700">{m.leadTime}</span>
                    </div>
                    <div>
                      <span className="block text-gray-400">Response Time</span>
                      <span className="font-medium text-gray-700">{m.responseTime}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <Link href={`/manufacturer/${m.id}`}>
                      <Button variant="outline" size="sm" className="border-gray-200 text-gray-700 hover:bg-gray-50 font-medium" data-testid={`button-view-profile-${m.id}`}>
                        View Profile
                      </Button>
                    </Link>
                    <Link href={`/booking/${m.id}/${m.machinery?.[0]?.id ?? 1}`}>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 font-medium" data-testid={`button-book-${m.id}`}>
                        <CalendarDays className="w-4 h-4" /> View Availability &amp; Book
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <Layers className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No manufacturers match your filters</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
