import RoleLayout from "@/components/layouts/RoleLayout";

export default function LogisticsProviderLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  return (
    <RoleLayout role="LOGISTICS_PROVIDER" title={title} subtitle={subtitle}>
      {children}
    </RoleLayout>
  );
}
