import RoleLayout from "@/components/layouts/RoleLayout";

export default function VendorLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  return (
    <RoleLayout role="VENDOR" title={title} subtitle={subtitle}>
      {children}
    </RoleLayout>
  );
}
