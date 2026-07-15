"use client";

import { MarketplaceCatalog } from "@/components/marketplace/MarketplaceCatalog";
import { useAuthContext } from "@/hooks/use-auth";

export default function MarketOpportunitiesPage() {
  const { token } = useAuthContext();
  return (
    <MarketplaceCatalog
      title="Market Opportunities"
      subtitle="Published demand signals and market leads"
      endpoint="/api/market-opportunities"
      token={token}
      mineParam
      mapItem={(row) => ({
        id: Number(row.id),
        title: String(row.title ?? "Opportunity"),
        subtitle: `${row.productCategory ?? ""} · ${row.geography ?? ""}`,
        meta: String(row.status ?? row.moderationStatus ?? ""),
      })}
    />
  );
}
