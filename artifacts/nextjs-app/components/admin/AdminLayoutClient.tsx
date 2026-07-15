"use client";

import { usePathname } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login" || pathname?.endsWith("/admin/login");
  const isUnauthorized = pathname === "/admin/unauthorized" || pathname?.endsWith("/admin/unauthorized");

  if (isLogin || isUnauthorized) {
    return <>{children}</>;
  }

  return <AdminShell>{children}</AdminShell>;
}
