"use client";

import Navbar from "@/components/Navbar";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { roleLabel } from "@/lib/config/roles";
import type { Role } from "@/lib/types/platform";

type RoleLayoutProps = {
  role: Role | Role[];
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showNavbar?: boolean;
  maxWidth?: "4xl" | "6xl" | "7xl";
};

const WIDTH_CLASS = {
  "4xl": "max-w-4xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
} as const;

export default function RoleLayout({
  role,
  children,
  title,
  subtitle,
  showNavbar = true,
  maxWidth = "6xl",
}: RoleLayoutProps) {
  const roles = Array.isArray(role) ? role : [role];
  const heading = title ?? roleLabel(roles[0]);

  return (
    <RoleGuard allowedRoles={roles}>
      <div className="min-h-screen bg-slate-50">
        {showNavbar && <Navbar />}
        <div className={`${WIDTH_CLASS[maxWidth]} mx-auto px-4 sm:px-6 py-8`}>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">{heading}</h1>
            {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
    </RoleGuard>
  );
}
