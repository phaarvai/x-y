import RoleLayout from "@/components/layouts/RoleLayout";
import { LEGAL_SUITE_ROLES } from "@/lib/config/roles";

export default function LegalProviderLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  return (
    <RoleLayout
      role={["LEGAL_PROVIDER", ...LEGAL_SUITE_ROLES]}
      title={title ?? "Legal Dashboard"}
      subtitle={subtitle}
    >
      {children}
    </RoleLayout>
  );
}
