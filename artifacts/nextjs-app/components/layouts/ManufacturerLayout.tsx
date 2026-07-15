import RoleLayout from "@/components/layouts/RoleLayout";

export default function ManufacturerLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  return (
    <RoleLayout role="MANUFACTURER" title={title} subtitle={subtitle}>
      {children}
    </RoleLayout>
  );
}
