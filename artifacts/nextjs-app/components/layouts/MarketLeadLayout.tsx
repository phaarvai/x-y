import RoleLayout from "@/components/layouts/RoleLayout";

export default function MarketLeadLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  return (
    <RoleLayout role="MARKET_LEAD" title={title} subtitle={subtitle}>
      {children}
    </RoleLayout>
  );
}
