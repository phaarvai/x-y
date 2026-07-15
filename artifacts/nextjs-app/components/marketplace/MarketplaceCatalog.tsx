"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import XiyLogo from "@/components/XiyLogo";
import { apiUrl } from "@/lib/api-url";

type CatalogItem = {
  id: number;
  title: string;
  subtitle?: string;
  meta?: string;
  href?: string;
};

type Props = {
  title: string;
  subtitle: string;
  endpoint: string;
  mapItem: (row: Record<string, unknown>) => CatalogItem;
  mineParam?: boolean;
  token?: string | null;
};

export function MarketplaceCatalog({ title, subtitle, endpoint, mapItem, mineParam, token }: Props) {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [mine, setMine] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["catalog", endpoint, search, mine],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (mine && mineParam) params.set("mine", "true");
      const res = await fetch(apiUrl(`${endpoint}?${params}`), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load");
      return res.json() as Promise<{ items: Record<string, unknown>[] }>;
    },
  });

  const items = (data?.items ?? []).map(mapItem);

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/"><XiyLogo size="sm" /></Link>
          <Link href="/marketplace" className="text-sm text-gray-600 hover:text-gray-900">Marketplace</Link>
        </div>
      </header>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500 mt-1 mb-6">{subtitle}</p>
        <div className="flex flex-wrap gap-2 mb-6">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search..."
              onKeyDown={(e) => e.key === "Enter" && setSearch(q)} />
          </div>
          <Button onClick={() => setSearch(q)}>Search</Button>
          {mineParam && token && (
            <Button variant={mine ? "default" : "outline"} onClick={() => setMine((v) => !v)}>
              {mine ? "Showing mine" : "My listings"}
            </Button>
          )}
        </div>
        {isLoading ? (
          <div className="py-16 flex justify-center"><LoadingSpinner /></div>
        ) : items.length === 0 ? (
          <EmptyState title="No listings found" description="Try a different search or check back later." />
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="bg-white border rounded-xl p-4 shadow-sm">
                <div className="font-semibold text-gray-900">{item.title}</div>
                {item.subtitle && <div className="text-sm text-gray-600 mt-1">{item.subtitle}</div>}
                {item.meta && <div className="text-xs text-gray-400 mt-2">{item.meta}</div>}
                {item.href && (
                  <Link href={item.href} className="text-sm text-blue-600 mt-2 inline-block">View details</Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
