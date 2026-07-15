"use client";

import { MarketplaceCatalog } from "@/components/marketplace/MarketplaceCatalog";
import { useAuthContext } from "@/hooks/use-auth";

export default function InvestorsPage() {
  const { token } = useAuthContext();
  return (
    <MarketplaceCatalog
      title="Investors"
      subtitle="Discover published investor profiles"
      endpoint="/api/investors"
      token={token}
      mapItem={(row) => ({
        id: Number(row.id),
        title: String(row.displayName ?? row.companyName ?? "Investor"),
        subtitle: String(row.preferredIndustries ?? row.investmentInterests ?? ""),
        meta: [
          row.ticketSizeMinimum && row.ticketSizeMaximum
            ? `Ticket ${row.ticketSizeMinimum}–${row.ticketSizeMaximum}`
            : null,
          row.city,
          row.country,
        ]
          .filter(Boolean)
          .join(" · "),
      })}
    />
  );
}
