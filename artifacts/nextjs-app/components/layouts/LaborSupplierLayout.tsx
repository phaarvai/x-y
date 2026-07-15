import RoleLayout from "@/components/layouts/RoleLayout";

export default function LaborSupplierLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  return (
    <RoleLayout role="LABOR_SUPPLIER" title={title} subtitle={subtitle}>
      {children}
    </RoleLayout>
  );
}
