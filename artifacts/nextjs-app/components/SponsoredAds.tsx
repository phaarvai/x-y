"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api-url";

type Ad = {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  destinationUrl: string;
  placement: string;
};

export default function SponsoredAds({
  placement,
  category,
  className = "",
}: {
  placement: string;
  category?: string;
  className?: string;
}) {
  const params = new URLSearchParams({ active: "true", placement, limit: "3" });
  if (category) params.set("category", category);

  const { data } = useQuery<{ items: Ad[] }>({
    queryKey: ["active-ads", placement, category ?? ""],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/advertisements?${params}`));
      if (!res.ok) return { items: [] };
      return res.json();
    },
  });

  const ads = data?.items ?? [];

  useEffect(() => {
    for (const ad of ads) {
      void fetch(apiUrl(`/api/advertisements/${ad.id}/impression`), { method: "POST" });
    }
  }, [ads.map((a) => a.id).join(",")]);

  if (ads.length === 0) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      <p className="text-[10px] uppercase tracking-wide text-gray-400">Sponsored</p>
      {ads.map((ad) => (
        <a
          key={ad.id}
          href={ad.destinationUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            void fetch(apiUrl(`/api/advertisements/${ad.id}/click`), { method: "POST" });
          }}
          className="block rounded-xl border border-gray-200 bg-white overflow-hidden hover:border-blue-300 transition-colors"
        >
          {ad.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ad.imageUrl} alt="" className="w-full h-28 object-cover" />
          )}
          <div className="p-3">
            <p className="text-sm font-medium text-gray-900">{ad.title}</p>
            {ad.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{ad.description}</p>}
          </div>
        </a>
      ))}
    </div>
  );
}
