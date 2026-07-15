import RoleLayout from "@/components/layouts/RoleLayout";

export default function VisionaryLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  return (
    <RoleLayout role="VISIONARY" title={title} subtitle={subtitle}>
      {children}
    </RoleLayout>
  );
}
