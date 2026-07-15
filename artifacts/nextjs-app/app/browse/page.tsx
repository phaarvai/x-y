"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, Star, MapPin, CheckCircle, Zap, CalendarDays, Clock, Layers } from "lucide-react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { manufacturers as mockManufacturers } from "@/lib/manufacturers";
import XiyLogo from "@/components/XiyLogo";
import SponsoredAds from "@/components/SponsoredAds";
import { VerifiedBadge } from "@/components/reviews/VerifiedBadge";
import { RatingBadge } from "@/components/reviews/StarRating";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { apiUrl } from "@/lib/api-url";

const FALLBACK_MACHINE_TYPES = ["All Machines", "CNC Milling", "3D Printing", "Injection Molding", "Laser Cutting", "Assembly"];

type SearchRow = {
  facilityId: number;
  machineId: number;
  name: string;
  tagline?: string | null;
  location: string;
  machineName: string;
  machineType: string;
  pricePerHour: number;
  rating: number;
  reviewCount: number;
  verified: boolean;
};

export default function BrowsePage() {
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [machineType, setMachineType] = useState("All Machines");
  const [sortBy, setSortBy] = useState("best");

  const { data: taxonomy } = useQuery({
    queryKey: ["taxonomy-machinery"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/taxonomy?type=MACHINERY"));
      if (!res.ok) throw new Error("taxonomy");
      return res.json() as Promise<{ items: Array<{ name: string }> }>;
    },
    staleTime: 5 * 60_000,
  });

  const MACHINE_TYPES = taxonomy?.items?.length
    ? ["All Machines", ...taxonomy.items.map((i) => i.name)]
    : FALLBACK_MACHINE_TYPES;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["manufacturer-search", searchQuery, machineType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (machineType !== "All Machines") params.set("machineType", machineType);
      const res = await fetch(apiUrl(`/api/marketplace/manufacturers/search?${params}`));
      if (!res.ok) throw new Error("Search failed");
      return res.json() as Promise<{ data: SearchRow[] }>;
    },
  });

  const apiResults = data?.data ?? [];
  const useMock = !isLoading && !isError && apiResults.length === 0 && !searchQuery;

  const filtered = useMemo(() => {
    if (useMock) {
      return mockManufacturers.filter((m) => {
        const matchesQuery = !searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesMachine = machineType === "All Machines" || m.availableMachines.some((am) => am.toLowerCase().includes(machineType.toLowerCase()));
        return matchesQuery && matchesMachine;
      }).sort((a, b) => (sortBy === "price" ? a.priceMin - b.priceMin : b.rating - a.rating));
    }
    const rows = [...apiResults];
    if (sortBy === "price") rows.sort((a, b) => a.pricePerHour - b.pricePerHour);
    else rows.sort((a, b) => b.rating - a.rating);
    return rows;
  }, [useMock, apiResults, searchQuery, machineType, sortBy, isLoading, isError]);

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/"><XiyLogo size="sm" /></Link>
          <div className="flex items-center gap-3">
            <Link href="/requirements/new"><Button variant="outline" size="sm">Post Requirement</Button></Link>
            <Link href="/login"><Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">Sign In</Button></Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Find &amp; Book Manufacturing Services</h1>
          <p className="text-gray-500 text-sm">{useMock ? "Showing sample listings — publish a facility to appear here" : `${filtered.length} manufacturers found`}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
          <div className="flex gap-3 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search by machine type, capability, or location..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10 h-11 border-gray-200 rounded-lg" />
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white h-11 px-6 gap-2 rounded-lg" onClick={() => setSearchQuery(query)}>
              <Search className="w-4 h-4" /> Search
            </Button>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-gray-500 text-sm flex items-center gap-1.5"><Filter className="w-4 h-4" /> Filters:</span>
            <Select value={machineType} onValueChange={setMachineType}>
              <SelectTrigger className="h-8 w-36 text-sm border-gray-200"><SelectValue /></SelectTrigger>
              <SelectContent>{MACHINE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-8 w-32 text-sm border-gray-200"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="best">Best Match</SelectItem>
                <SelectItem value="price">Lowest Price</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><LoadingSpinner className="w-8 h-8" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No manufacturers found" description="Try different keywords or post a requirement." />
        ) : useMock ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {(filtered as typeof mockManufacturers).map((m) => (
              <Link key={m.id} href={`/manufacturer/${m.id}`} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow block">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-gray-900">{m.name}</h3>
                    <p className="text-sm text-gray-500">{m.tagline}</p>
                  </div>
                  <RatingBadge average={m.rating} count={m.reviewCount} />
                </div>
                <p className="text-xs text-gray-400 flex items-center gap-1 mb-3"><MapPin className="w-3 h-3" /> {m.location}</p>
                <div className="flex flex-wrap gap-1.5">{m.availableMachines.slice(0, 3).map((am) => <span key={am} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{am}</span>)}</div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {(filtered as SearchRow[]).map((row) => (
              <Link key={`${row.facilityId}-${row.machineId}`} href={`/manufacturer/${row.facilityId}?machine=${row.machineId}`} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow block">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-gray-900">{row.name}</h3>
                    <p className="text-sm text-gray-500">{row.tagline}</p>
                    <p className="text-xs text-gray-400 mt-1">{row.machineName} • {row.machineType}</p>
                  </div>
                  <RatingBadge average={row.rating} count={row.reviewCount} />
                </div>
                <p className="text-xs text-gray-400 flex items-center gap-1 mb-3"><MapPin className="w-3 h-3" /> {row.location}</p>
                <div className="flex items-center justify-between">
                  <span className="text-blue-600 font-semibold">${row.pricePerHour}/hr</span>
                  {row.verified && <VerifiedBadge entityType="MANUFACTURING_FACILITY" entityId={row.facilityId} />}
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-8"><SponsoredAds placement="BROWSE" /></div>
      </div>
    </div>
  );
}
