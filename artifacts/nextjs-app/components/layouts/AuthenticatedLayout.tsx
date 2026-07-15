"use client";

import Navbar from "@/components/Navbar";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

type AuthenticatedLayoutProps = {
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

export default function AuthenticatedLayout({
  children,
  title,
  subtitle,
  showNavbar = true,
  maxWidth = "6xl",
}: AuthenticatedLayoutProps) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50">
        {showNavbar && <Navbar />}
        <div className={`${WIDTH_CLASS[maxWidth]} mx-auto px-4 sm:px-6 py-8`}>
          {(title || subtitle) && (
            <div className="mb-6">
              {title && <h1 className="text-2xl font-bold text-slate-900">{title}</h1>}
              {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
            </div>
          )}
          {children}
        </div>
      </div>
    </ProtectedRoute>
  );
}
