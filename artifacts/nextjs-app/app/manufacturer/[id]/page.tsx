"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { MapPin, Mail, Phone, Globe, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import XiyLogo from "@/components/XiyLogo";
import ReviewsPanel from "@/components/reviews/ReviewsPanel";
import { VerifiedBadge } from "@/components/reviews/VerifiedBadge";
import { RatingBadge } from "@/components/reviews/StarRating";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { manufacturers as mockManufacturers } from "@/lib/manufacturers";
import { apiUrl } from "@/lib/api-url";
import { useAuthContext } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export default function ManufacturerPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const machineParam = searchParams.get("machine");
  const facilityId = parseInt(id || "0", 10);
  const { token } = useAuthContext();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["facility", facilityId],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/marketplace/manufacturers/${facilityId}`));
      if (!res.ok) return null;
      return res.json();
    },
    enabled: facilityId > 0,
  });

  const mock = mockManufacturers.find((m) => m.id === facilityId);
  const useApi = !!data?.facility;
  const facility = useApi ? data.facility : null;
  const machines = useApi ? data.machines : mock?.machinery ?? [];
  const selectedMachine = useApi
    ? machines.find((m: { id: number }) => String(m.id) === machineParam) ?? machines[0]
    : mock?.machinery.find((m) => String(m.id) === machineParam) ?? mock?.machinery[0];

  const name = useApi ? facility.name : mock?.name;
  const saveFavorite = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl("/api/favorites"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          entityType: "MANUFACTURING_FACILITY",
          entityId: facilityId,
          title: name ?? `Facility #${facilityId}`,
        }),
      });
      if (!res.ok) throw await res.json();
      return res.json();
    },
    onSuccess: () => toast({ title: "Saved to favorites" }),
    onError: (e: { error?: string }) => toast({ title: "Could not save", description: e?.error, variant: "destructive" }),
  });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner className="w-8 h-8" /></div>;
  }

  if (!useApi && !mock) {
    return (
      <div className="min-h-screen bg-[#F8FAFF] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Manufacturer not found</h2>
          <Link href="/browse"><Button variant="outline">Back to Search</Button></Link>
        </div>
      </div>
    );
  }

  const tagline = useApi ? facility.tagline : mock!.tagline;
  const location = useApi ? facility.location : mock!.location;
  const rating = useApi ? Number(data.rating?.averageRating ?? 0) : mock!.rating;
  const reviewCount = useApi ? data.rating?.reviewCount ?? 0 : mock!.reviewCount;
  const about = useApi ? facility.description : mock!.about;
  const contactEmail = useApi ? facility.contactEmail : mock!.contact.email;
  const contactPhone = useApi ? facility.contactPhone : mock!.contact.phone;
  const website = useApi ? facility.website : mock!.contact.website;
  const entityId = useApi ? facilityId : mock!.id;

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/"><XiyLogo size="sm" /></Link>
          <div className="flex items-center gap-2">
            {token && useApi && (
              <Button variant="outline" size="sm" onClick={() => saveFavorite.mutate()} disabled={saveFavorite.isPending}>
                <Heart className="w-3.5 h-3.5 mr-1" /> Save
              </Button>
            )}
            <Link href="/browse"><Button variant="outline" size="sm">Back to Search</Button></Link>
          </div>
        </div>
      </header>

      <div className="bg-blue-600 text-white py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-2xl font-bold">{name}</h1>
            <VerifiedBadge entityType="MANUFACTURING_FACILITY" entityId={entityId} className="bg-white/20 border-white/30 text-white" />
          </div>
          <p className="text-blue-200 text-sm">{tagline}</p>
          <div className="flex items-center gap-3 mt-1.5 text-sm text-blue-200">
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {location}</span>
            <RatingBadge average={rating} count={reviewCount} className="text-white" />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-xl border p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-3">About</h2>
            <p className="text-gray-600 text-sm leading-relaxed">{about || "No description provided."}</p>
          </section>

          <section className="bg-white rounded-xl border p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-4">Machinery</h2>
            <div className="space-y-3">
              {machines.map((m: { id: number; name: string; machineType?: string; type?: string; pricePerHour: string | number; description?: string }) => (
                <div key={m.id} className={`border rounded-lg p-4 ${selectedMachine?.id === m.id ? "border-blue-500 bg-blue-50/30" : "border-gray-100"}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{m.name}</h3>
                      <p className="text-xs text-gray-500">{m.machineType ?? m.type}</p>
                    </div>
                    <span className="text-blue-600 font-bold">${Number(m.pricePerHour)}/hr</span>
                  </div>
                  {m.description && <p className="text-sm text-gray-500 mt-2">{m.description}</p>}
                  {useApi && (
                    <Link href={`/booking/${facilityId}/${m.id}`} className="inline-block mt-3">
                      <Button size="sm" className="bg-blue-600 text-white">Request Booking</Button>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </section>

          <ReviewsPanel facilityId={entityId} />
        </div>

        <aside className="space-y-4">
          <div className="bg-white rounded-xl border p-5 shadow-sm text-sm space-y-3">
            <h3 className="font-bold text-gray-900">Contact</h3>
            {contactEmail && <p className="flex items-center gap-2 text-gray-600"><Mail className="w-4 h-4" /> {contactEmail}</p>}
            {contactPhone && <p className="flex items-center gap-2 text-gray-600"><Phone className="w-4 h-4" /> {contactPhone}</p>}
            {website && <p className="flex items-center gap-2 text-gray-600"><Globe className="w-4 h-4" /> {website}</p>}
          </div>
          {selectedMachine && useApi && (
            <Link href={`/booking/${facilityId}/${selectedMachine.id}`}>
              <Button className="w-full bg-blue-600 text-white h-11">Submit Request</Button>
            </Link>
          )}
          {!useApi && mock && (
            <Link href={`/booking/${mock.id}/${selectedMachine?.id ?? 1}`}>
              <Button className="w-full bg-blue-600 text-white h-11">Book (Demo)</Button>
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}
