import RoleLayout from "@/components/layouts/RoleLayout";

export default function InvestorLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  return (
    <RoleLayout role="INVESTOR" title={title} subtitle={subtitle}>
      {children}
    </RoleLayout>
  );
}
