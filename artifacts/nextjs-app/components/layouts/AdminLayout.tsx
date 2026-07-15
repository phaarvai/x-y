import RoleLayout from "@/components/layouts/RoleLayout";

export default function AdminLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  return (
    <RoleLayout role="PLATFORM_ADMIN" title={title ?? "Admin Console"} subtitle={subtitle}>
      {children}
    </RoleLayout>
  );
}
