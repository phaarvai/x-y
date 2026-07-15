"use client";

import { MarketplaceCatalog } from "@/components/marketplace/MarketplaceCatalog";
import { useAuthContext } from "@/hooks/use-auth";

export default function VendorsPage() {
  const { token } = useAuthContext();
  return (
    <MarketplaceCatalog
      title="Vendor Materials"
      subtitle="Browse published raw material and supply listings"
      endpoint="/api/vendors/materials"
      token={token}
      mineParam
      mapItem={(row) => ({
        id: Number(row.id),
        title: String(row.materialName ?? "Material"),
        subtitle: `${row.category ?? ""} · ${row.unitPrice ?? ""} ${row.currency ?? ""} / ${row.unit ?? ""}`,
        meta: String(row.location ?? row.availabilityStatus ?? ""),
      })}
    />
  );
}
