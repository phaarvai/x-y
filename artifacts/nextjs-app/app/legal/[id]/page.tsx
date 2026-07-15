"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Star, Globe, Linkedin, Mail, Phone } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/api-url";
import { PROVIDER_TYPE_LABELS } from "@/lib/legal-constants";

type Provider = {
  id: number;
  displayName: string;
  businessName: string;
  providerType: string;
  bio: string | null;
  qualifications: string | null;
  licenses: string | null;
  certifications: string | null;
  serviceCategories: string | null;
  languages: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  location: string | null;
  yearsExperience: number | null;
  pricingType: string | null;
  hourlyRate: string | null;
  fixedPrice: string | null;
  currency: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  linkedin: string | null;
  profileImage: string | null;
  rating: string | null;
  reviewCount: number;
  isPublished: boolean;
  isAvailable: boolean;
  identityVerificationStatus: string;
};

export default function LegalProviderDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const router = useRouter();

  const { data, isLoading, isError, error } = useQuery<Provider>({
    queryKey: ["legal-provider", id],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/legal-providers/${id}`));
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Provider not found");
      return res.json();
    },
  });

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button variant="ghost" size="sm" className="mb-4 gap-1" onClick={() => router.push("/legal")}>
          <ArrowLeft className="w-4 h-4" /> Back to search
        </Button>

        {isLoading && <div className="h-64 rounded-xl bg-white border animate-pulse" />}
        {isError && (
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 p-4 text-sm">{(error as Error).message}</div>
        )}
        {data && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 sm:p-8 border-b border-gray-100">
              <div className="flex flex-col sm:flex-row gap-5">
                <div className="w-20 h-20 rounded-xl bg-blue-50 flex items-center justify-center text-2xl font-bold text-blue-700 overflow-hidden shrink-0">
                  {data.profileImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={data.profileImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    data.displayName.slice(0, 1).toUpperCase()
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-blue-600 font-medium mb-1">{PROVIDER_TYPE_LABELS[data.providerType] ?? data.providerType}</p>
                  <h1 className="text-2xl font-bold text-gray-900">{data.displayName}</h1>
                  <p className="text-gray-500">{data.businessName}</p>
                  <div className="flex flex-wrap gap-3 mt-3 text-sm text-gray-600">
                    <span className="flex items-center gap-1"><Star className="w-4 h-4 text-amber-400 fill-amber-400" />{Number(data.rating || 0).toFixed(1)} ({data.reviewCount} reviews)</span>
                    {(data.city || data.location) && (
                      <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{[data.city, data.state, data.country].filter(Boolean).join(", ") || data.location}</span>
                    )}
                    {data.yearsExperience != null && <span>{data.yearsExperience} years experience</span>}
                    {data.isAvailable ? (
                      <span className="text-emerald-650 text-emerald-700">Available</span>
                    ) : (
                      <span className="text-gray-400">Unavailable</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {data.bio && (
                <section>
                  <h2 className="font-semibold text-gray-900 mb-2">About</h2>
                  <p className="text-gray-600 text-sm whitespace-pre-wrap">{data.bio}</p>
                </section>
              )}

              <section className="grid sm:grid-cols-2 gap-4 text-sm">
                <Info label="Qualifications" value={data.qualifications} />
                <Info label="Licenses" value={data.licenses} />
                <Info label="Certifications" value={data.certifications} />
                <Info label="Service categories" value={data.serviceCategories} />
                <Info label="Languages" value={data.languages} />
                <Info
                  label="Pricing"
                  value={
                    data.pricingType === "FIXED"
                      ? `${data.currency || "INR"} ${data.fixedPrice ?? "—"} fixed`
                      : `${data.currency || "INR"} ${data.hourlyRate ?? "—"} / hr`
                  }
                />
                <Info label="Verification" value={data.identityVerificationStatus} />
              </section>

              <section className="flex flex-wrap gap-4 text-sm">
                {data.email && <a href={`mailto:${data.email}`} className="flex items-center gap-1.5 text-blue-600 hover:underline"><Mail className="w-4 h-4" />{data.email}</a>}
                {data.phone && <span className="flex items-center gap-1.5 text-gray-600"><Phone className="w-4 h-4" />{data.phone}</span>}
                {data.website && <a href={data.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-blue-600 hover:underline"><Globe className="w-4 h-4" />Website</a>}
                {data.linkedin && <a href={data.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-blue-600 hover:underline"><Linkedin className="w-4 h-4" />LinkedIn</a>}
              </section>

              <div className="pt-2">
                <Link href="/legal/dashboard"><Button variant="outline">Manage your profile</Button></Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">{label}</p>
      <p className="text-gray-700 whitespace-pre-wrap">{value}</p>
    </div>
  );
}
