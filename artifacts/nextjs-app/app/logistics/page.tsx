"use client";

import { MarketplaceCatalog } from "@/components/marketplace/MarketplaceCatalog";
import { useAuthContext } from "@/hooks/use-auth";

export default function LogisticsPage() {
  const { token } = useAuthContext();
  return (
    <MarketplaceCatalog
      title="Logistics Services"
      subtitle="Freight, warehousing, and delivery partners"
      endpoint="/api/logistics/services"
      token={token}
      mineParam
      mapItem={(row) => ({
        id: Number(row.id),
        title: String(row.serviceType ?? "Logistics service"),
        subtitle: `${row.vehicleType ?? row.storageType ?? ""} · ${row.pricingModel ?? ""} ${row.minimumCharge ?? ""} ${row.currency ?? ""}`,
        meta: String(row.coverageAreas ?? row.capacity ?? ""),
      })}
    />
  );
}
