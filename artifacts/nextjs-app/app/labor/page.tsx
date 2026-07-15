"use client";

import { MarketplaceCatalog } from "@/components/marketplace/MarketplaceCatalog";
import { useAuthContext } from "@/hooks/use-auth";

export default function LaborPage() {
  const { token } = useAuthContext();
  return (
    <MarketplaceCatalog
      title="Labor Listings"
      subtitle="Find skilled labor crews and workforce capacity"
      endpoint="/api/labor/listings"
      token={token}
      mineParam
      mapItem={(row) => ({
        id: Number(row.id),
        title: String(row.skillCategory ?? row.workerType ?? "Labor"),
        subtitle: `${row.workerType ?? ""} · ${row.dailyRate ?? row.monthlyRate ?? ""} ${row.currency ?? ""}`,
        meta: [row.city, row.country, row.availability].filter(Boolean).join(" · "),
      })}
    />
  );
}
