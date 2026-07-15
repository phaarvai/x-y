"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Search, Star, Scale } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiUrl } from "@/lib/api-url";
import { LEGAL_PROVIDER_ROLES, PROVIDER_TYPE_LABELS } from "@/lib/legal-constants";

type Provider = {
  id: number;
  displayName: string;
  businessName: string;
  providerType: string;
  bio: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  yearsExperience: number | null;
  hourlyRate: string | null;
  currency: string | null;
  rating: string | null;
  reviewCount: number;
  isAvailable: boolean;
  serviceCategories: string | null;
};

export default function LegalSearchPage() {
  const [q, setQ] = useState("");
  const [providerType, setProviderType] = useState("all");
  const [location, setLocation] = useState("");
  const [minExperience, setMinExperience] = useState("");
  const [minRating, setMinRating] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [serviceCategory, setServiceCategory] = useState("");
  const [submitted, setSubmitted] = useState({ q: "", providerType: "all", location: "", minExperience: "", minRating: "all", availability: "all", serviceCategory: "" });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (submitted.q) params.set("q", submitted.q);
    if (submitted.providerType !== "all") params.set("providerType", submitted.providerType);
    if (submitted.location) params.set("location", submitted.location);
    if (submitted.minExperience) params.set("minExperience", submitted.minExperience);
    if (submitted.minRating !== "all") params.set("minRating", submitted.minRating);
    if (submitted.availability === "true") params.set("availability", "true");
    if (submitted.serviceCategory) params.set("serviceCategory", submitted.serviceCategory);
    return params.toString();
  }, [submitted]);

  const { data, isLoading, isError, error } = useQuery<{ items: Provider[]; total: number }>({
    queryKey: ["legal-providers", queryString],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/legal-providers${queryString ? `?${queryString}` : ""}`));
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to load providers");
      return res.json();
    },
  });

  const onSearch = () => {
    setSubmitted({ q, providerType, location, minExperience, minRating, availability, serviceCategory });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Scale className="w-7 h-7 text-blue-600" /> Legal Service Providers
            </h1>
            <p className="text-gray-500 text-sm">Find writers, lawyers, compliance experts, and auditors for manufacturing contracts.</p>
          </div>
          <Link href="/legal/dashboard">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">Provider Dashboard</Button>
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm space-y-3">
          <div className="flex gap-3 flex-col sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name, firm, or expertise..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-10 h-11"
                onKeyDown={(e) => e.key === "Enter" && onSearch()}
              />
            </div>
            <Button onClick={onSearch} className="bg-blue-600 hover:bg-blue-700 text-white h-11 px-6">Search</Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Select value={providerType} onValueChange={setProviderType}>
              <SelectTrigger className="h-9 w-48"><SelectValue placeholder="Provider type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {LEGAL_PROVIDER_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{PROVIDER_TYPE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} className="h-9 w-40" />
            <Input placeholder="Category" value={serviceCategory} onChange={(e) => setServiceCategory(e.target.value)} className="h-9 w-40" />
            <Input placeholder="Min years" type="number" value={minExperience} onChange={(e) => setMinExperience(e.target.value)} className="h-9 w-28" />
            <Select value={minRating} onValueChange={setMinRating}>
              <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Rating" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any rating</SelectItem>
                <SelectItem value="3">3+ stars</SelectItem>
                <SelectItem value="4">4+ stars</SelectItem>
                <SelectItem value="4.5">4.5+ stars</SelectItem>
              </SelectContent>
            </Select>
            <Select value={availability} onValueChange={setAvailability}>
              <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any availability</SelectItem>
                <SelectItem value="true">Available now</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-xl bg-white border border-gray-100 animate-pulse" />
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 p-4 text-sm">
            {(error as Error).message}
          </div>
        )}

        {!isLoading && !isError && (data?.items?.length ?? 0) === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <Scale className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-700 font-medium">No legal providers found</p>
            <p className="text-gray-500 text-sm mt-1">Try adjusting filters or publish your own profile.</p>
          </div>
        )}

        {!isLoading && !isError && (data?.items?.length ?? 0) > 0 && (
          <>
            <p className="text-sm text-gray-500 mb-4">{data?.total ?? 0} providers</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data!.items.map((p) => (
                <Link
                  key={p.id}
                  href={`/legal/${p.id}`}
                  className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h2 className="font-semibold text-gray-900">{p.displayName}</h2>
                      <p className="text-xs text-blue-600 font-medium">{PROVIDER_TYPE_LABELS[p.providerType] ?? p.providerType}</p>
                    </div>
                    {p.isAvailable && (
                      <span className="text-[10px] uppercase tracking-wide bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">Available</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-3">{p.bio || p.businessName}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                    {(p.city || p.state || p.country) && (
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{[p.city, p.state].filter(Boolean).join(", ") || p.country}</span>
                    )}
                    <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400 fill-amber-400" />{Number(p.rating || 0).toFixed(1)} ({p.reviewCount})</span>
                    {p.yearsExperience != null && <span>{p.yearsExperience}+ yrs</span>}
                    {p.hourlyRate && <span>{p.currency || "INR"} {p.hourlyRate}/hr</span>}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
